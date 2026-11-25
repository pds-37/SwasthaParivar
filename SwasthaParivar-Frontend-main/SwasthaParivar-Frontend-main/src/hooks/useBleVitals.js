import { useCallback, useEffect, useRef, useState } from "react";
import {
  BLE_CHARACTERISTICS,
  BLE_SERVICES,
  GLUCOSE_RACP_LAST_RECORD,
  createSimulatedBleReading,
  parseBloodPressureMeasurement,
  parseGlucoseMeasurement,
  parseHeartRateMeasurement,
  parsePulseOximeterMeasurement,
} from "../lib/bleGatt";

const GATT_PROFILE_SPECS = [
  {
    service: BLE_SERVICES.BLOOD_PRESSURE,
    label: "Blood pressure",
    characteristics: [
      {
        uuid: BLE_CHARACTERISTICS.BLOOD_PRESSURE_MEASUREMENT,
        parser: parseBloodPressureMeasurement,
      },
    ],
  },
  {
    service: BLE_SERVICES.HEART_RATE,
    label: "Heart rate",
    characteristics: [
      {
        uuid: BLE_CHARACTERISTICS.HEART_RATE_MEASUREMENT,
        parser: parseHeartRateMeasurement,
      },
    ],
  },
  {
    service: BLE_SERVICES.PULSE_OXIMETER,
    label: "Pulse oximeter",
    characteristics: [
      {
        uuid: BLE_CHARACTERISTICS.PLX_CONTINUOUS_MEASUREMENT,
        parser: parsePulseOximeterMeasurement,
      },
      {
        uuid: BLE_CHARACTERISTICS.PLX_SPOT_CHECK_MEASUREMENT,
        parser: parsePulseOximeterMeasurement,
      },
    ],
  },
  {
    service: BLE_SERVICES.GLUCOSE,
    label: "Glucose meter",
    characteristics: [
      {
        uuid: BLE_CHARACTERISTICS.GLUCOSE_MEASUREMENT,
        parser: parseGlucoseMeasurement,
      },
    ],
    controlPointUuid: BLE_CHARACTERISTICS.GLUCOSE_RACP,
    controlCommand: GLUCOSE_RACP_LAST_RECORD,
  },
];

function formatBleError(err) {
  if (!err) return "Bluetooth connection failed.";
  if (err.name === "SecurityError") {
    return "Web Bluetooth requires a secure HTTPS connection (or localhost).";
  }
  if (err.name === "NetworkError") {
    return "Lost connection while pairing with the device. Make sure it is powered on and nearby.";
  }
  if (err.name === "NotSupportedError") {
    return "Bluetooth adapter or this GATT health service is not supported on your device.";
  }
  return err.message || "Could not connect to the Bluetooth device.";
}

export function useBleVitals() {
  const isSupported = typeof navigator !== "undefined" && Boolean(navigator.bluetooth);

  const [status, setStatus] = useState("idle");
  const [deviceName, setDeviceName] = useState(null);
  const [lastDeviceAvailable, setLastDeviceAvailable] = useState(false);
  const [activeProfiles, setActiveProfiles] = useState([]);
  const [reading, setReading] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const deviceRef = useRef(null);
  const disconnectHandlerRef = useRef(null);
  const subscriptionsRef = useRef([]);
  const manualDisconnectRef = useRef(false);
  const reconnectTimerRef = useRef(null);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const teardownSubscriptions = useCallback(async () => {
    const subs = subscriptionsRef.current.splice(0, subscriptionsRef.current.length);
    for (const { characteristic, listener } of subs) {
      try {
        characteristic.removeEventListener("characteristicvaluechanged", listener);
        if (characteristic.service?.device?.gatt?.connected) {
          await characteristic.stopNotifications();
        }
      } catch {
        // Device may already be disconnected; ignore cleanup failures
      }
    }
  }, []);

  const mergeParsedReading = useCallback((parsed) => {
    if (!mountedRef.current || !parsed || Object.keys(parsed).length === 0) {
      return;
    }

    setReading((prev) => ({
      ...(prev || {}),
      ...parsed,
      source: "ble_device",
    }));
    setLastUpdatedAt(new Date().toISOString());
  }, []);

  const wireGattServices = useCallback(
    async (server) => {
      const detectedLabels = [];

      for (const spec of GATT_PROFILE_SPECS) {
        let primaryService;
        try {
          primaryService = await server.getPrimaryService(spec.service);
        } catch {
          continue;
        }

        let profileBound = false;

        for (const charSpec of spec.characteristics) {
          try {
            const characteristic = await primaryService.getCharacteristic(charSpec.uuid);

            if (characteristic.properties?.notify || characteristic.properties?.indicate) {
              const listener = (event) => {
                const parsed = charSpec.parser(event.target?.value);
                mergeParsedReading(parsed);
              };
              characteristic.addEventListener("characteristicvaluechanged", listener);
              await characteristic.startNotifications();
              subscriptionsRef.current.push({ characteristic, listener });
              profileBound = true;
            }

            if (characteristic.properties?.read) {
              try {
                const initialValue = await characteristic.readValue();
                mergeParsedReading(charSpec.parser(initialValue));
                profileBound = true;
              } catch {
                // Some peripherals expose notify-only values or require active trigger
              }
            }
          } catch {
            // Optional characteristic (e.g. spot-check vs continuous) not present on this device
          }
        }

        if (profileBound && spec.controlPointUuid && spec.controlCommand) {
          try {
            const racp = await primaryService.getCharacteristic(spec.controlPointUuid);
            if (racp.properties?.indicate || racp.properties?.notify) {
              const racpListener = () => {};
              racp.addEventListener("characteristicvaluechanged", racpListener);
              await racp.startNotifications();
              subscriptionsRef.current.push({ characteristic: racp, listener: racpListener });
            }
            await racp.writeValue(spec.controlCommand);
          } catch {
            // Device may stream readings automatically without RACP request
          }
        }

        if (profileBound && !detectedLabels.includes(spec.label)) {
          detectedLabels.push(spec.label);
        }
      }

      if (mountedRef.current) {
        setActiveProfiles(detectedLabels);
      }

      return detectedLabels;
    },
    [mergeParsedReading]
  );

  const connectGattServer = useCallback(
    async (device) => {
      await teardownSubscriptions();
      clearReconnectTimer();

      if (deviceRef.current && disconnectHandlerRef.current) {
        deviceRef.current.removeEventListener("gattserverdisconnected", disconnectHandlerRef.current);
      }

      const onUnexpectedDisconnect = () => {
        teardownSubscriptions();
        if (!mountedRef.current) return;

        if (manualDisconnectRef.current) {
          setStatus("idle");
          return;
        }

        setStatus("reconnecting");
        reconnectTimerRef.current = setTimeout(async () => {
          reconnectTimerRef.current = null;
          if (!mountedRef.current || manualDisconnectRef.current || !deviceRef.current) {
            return;
          }

          try {
            const server = await deviceRef.current.gatt.connect();
            if (!mountedRef.current) return;
            await wireGattServices(server);
            if (mountedRef.current) {
              setStatus("connected");
              setError(null);
            }
          } catch {
            if (mountedRef.current) {
              setStatus("disconnected");
              setError("Device disconnected. Tap Reconnect to resume.");
            }
          }
        }, 800);
      };

      deviceRef.current = device;
      disconnectHandlerRef.current = onUnexpectedDisconnect;
      device.addEventListener("gattserverdisconnected", onUnexpectedDisconnect);
      setLastDeviceAvailable(true);

      const server = await device.gatt.connect();
      if (!mountedRef.current) {
        if (device.gatt.connected) device.gatt.disconnect();
        return;
      }

      setDeviceName(device.name || "Connected health monitor");
      const detected = await wireGattServices(server);

      if (!mountedRef.current) return;

      if (detected.length === 0) {
        setError("Connected, but no standard health vitals GATT profile was exposed by this device.");
      }

      setStatus("connected");
    },
    [clearReconnectTimer, teardownSubscriptions, wireGattServices]
  );

  const connectDevice = useCallback(async () => {
    if (!isSupported) {
      setError("Web Bluetooth is unavailable in this browser. Open in Chrome or Edge over HTTPS.");
      return;
    }

    manualDisconnectRef.current = false;
    setError(null);
    setStatus("scanning");

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: GATT_PROFILE_SPECS.map((spec) => ({ services: [spec.service] })),
        optionalServices: GATT_PROFILE_SPECS.map((spec) => spec.service),
      });

      if (!mountedRef.current) return;

      setReading(null);
      setLastUpdatedAt(null);
      setActiveProfiles([]);
      setStatus("connecting");
      await connectGattServer(device);
    } catch (err) {
      if (!mountedRef.current) return;

      if (err?.name === "NotFoundError") {
        // User dismissed the browser device picker
        setStatus("idle");
        setError(null);
        return;
      }

      setStatus("idle");
      setError(formatBleError(err));
    }
  }, [connectGattServer, isSupported]);

  const reconnectDevice = useCallback(async () => {
    const device = deviceRef.current;
    if (!device) {
      await connectDevice();
      return;
    }

    manualDisconnectRef.current = false;
    setError(null);
    setStatus("reconnecting");

    try {
      await connectGattServer(device);
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      setError(formatBleError(err));
    }
  }, [connectDevice, connectGattServer]);

  const disconnectDevice = useCallback(async () => {
    manualDisconnectRef.current = true;
    clearReconnectTimer();
    await teardownSubscriptions();

    if (deviceRef.current && disconnectHandlerRef.current) {
      deviceRef.current.removeEventListener("gattserverdisconnected", disconnectHandlerRef.current);
      disconnectHandlerRef.current = null;
    }

    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }

    deviceRef.current = null;

    if (mountedRef.current) {
      setLastDeviceAvailable(false);
      setDeviceName(null);
      setActiveProfiles([]);
      setStatus("idle");
      setError(null);
    }
  }, [clearReconnectTimer, teardownSubscriptions]);

  const simulateReading = useCallback(() => {
    const sample = createSimulatedBleReading();
    setDeviceName("Simulated BLE Monitor");
    setActiveProfiles(["Blood pressure", "Heart rate", "Pulse oximeter", "Glucose meter"]);
    setReading({ ...sample, source: "ble_simulated" });
    setLastUpdatedAt(new Date().toISOString());
    setStatus("connected");
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const cleanupOnUnmount = useCallback(() => {
    mountedRef.current = false;
    manualDisconnectRef.current = true;
    clearReconnectTimer();
    teardownSubscriptions();
    if (deviceRef.current && disconnectHandlerRef.current) {
      deviceRef.current.removeEventListener("gattserverdisconnected", disconnectHandlerRef.current);
      disconnectHandlerRef.current = null;
    }
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
  }, [clearReconnectTimer, teardownSubscriptions]);

  useEffect(() => {
    mountedRef.current = true;
    return cleanupOnUnmount;
  }, [cleanupOnUnmount]);

  return {
    isSupported,
    status,
    connected: status === "connected",
    scanning: status === "scanning" || status === "connecting" || status === "reconnecting",
    deviceName,
    lastDeviceAvailable,
    activeProfiles,
    reading,
    lastUpdatedAt,
    error,
    connectDevice,
    reconnectDevice,
    disconnectDevice,
    simulateReading,
    clearError,
  };
}

export default useBleVitals;

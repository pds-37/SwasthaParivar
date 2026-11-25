import React from "react";
import {
  Activity,
  Bluetooth,
  BluetoothConnected,
  BluetoothOff,
  BluetoothSearching,
  Heart,
  RefreshCw,
  ShieldCheck,
  Syringe,
  Wind,
  Zap,
} from "lucide-react";
import { Button, Modal } from "./ui";
import { useBleVitals } from "../hooks/useBleVitals";
import "./BleDeviceModal.css";

const SUPPORTED_PROFILES = [
  "BP cuffs",
  "Pulse oximeters (SpO2)",
  "Heart rate sensors",
  "Glucose meters",
];

const BleDeviceModal = ({ open, onClose, onReadingConfirmed }) => {
  const {
    isSupported,
    status,
    connected,
    scanning,
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
  } = useBleVitals();

  const handleClose = () => {
    if (connected || lastDeviceAvailable) {
      disconnectDevice();
    }
    onClose?.();
  };

  const handleConfirm = () => {
    if (!reading) return;
    const confirmed = {
      ...reading,
      deviceName: deviceName || "Bluetooth device",
    };
    if (connected || lastDeviceAvailable) {
      disconnectDevice();
    }
    onReadingConfirmed?.(confirmed);
    onClose?.();
  };

  const hasReading = Boolean(
    reading &&
      (reading.bloodPressure !== undefined ||
        reading.heartRate != null ||
        reading.spO2 != null ||
        reading.bloodSugar != null)
  );

  const footer = (
    <>
      <Button variant="secondary" onClick={handleClose}>
        Cancel
      </Button>
      {connected ? (
        <>
          <Button variant="ghost" onClick={disconnectDevice}>
            Disconnect
          </Button>
          <Button variant="primary" onClick={handleConfirm} disabled={!hasReading}>
            Use this reading
          </Button>
        </>
      ) : null}
    </>
  );

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Sync from Bluetooth health device"
      description="Pair a compatible cuff, oximeter, or glucometer to fill vitals automatically."
      size="md"
      footer={footer}
    >
      <div className="ble-modal-content">
        {!isSupported && !connected ? (
          <div className="ble-state-panel ble-state-panel--unsupported">
            <div className="ble-icon-badge ble-icon-badge--warning">
              <BluetoothOff size={26} />
            </div>
            <h3 className="text-h4">Web Bluetooth is unavailable here</h3>
            <p className="text-body-sm muted-copy">
              Your current browser or context cannot access Bluetooth peripherals directly. Use
              Google Chrome or Microsoft Edge over HTTPS (or localhost) to connect devices.
            </p>
            {import.meta.env.DEV ? (
              <Button variant="secondary" leftIcon={<Zap size={16} />} onClick={simulateReading}>
                Simulate BLE reading (dev)
              </Button>
            ) : null}
          </div>
        ) : connected ? (
          <div className="ble-connected-panel">
            <div className="ble-connected-banner">
              <span className="badge badge--success">
                <BluetoothConnected size={14} />
                {deviceName || "Connected device"}
              </span>
              {lastUpdatedAt ? (
                <span className="ble-timestamp">
                  Updated {new Date(lastUpdatedAt).toLocaleTimeString("en-IN")}
                </span>
              ) : null}
            </div>

            {activeProfiles.length > 0 ? (
              <div className="ble-profile-pills" aria-label="Detected GATT services">
                {activeProfiles.map((profile) => (
                  <span key={profile} className="ble-profile-pill">
                    {profile}
                  </span>
                ))}
              </div>
            ) : null}

            {hasReading ? (
              <div className="ble-readings-grid">
                {reading.bloodPressure ? (
                  <div className="ble-reading-card">
                    <span className="ble-reading-card__label">
                      <Activity size={15} />
                      Blood pressure
                    </span>
                    <strong>
                      {reading.bloodPressure} <small>mmHg</small>
                    </strong>
                  </div>
                ) : null}

                {reading.heartRate != null ? (
                  <div className="ble-reading-card">
                    <span className="ble-reading-card__label">
                      <Heart size={15} />
                      Heart rate
                    </span>
                    <strong>
                      {reading.heartRate} <small>bpm</small>
                    </strong>
                  </div>
                ) : null}

                {reading.spO2 != null ? (
                  <div className="ble-reading-card">
                    <span className="ble-reading-card__label">
                      <Wind size={15} />
                      SpO2
                    </span>
                    <strong>
                      {reading.spO2} <small>%</small>
                    </strong>
                  </div>
                ) : null}

                {reading.bloodSugar != null ? (
                  <div className="ble-reading-card">
                    <span className="ble-reading-card__label">
                      <Syringe size={15} />
                      Blood sugar
                    </span>
                    <strong>
                      {reading.bloodSugar} <small>mg/dL</small>
                    </strong>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="ble-waiting-box">
                <BluetoothSearching size={20} className="ble-pulse" />
                <p className="text-body-sm">
                  Waiting for measurements. Start or finish a reading on your connected device.
                </p>
              </div>
            )}

            {error ? <p className="ble-error-box">{error}</p> : null}

            <p className="ble-privacy-note">
              <ShieldCheck size={14} />
              Only clinical readings are imported. Device IDs and MAC addresses are never saved.
            </p>
          </div>
        ) : (
          <div className="ble-state-panel">
            <div className={`ble-icon-badge ${scanning ? "is-scanning" : ""}`}>
              {scanning ? <BluetoothSearching size={28} /> : <Bluetooth size={28} />}
            </div>

            <div className="ble-state-copy">
              <h3 className="text-h4">
                {status === "reconnecting"
                  ? "Reconnecting to your device..."
                  : status === "connecting"
                    ? "Connecting to GATT services..."
                    : scanning
                      ? "Scanning for nearby health devices..."
                      : "Ready to pair a Bluetooth device"}
              </h3>
              <p className="text-body-sm muted-copy">
                Turn on Bluetooth on your monitor, then tap Scan to pick it from the browser prompt.
              </p>
            </div>

            <div className="ble-profile-pills">
              {SUPPORTED_PROFILES.map((label) => (
                <span key={label} className="ble-profile-pill">
                  {label}
                </span>
              ))}
            </div>

            {error ? <p className="ble-error-box">{error}</p> : null}

            <div className="ble-connect-actions">
              <Button
                variant="primary"
                leftIcon={<Bluetooth size={16} />}
                loading={scanning}
                onClick={connectDevice}
              >
                {scanning ? "Searching..." : "Scan & pair device"}
              </Button>

              {status === "disconnected" && lastDeviceAvailable ? (
                <Button
                  variant="secondary"
                  leftIcon={<RefreshCw size={16} />}
                  onClick={reconnectDevice}
                >
                  Reconnect last device
                </Button>
              ) : null}

              {import.meta.env.DEV ? (
                <Button
                  variant="ghost"
                  leftIcon={<Zap size={16} />}
                  onClick={simulateReading}
                  disabled={scanning}
                >
                  Simulate BLE reading (dev)
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BleDeviceModal;

/**
 * Bluetooth SIG GATT UUIDs and binary characteristic decoders for personal health peripherals.
 * Pure, stateless helpers (no DOM/Web-Bluetooth runtime dependencies) so parsers can be tested directly.
 */

export const BLE_SERVICES = Object.freeze({
  BLOOD_PRESSURE: 0x1810,
  HEART_RATE: 0x180d,
  PULSE_OXIMETER: 0x1822,
  GLUCOSE: 0x1808,
});

export const BLE_CHARACTERISTICS = Object.freeze({
  BLOOD_PRESSURE_MEASUREMENT: 0x2a35,
  HEART_RATE_MEASUREMENT: 0x2a37,
  PLX_SPOT_CHECK_MEASUREMENT: 0x2a5e,
  PLX_CONTINUOUS_MEASUREMENT: 0x2a5f,
  GLUCOSE_MEASUREMENT: 0x2a18,
  GLUCOSE_RACP: 0x2a52,
});

// Record Access Control Point (0x2A52): OpCode 0x01 (Report Stored Records), Operator 0x06 (Last Record)
export const GLUCOSE_RACP_LAST_RECORD = new Uint8Array([0x01, 0x06]);

const KPA_TO_MMHG = 7.50062;

// Reserved special values in IEEE-11073 16-bit SFLOAT
const SFLOAT_SPECIAL_VALUES = new Set([0x07fe, 0x07ff, 0x0800, 0x0801, 0x0802]);

function toDataView(input) {
  if (!input) return null;
  if (input instanceof DataView) return input;
  if (ArrayBuffer.isView(input)) {
    return new DataView(input.buffer, input.byteOffset, input.byteLength);
  }
  if (input instanceof ArrayBuffer) {
    return new DataView(input);
  }
  return null;
}

/**
 * Decode an IEEE-11073 16-bit SFLOAT value: 4-bit signed exponent + 12-bit signed mantissa.
 * Returns null for reserved sentinel codes (NaN, NRes, +/-Infinity, RFU).
 */
export function decodeSfloat(raw) {
  if (!Number.isInteger(raw) || raw < 0 || raw > 0xffff) return null;
  if (SFLOAT_SPECIAL_VALUES.has(raw)) return null;

  const rawExp = (raw & 0xf000) >> 12;
  const rawMantissa = raw & 0x0fff;
  const exponent = rawExp >= 0x8 ? rawExp - 0x10 : rawExp;
  const mantissa = rawMantissa >= 0x0800 ? rawMantissa - 0x1000 : rawMantissa;

  return mantissa * Math.pow(10, exponent);
}

/**
 * Parse Blood Pressure Measurement (0x2A35) per Bluetooth SIG BLS 1.1.
 */
export function parseBloodPressureMeasurement(input) {
  const view = toDataView(input);
  if (!view || view.byteLength < 7) return {};

  const flags = view.getUint8(0);
  const inKpa = Boolean(flags & 0x01);
  const hasTimestamp = Boolean(flags & 0x02);
  const hasPulseRate = Boolean(flags & 0x04);
  const scale = inKpa ? KPA_TO_MMHG : 1;

  const rawSystolic = decodeSfloat(view.getUint16(1, true));
  const rawDiastolic = decodeSfloat(view.getUint16(3, true));
  if (rawSystolic === null || rawDiastolic === null) return {};

  const systolic = Math.round(rawSystolic * scale);
  const diastolic = Math.round(rawDiastolic * scale);

  if (systolic < 40 || systolic > 320 || diastolic < 20 || diastolic > 220) {
    return {};
  }

  const parsed = {
    bloodPressure: `${systolic}/${diastolic}`,
    bloodPressureSystolic: systolic,
    bloodPressureDiastolic: diastolic,
    bloodPressureUnit: "mmHg",
  };

  const pulseOffset = 7 + (hasTimestamp ? 7 : 0);
  if (hasPulseRate && view.byteLength >= pulseOffset + 2) {
    const rawPulse = decodeSfloat(view.getUint16(pulseOffset, true));
    if (rawPulse !== null) {
      const heartRate = Math.round(rawPulse);
      if (heartRate >= 20 && heartRate <= 300) {
        parsed.heartRate = heartRate;
      }
    }
  }

  return parsed;
}

/**
 * Parse Heart Rate Measurement (0x2A37) per Bluetooth SIG HRS 1.0.
 */
export function parseHeartRateMeasurement(input) {
  const view = toDataView(input);
  if (!view || view.byteLength < 2) return {};

  const flags = view.getUint8(0);
  const isUint16 = Boolean(flags & 0x01);

  if (isUint16 && view.byteLength < 3) return {};

  const heartRate = isUint16 ? view.getUint16(1, true) : view.getUint8(1);
  if (heartRate < 20 || heartRate > 300) return {};

  return { heartRate };
}

/**
 * Parse Pulse Oximeter Spot-Check (0x2A5E) or Continuous (0x2A5F) per Bluetooth SIG PLXS 1.0.
 * Bytes 1..2 hold SpO2 (SFLOAT %) and bytes 3..4 hold PR (SFLOAT bpm).
 */
export function parsePulseOximeterMeasurement(input) {
  const view = toDataView(input);
  if (!view || view.byteLength < 5) return {};

  const rawSpO2 = decodeSfloat(view.getUint16(1, true));
  const rawPulse = decodeSfloat(view.getUint16(3, true));
  const parsed = {};

  if (rawSpO2 !== null && rawSpO2 >= 40 && rawSpO2 <= 100) {
    parsed.spO2 = Number.isInteger(rawSpO2) ? rawSpO2 : Number(rawSpO2.toFixed(1));
  }

  if (rawPulse !== null) {
    const heartRate = Math.round(rawPulse);
    if (heartRate >= 20 && heartRate <= 300) {
      parsed.heartRate = heartRate;
    }
  }

  return parsed;
}

/**
 * Parse Glucose Measurement (0x2A18) per Bluetooth SIG GLS 1.0.
 * Flags bit 0: Time Offset Present (+2B)
 * Flags bit 1: Glucose Concentration, Type & Location Present
 * Flags bit 2: Concentration Units (0 = kg/L, 1 = mol/L)
 */
export function parseGlucoseMeasurement(input) {
  const view = toDataView(input);
  // Minimum GLS header when Base Time is present: Flags(1) + SeqNum(2) + BaseTime(7) = 10 bytes
  if (!view || view.byteLength < 10) return {};

  const flags = view.getUint8(0);
  const hasTimeOffset = Boolean(flags & 0x01);
  const hasConcentration = Boolean(flags & 0x02);
  const isMolPerL = Boolean(flags & 0x04);

  if (!hasConcentration) return {};

  const concentrationOffset = 10 + (hasTimeOffset ? 2 : 0);
  if (view.byteLength < concentrationOffset + 2) return {};

  const rawConcentration = decodeSfloat(view.getUint16(concentrationOffset, true));
  if (rawConcentration === null || rawConcentration <= 0) return {};

  // 1 kg/L = 100,000 mg/dL; 1 mol/L of D-glucose (~180.16 g/mol) = 18,016 mg/dL
  const bloodSugar = isMolPerL
    ? Math.round(rawConcentration * 18016)
    : Math.round(rawConcentration * 100000);

  if (bloodSugar < 10 || bloodSugar > 1500) return {};

  return { bloodSugar };
}

/**
 * Generate realistic test telemetry for dev verification without physical BLE hardware.
 */
export function createSimulatedBleReading() {
  const systolic = 114 + Math.floor(Math.random() * 22);
  const diastolic = 72 + Math.floor(Math.random() * 16);

  return {
    bloodPressure: `${systolic}/${diastolic}`,
    bloodPressureSystolic: systolic,
    bloodPressureDiastolic: diastolic,
    bloodPressureUnit: "mmHg",
    heartRate: 64 + Math.floor(Math.random() * 24),
    spO2: 96 + Math.floor(Math.random() * 4),
    bloodSugar: 88 + Math.floor(Math.random() * 45),
  };
}

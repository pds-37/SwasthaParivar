import test, { describe } from "node:test";
import assert from "node:assert";

import {
  decodeSfloat,
  parseBloodPressureMeasurement,
  parseHeartRateMeasurement,
  parsePulseOximeterMeasurement,
  parseGlucoseMeasurement,
} from "./bleGatt.js";

function encodeSfloat(mantissa, exponent) {
  const m = mantissa < 0 ? mantissa + 0x1000 : mantissa;
  const e = exponent < 0 ? exponent + 0x10 : exponent;
  return ((e & 0x0f) << 12) | (m & 0x0fff);
}

describe("Web Bluetooth GATT Binary Parsers", () => {
  test("decodeSfloat handles signed mantissa, negative exponent, and reserved sentinels", () => {
    assert.strictEqual(decodeSfloat(encodeSfloat(120, 0)), 120);
    assert.ok(Math.abs(decodeSfloat(encodeSfloat(105, -5)) - 0.00105) < 1e-9);
    assert.strictEqual(decodeSfloat(0x07ff), null); // NaN
    assert.strictEqual(decodeSfloat(0x0800), null); // NRes
  });

  test("parseBloodPressureMeasurement parses mmHg, timestamp+pulse, and kPa packets", () => {
    // Flags 0x04 = mmHg, pulse rate present; Sys=122, Dia=78, MAP=93, PR=72
    const bufMmHg = new ArrayBuffer(9);
    const dv1 = new DataView(bufMmHg);
    dv1.setUint8(0, 0x04);
    dv1.setUint16(1, encodeSfloat(122, 0), true);
    dv1.setUint16(3, encodeSfloat(78, 0), true);
    dv1.setUint16(5, encodeSfloat(93, 0), true);
    dv1.setUint16(7, encodeSfloat(72, 0), true);

    assert.deepStrictEqual(parseBloodPressureMeasurement(dv1), {
      bloodPressure: "122/78",
      bloodPressureSystolic: 122,
      bloodPressureDiastolic: 78,
      bloodPressureUnit: "mmHg",
      heartRate: 72,
    });

    // Flags 0x03 = kPa unit + 7-byte timestamp present; 16.0 kPa (~120 mmHg) / 10.7 kPa (~80 mmHg)
    const bufKpa = new ArrayBuffer(14);
    const dv2 = new DataView(bufKpa);
    dv2.setUint8(0, 0x03);
    dv2.setUint16(1, encodeSfloat(160, -1), true);
    dv2.setUint16(3, encodeSfloat(107, -1), true);
    dv2.setUint16(5, encodeSfloat(125, -1), true);

    const kpaResult = parseBloodPressureMeasurement(dv2);
    assert.strictEqual(kpaResult.bloodPressureSystolic, 120);
    assert.strictEqual(kpaResult.bloodPressureDiastolic, 80);
    assert.strictEqual(kpaResult.bloodPressure, "120/80");
  });

  test("parseHeartRateMeasurement parses 8-bit and 16-bit formats safely", () => {
    assert.deepStrictEqual(parseHeartRateMeasurement(new Uint8Array([0x00, 74])), {
      heartRate: 74,
    });

    const dv16 = new DataView(new ArrayBuffer(3));
    dv16.setUint8(0, 0x01);
    dv16.setUint16(1, 168, true);
    assert.deepStrictEqual(parseHeartRateMeasurement(dv16), { heartRate: 168 });

    // Truncated packet
    assert.deepStrictEqual(parseHeartRateMeasurement(new Uint8Array([0x01, 74])), {});
  });

  test("parsePulseOximeterMeasurement decodes IEEE-11073 SFLOAT SpO2 and Pulse Rate", () => {
    const dv = new DataView(new ArrayBuffer(5));
    dv.setUint8(0, 0x00);
    dv.setUint16(1, encodeSfloat(98, 0), true);
    dv.setUint16(3, encodeSfloat(69, 0), true);

    assert.deepStrictEqual(parsePulseOximeterMeasurement(dv), {
      spO2: 98,
      heartRate: 69,
    });

    // Fractional SFLOAT SpO2 (97.5%)
    const dvFrac = new DataView(new ArrayBuffer(5));
    dvFrac.setUint8(0, 0x01);
    dvFrac.setUint16(1, encodeSfloat(975, -1), true);
    dvFrac.setUint16(3, encodeSfloat(71, 0), true);
    assert.deepStrictEqual(parsePulseOximeterMeasurement(dvFrac), {
      spO2: 97.5,
      heartRate: 71,
    });
  });

  test("parseGlucoseMeasurement decodes both kg/L and mol/L units per Bluetooth SIG GLS 1.0", () => {
    // Case 1: Flags 0x02 (concentration present, kg/L, no time offset) -> offset 10
    const dvKgL = new DataView(new ArrayBuffer(13));
    dvKgL.setUint8(0, 0x02);
    dvKgL.setUint16(1, 1, true); // seq
    dvKgL.setUint16(10, encodeSfloat(105, -5), true); // 1.05e-3 kg/L = 105 mg/dL
    assert.deepStrictEqual(parseGlucoseMeasurement(dvKgL), { bloodSugar: 105 });

    // Case 2: Flags 0x07 (time offset + concentration present + mol/L unit) -> offset 12
    const dvMolL = new DataView(new ArrayBuffer(15));
    dvMolL.setUint8(0, 0x07);
    dvMolL.setUint16(1, 2, true); // seq
    dvMolL.setInt16(10, 330, true); // +330 min IST time offset
    dvMolL.setUint16(12, encodeSfloat(55, -4), true); // 5.5 mmol/L ≈ 99 mg/dL
    assert.deepStrictEqual(parseGlucoseMeasurement(dvMolL), { bloodSugar: 99 });
  });
});

import CapacityState from "../../models/CapacityState.js";
import HealthcareFacility from "../../models/HealthcareFacility.js";
import { logger } from "../../utils/logger.js";

/**
 * CapacityDeficitService:
 * Derives the healthcare capacity state representing available resources:
 *  - Doctor and specialist availability
 *  - General and ICU bed occupancy
 *  - Essential medicine inventory levels (antibiotics, fluids, antipyretics)
 *  - Diagnostic throughput
 *  - Ambulance response readiness
 *  - Real-time patient load
 * 
 * Computes the Capacity Deficit Index (D_c in [0, 1]) to condition state transitions.
 */

export function computeCapacityScores(data = {}) {
  const totalBeds = Math.max(1, Number(data.totalBeds || 30));
  const availableBeds = Math.max(0, Number(data.availableBeds ?? 15));
  const bedRatio = Math.min(1.0, availableBeds / totalBeds);

  const icuTotal = Math.max(1, Number(data.icuBedsTotal || 4));
  const icuAvailable = Math.max(0, Number(data.icuBedsAvailable ?? 2));
  const icuRatio = Math.min(1.0, icuAvailable / icuTotal);

  const doctors = Math.max(0, Number(data.doctorsOnDuty ?? 3));
  // Normative baseline: 1 doctor per 15 daily patients
  const patientLoad = Math.max(0, Number(data.currentPatientLoad ?? 20));
  const doctorSufficiency = Math.min(1.0, (doctors * 15) / Math.max(1, patientLoad));

  const medIndex = Math.min(1.0, Math.max(0, Number(data.criticalMedicineStockIndex ?? 0.8)));
  const ambulances = Math.max(0, Number(data.ambulancesAvailable ?? 1));
  const ambulanceScore = ambulances >= 2 ? 1.0 : ambulances === 1 ? 0.7 : 0.2;

  // Composite Effective Capacity Score (Weighted average of infrastructure)
  const effectiveCapacity =
    0.30 * bedRatio +
    0.25 * icuRatio +
    0.20 * doctorSufficiency +
    0.15 * medIndex +
    0.10 * ambulanceScore;

  const effectiveCapacityScore = Math.min(1.0, Math.max(0.05, Number(effectiveCapacity.toFixed(2))));

  // Capacity Deficit Index: High patient load + low effective capacity = high deficit
  const loadStressFactor = Math.min(0.5, (patientLoad / (totalBeds * 2)) * 0.5);
  const deficit = 1.0 - effectiveCapacityScore + loadStressFactor;

  const capacityDeficitIndex = Math.min(1.0, Math.max(0.0, Number(deficit.toFixed(2))));

  return {
    effectiveCapacityScore,
    capacityDeficitIndex,
  };
}

export async function getOrInitializeCapacityState({
  district = "Gautam Buddha Nagar",
  pincode = "201306",
}) {
  let capacity = await CapacityState.findOne({ district, pincode }).sort({ recordedAt: -1 });

  if (!capacity) {
    // Look up or seed an anchor facility
    let facility = await HealthcareFacility.findOne({ district, pincode });
    if (!facility) {
      facility = await HealthcareFacility.create({
        facilityId: `PHC-${pincode}-01`,
        name: `Knowledge Park Community Health Centre (${pincode})`,
        tier: "PHC",
        district,
        pincode,
        coordinates: [77.4977, 28.4744],
        contactPhone: "+91-120-2324000",
        operationalStatus: "active",
      });
    }

    const defaultMedicines = [
      { name: "Paracetamol 500mg", category: "antipyretic", stockDaysRemaining: 25, status: "adequate" },
      { name: "Oral Rehydration Salts (ORS)", category: "hydration", stockDaysRemaining: 18, status: "adequate" },
      { name: "Amoxicillin 250mg", category: "antibiotic", stockDaysRemaining: 12, status: "low" },
      { name: "Normal Saline IV 500ml", category: "fluids", stockDaysRemaining: 20, status: "adequate" },
    ];

    const initialMetrics = {
      facilityId: facility._id,
      facilityCode: facility.facilityId,
      district,
      pincode,
      totalBeds: 25,
      availableBeds: 12,
      icuBedsTotal: 4,
      icuBedsAvailable: 2,
      doctorsOnDuty: 3,
      nursesOnDuty: 5,
      ambulancesAvailable: 2,
      diagnosticCapacityPerDay: 40,
      criticalMedicineStockIndex: 0.78,
      essentialMedicines: defaultMedicines,
      currentPatientLoad: 28,
    };

    const { effectiveCapacityScore, capacityDeficitIndex } = computeCapacityScores(initialMetrics);

    capacity = await CapacityState.create({
      ...initialMetrics,
      effectiveCapacityScore,
      capacityDeficitIndex,
    });

    logger.info({ district, pincode, capacityDeficitIndex }, "Initialized baseline geographic CapacityState");
  }

  return capacity;
}

export async function updateCapacityMetrics(capacityId, updates = {}) {
  const capacity = await CapacityState.findById(capacityId);
  if (!capacity) throw new Error("Capacity state record not found");

  Object.assign(capacity, updates);
  const { effectiveCapacityScore, capacityDeficitIndex } = computeCapacityScores(capacity);
  capacity.effectiveCapacityScore = effectiveCapacityScore;
  capacity.capacityDeficitIndex = capacityDeficitIndex;
  capacity.recordedAt = new Date();

  await capacity.save();
  return capacity;
}

export default {
  computeCapacityScores,
  getOrInitializeCapacityState,
  updateCapacityMetrics,
};

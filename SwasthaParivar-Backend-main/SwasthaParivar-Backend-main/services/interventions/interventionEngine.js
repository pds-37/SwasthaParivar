import Intervention from "../../models/Intervention.js";
import HealthState from "../../models/HealthState.js";
import User from "../../models/user.js";
import { sendPush } from "../../controllers/notificationController.js";
import { logger } from "../../utils/logger.js";

/**
 * InterventionEngine:
 * Automatically initiates level-specific actions based on the state-transition outcome:
 *  - Household: Telemedicine triage, customized dietary/remedy caution, primary caregiver alerts.
 *  - Community: ASHA worker doorstep screening tasks, public health advisories, water source chlorination.
 *  - Facility (PHC/CHC): Medicine buffer replenishment, isolation bed allocation, diagnostic supply surge.
 *  - District / State: Mobile medical camp deployment, doctor reallocation, emergency ambulance coordination.
 */

export function generateInterventionPlan(healthState, capacityState = {}) {
  const level = healthState.level || "community";
  const category = healthState.category || "FEBRILE_ILLNESS";
  const severityScore = healthState.severityScore || 0.5;
  const capacityDeficit = capacityState.capacityDeficitIndex ?? 0.3;

  let interventionType = "ASHA_FIELD_SCREENING";
  let title = `Localized Surveillance in Pincode ${healthState.spatialScope?.pincode}`;
  let recommendations = [];
  let allocatedResources = {
    personnelAssigned: 2,
    medicineKits: 10,
    ambulanceUnits: 0,
    specialistDoctorRequired: false,
  };
  let assignedRoles = ["asha_worker"];
  let priority = "MEDIUM";

  if (level === "district" || severityScore >= 0.75 || capacityDeficit >= 0.65) {
    interventionType = "MOBILE_CAMP_DEPLOYMENT";
    title = `Urgent Mobile Medical Unit Deployment: ${category} Surge`;
    priority = "EMERGENCY";
    recommendations = [
      `Deploy rapid mobile response camp to Ward/Pincode ${healthState.spatialScope?.pincode}`,
      "Authorize emergency release of buffer antibiotics and IV hydration salts",
      "Reallocate 2 medical officers from adjacent low-demand PHC",
      "Establish primary community triage to prevent district hospital emergency overcrowding",
    ];
    allocatedResources = {
      personnelAssigned: 6,
      medicineKits: 50,
      ambulanceUnits: 2,
      specialistDoctorRequired: true,
    };
    assignedRoles = ["medical_officer", "asha_worker", "district_magistrate"];
  } else if (level === "facility" || capacityDeficit >= 0.45) {
    interventionType = "MEDICINE_REPLENISHMENT";
    title = `PHC Resource Restock & Bed Reservation (${healthState.spatialScope?.pincode})`;
    priority = "HIGH";
    recommendations = [
      `Expedite medicine stock replenishment for category ${category}`,
      "Designate 5 temporary observational beds for incoming symptomatic patients",
      "Activate telemedicine consultation shift with district specialist pool",
    ];
    allocatedResources = {
      personnelAssigned: 3,
      medicineKits: 25,
      ambulanceUnits: 1,
      specialistDoctorRequired: false,
    };
    assignedRoles = ["medical_officer", "pharmacist"];
  } else if (level === "community") {
    interventionType = "ASHA_FIELD_SCREENING";
    title = `Community Doorstep Screening Protocol (${healthState.spatialScope?.ward || healthState.spatialScope?.pincode})`;
    priority = severityScore >= 0.5 ? "HIGH" : "MEDIUM";
    recommendations = [
      "Task local ASHA workers with door-to-door temperature & symptom surveys",
      "Distribute preventative oral rehydration packets and clinical guidance leaflets",
      "Flag vulnerable elderly households with pre-existing metabolic conditions",
    ];
    allocatedResources = {
      personnelAssigned: 4,
      medicineKits: 15,
      ambulanceUnits: 0,
      specialistDoctorRequired: false,
    };
    assignedRoles = ["asha_worker", "caregiver"];
  } else {
    interventionType = "TELEMEDICINE_ESCALATION";
    title = `Household Clinical Guidance & Tele-Triage`;
    priority = "LOW";
    recommendations = [
      "Provide validated clinical home remedy guidance",
      "Monitor resting vitals twice daily and log into SwasthaParivar",
      "Consult PHC physician if high symptoms persist beyond 24 hours",
    ];
    assignedRoles = ["caregiver"];
  }

  return {
    interventionType,
    title,
    priority,
    recommendations,
    allocatedResources,
    assignedRoles,
  };
}

export async function dispatchInterventionForState(healthState, capacityState = {}) {
  try {
    const plan = generateInterventionPlan(healthState, capacityState);

    const intervention = await Intervention.create({
      healthStateId: healthState._id,
      targetLevel: healthState.level,
      targetScope: {
        pincode: healthState.spatialScope?.pincode,
        district: healthState.spatialScope?.district,
        ward: healthState.spatialScope?.ward,
      },
      interventionType: plan.interventionType,
      priority: plan.priority,
      title: plan.title,
      recommendations: plan.recommendations,
      allocatedResources: plan.allocatedResources,
      assignedRoles: plan.assignedRoles,
      status: "DISPATCHED",
      dispatchedAt: new Date(),
    });

    // Link intervention back to HealthState
    healthState.activeInterventionId = intervention._id;
    await healthState.save();

    // Notify assigned personnel / authorities via Web Push
    try {
      const usersToNotify = await User.find({
        $or: [
          { role: { $in: plan.assignedRoles } },
          { role: "district_officer" },
        ],
      }).limit(20);

      for (const u of usersToNotify) {
        if (u.pushSubscriptions?.length) {
          await sendPush(
            u,
            `Intervention Dispatched: ${plan.title}`,
            plan.recommendations[0] || "Review action items on your dashboard.",
            { url: "/command-center", interventionId: String(intervention._id) }
          ).catch(() => {});
        }
      }
    } catch (pushErr) {
      logger.warn({ err: pushErr.message }, "Push broadcast for intervention skipped");
    }

    logger.info(
      { interventionId: intervention._id, type: plan.interventionType, priority: plan.priority },
      "Intervention plan created and dispatched"
    );

    return intervention;
  } catch (error) {
    logger.error({ err: error.message }, "Error dispatching intervention");
    throw error;
  }
}

export default {
  generateInterventionPlan,
  dispatchInterventionForState,
};

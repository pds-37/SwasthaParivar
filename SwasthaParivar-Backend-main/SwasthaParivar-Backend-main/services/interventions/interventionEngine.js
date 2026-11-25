import Intervention from "../../models/Intervention.js";
import User from "../../models/user.js";
import { isScopeAuthorized } from "../../config/roles.js";
import { sendPush } from "../../controllers/notificationController.js";
import { logger } from "../../utils/logger.js";

/**
 * InterventionEngine:
 * Generates level-specific public-health action plans using the canonical role system
 * (config/roles.js) and dispatches push notifications strictly to authorized recipients
 * within matching geographic jurisdictions, recording dispatch delivery outcomes.
 */

export function generateInterventionPlan(healthState, capacityState = {}) {
  const level = healthState.level || "community";
  const category = healthState.category || "FEBRILE_ILLNESS";
  const severityScore = healthState.severityScore ?? 0.5;
  const capacityDeficit = capacityState.capacityDeficitIndex ?? 0.3;

  let interventionType = "ASHA_FIELD_SCREENING";
  let title = `Localized Surveillance in Pincode ${healthState.spatialScope?.pincode || "Unknown"}`;
  let recommendations = [];
  let allocatedResources = {
    personnelAssigned: 2,
    medicineKits: 10,
    ambulanceUnits: 0,
    specialistDoctorRequired: false,
  };
  let assignedRoles = ["asha_worker", "facility_admin"];
  let priority = "MEDIUM";

  if (level === "state" || level === "national") {
    interventionType = "MOBILE_CAMP_DEPLOYMENT";
    title = `State Surge Response: ${category} (${healthState.spatialScope?.district || healthState.spatialScope?.state})`;
    priority = "EMERGENCY";
    recommendations = [
      `Coordinate inter-district mobile medical surge units for ${healthState.spatialScope?.district || "affected region"}`,
      "Release state emergency pharmaceutical and IV fluid buffer",
      "Authorize specialist tele-ICU and ambulance corridor support",
    ];
    allocatedResources = {
      personnelAssigned: 12,
      medicineKits: 100,
      ambulanceUnits: 4,
      specialistDoctorRequired: true,
    };
    assignedRoles = ["state_officer", "district_officer", "facility_admin"];
  } else if (level === "district" || severityScore >= 0.75 || capacityDeficit >= 0.65) {
    interventionType = "MOBILE_CAMP_DEPLOYMENT";
    title = `Urgent Mobile Medical Unit Deployment: ${category} Surge`;
    priority = "EMERGENCY";
    recommendations = [
      `Deploy rapid mobile response camp to Ward/Pincode ${healthState.spatialScope?.pincode}`,
      "Authorize emergency release of buffer antibiotics and IV hydration salts",
      "Reallocate 2 clinicians from adjacent low-demand PHC facility",
      "Establish primary community triage to prevent district hospital emergency overcrowding",
    ];
    allocatedResources = {
      personnelAssigned: 6,
      medicineKits: 50,
      ambulanceUnits: 2,
      specialistDoctorRequired: true,
    };
    assignedRoles = ["district_officer", "facility_admin", "asha_worker"];
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
    assignedRoles = ["facility_admin", "district_officer"];
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
    assignedRoles = ["asha_worker", "facility_admin"];
  } else {
    interventionType = "TELEMEDICINE_ESCALATION";
    title = "Household Clinical Guidance & Tele-Triage";
    priority = "LOW";
    recommendations = [
      "Provide validated clinical home remedy guidance",
      "Monitor resting vitals twice daily and log into SwasthaParivar",
      "Consult PHC physician if symptoms persist beyond 24 hours",
    ];
    assignedRoles = ["user"];
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

/**
 * Filter candidate users by canonical role, geographic jurisdiction match, and opt-out preferences.
 * Household-only notifications must never broadcast across unrelated public users.
 */
export function selectAuthorizedRecipients(candidates = [], targetScope = {}, assignedRoles = []) {
  const operatorRoles = assignedRoles.filter((role) => role !== "user");
  if (operatorRoles.length === 0) {
    return [];
  }

  return candidates.filter((candidate) => {
    if (!candidate) return false;
    if (candidate.preferences?.notificationsEnabled === false) return false;
    if (!Array.isArray(candidate.pushSubscriptions) || candidate.pushSubscriptions.length === 0) {
      return false;
    }

    const candidateRoles = new Set([
      candidate.role,
      ...(Array.isArray(candidate.secondaryRoles) ? candidate.secondaryRoles : []),
    ]);
    const hasRelevantRole = operatorRoles.some((role) => candidateRoles.has(role));
    if (!hasRelevantRole) return false;

    return isScopeAuthorized(candidate, targetScope);
  });
}

export async function dispatchInterventionForState(healthState, capacityState = {}) {
  try {
    const plan = generateInterventionPlan(healthState, capacityState);
    const targetScope = {
      pincode: healthState.spatialScope?.pincode,
      district: healthState.spatialScope?.district,
      state: healthState.spatialScope?.state || "Uttar Pradesh",
      ward: healthState.spatialScope?.ward,
    };

    const intervention = await Intervention.create({
      healthStateId: healthState._id,
      targetLevel: healthState.level,
      targetScope,
      interventionType: plan.interventionType,
      priority: plan.priority,
      title: plan.title,
      recommendations: plan.recommendations,
      allocatedResources: plan.allocatedResources,
      assignedRoles: plan.assignedRoles,
      status: "DISPATCHED",
      dispatchedAt: new Date(),
    });

    healthState.activeInterventionId = intervention._id;
    await healthState.save();

    const dispatchAudit = {
      attemptedCount: 0,
      deliveredCount: 0,
      failedCount: 0,
      lastAttemptAt: new Date(),
    };

    const broadcastRoles = Array.from(
      new Set(plan.assignedRoles.filter((role) => role !== "user"))
    );

    if (broadcastRoles.length > 0) {
      try {
        const candidates = await User.find({
          $or: [
            { role: { $in: broadcastRoles } },
            { secondaryRoles: { $in: broadcastRoles } },
          ],
          "pushSubscriptions.0": { $exists: true },
        })
          .select("email role secondaryRoles assignedScope preferences pushSubscriptions")
          .limit(100)
          .lean();

        const recipients = selectAuthorizedRecipients(candidates, targetScope, broadcastRoles);
        dispatchAudit.attemptedCount = recipients.length;

        const targetUrl =
          healthState.level === "community" ? "/asha-portal" : "/command-center";

        for (const recipient of recipients) {
          try {
            const delivery = await sendPush(
              recipient,
              `Intervention Dispatched: ${plan.title}`,
              plan.recommendations[0] || "Review action items on your portal.",
              { url: targetUrl, interventionId: String(intervention._id) }
            );
            if (delivery?.delivered > 0) {
              dispatchAudit.deliveredCount += 1;
            } else {
              dispatchAudit.failedCount += 1;
            }
          } catch {
            dispatchAudit.failedCount += 1;
          }
        }
      } catch (pushErr) {
        logger.warn({ err: pushErr.message }, "Scoped intervention push broadcast failed");
      }
    }

    intervention.dispatchAudit = dispatchAudit;
    await intervention.save();

    logger.info(
      {
        interventionId: intervention._id,
        type: plan.interventionType,
        priority: plan.priority,
        dispatchAudit,
      },
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
  selectAuthorizedRecipients,
  dispatchInterventionForState,
};

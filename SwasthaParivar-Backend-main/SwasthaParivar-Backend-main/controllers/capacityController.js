import CapacityState from "../models/CapacityState.js";
import HealthcareFacility from "../models/HealthcareFacility.js";
import capacityDeficitService from "../services/capacity/capacityDeficitService.js";
import { auditLoggerService } from "../services/diContainer.js";
import { isScopeAuthorized, resolveScopedQuery } from "../config/roles.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { logger } from "../utils/logger.js";

export const getCapacity = async (req, res) => {
  try {
    const scopeCheck = resolveScopedQuery(req.user, {
      state: req.query.state,
      district: req.query.district,
      pincode: req.query.pincode,
    });

    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Capacity view is outside your assigned jurisdiction.",
      });
    }

    const state = scopeCheck.state || req.user?.assignedScope?.state || "Uttar Pradesh";
    const district = scopeCheck.district || req.query.district || req.user?.assignedScope?.district || "Gautam Buddha Nagar";
    const pincode = scopeCheck.pincode || req.query.pincode || req.user?.assignedScope?.pincode || "201306";

    const capacity = await capacityDeficitService.getOrInitializeCapacityState({ state, district, pincode });
    return sendSuccess(res, { data: capacity });
  } catch (error) {
    logger.error({ err: error.message }, "Failed to fetch capacity state");
    return sendError(res, {
      status: 500,
      code: "CAPACITY_FETCH_FAILED",
      message: "Failed to fetch capacity state",
    });
  }
};

export const updateCapacityMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await CapacityState.findById(id).lean();

    if (!existing) {
      return sendError(res, {
        status: 404,
        code: "NOT_FOUND",
        message: "Capacity state record not found",
      });
    }

    const targetScope = {
      state: existing.state || "Uttar Pradesh",
      district: existing.district,
      pincode: existing.pincode,
      facilityId: existing.facilityCode || (existing.facilityId ? String(existing.facilityId) : ""),
    };

    if (!isScopeAuthorized(req.user, targetScope)) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Capacity updates are outside your assigned jurisdiction.",
      });
    }

    const updated = await capacityDeficitService.updateCapacityMetrics(id, req.body);

    await auditLoggerService.logAction({
      action: "CAPACITY_UPDATE",
      resourceType: "CapacityState",
      resourceId: id,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: {
        district: updated.district,
        pincode: updated.pincode,
        capacityDeficitIndex: updated.capacityDeficitIndex,
      },
    });

    return sendSuccess(res, { data: updated, message: "Healthcare capacity updated" });
  } catch (error) {
    logger.error({ err: error.message }, "Failed to update capacity");
    return sendError(res, {
      status: 400,
      code: "CAPACITY_UPDATE_FAILED",
      message: "Failed to update capacity",
    });
  }
};

export const listFacilities = async (req, res) => {
  try {
    const scopeCheck = resolveScopedQuery(req.user, {
      state: req.query.state,
      district: req.query.district,
      pincode: req.query.pincode,
    });

    if (!scopeCheck.authorized) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Facility listing is outside your assigned jurisdiction.",
      });
    }

    const filter = {};
    if (scopeCheck.state) filter.state = scopeCheck.state;
    if (scopeCheck.district) filter.district = scopeCheck.district;
    if (scopeCheck.pincode) filter.pincode = scopeCheck.pincode;

    const facilities = await HealthcareFacility.find(filter).lean();
    return sendSuccess(res, { data: facilities });
  } catch (error) {
    logger.error({ err: error.message }, "Failed to list facilities");
    return sendError(res, {
      status: 500,
      code: "FACILITY_LIST_FAILED",
      message: "Failed to list facilities",
    });
  }
};

export const createFacility = async (req, res) => {
  try {
    const targetScope = {
      state: req.body.state || req.user?.assignedScope?.state || "Uttar Pradesh",
      district: req.body.district,
      pincode: req.body.pincode,
      facilityId: req.body.facilityId,
    };

    if (!isScopeAuthorized(req.user, targetScope)) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Facility creation is outside your assigned jurisdiction.",
      });
    }

    const facility = await HealthcareFacility.create({
      ...req.body,
      state: targetScope.state,
    });

    await auditLoggerService.logAction({
      action: "FACILITY_CREATE",
      resourceType: "HealthcareFacility",
      resourceId: facility._id,
      actorId: req.userId,
      ipAddress: req.ip,
      metadata: { facilityId: facility.facilityId, district: facility.district, pincode: facility.pincode },
    });

    return sendSuccess(res, { data: facility }, 201);
  } catch (error) {
    logger.error({ err: error.message }, "Failed to create facility");
    return sendError(res, {
      status: 400,
      code: "FACILITY_CREATE_FAILED",
      message: "Failed to create facility",
    });
  }
};

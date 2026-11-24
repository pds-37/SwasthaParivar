import CapacityState from "../models/CapacityState.js";
import HealthcareFacility from "../models/HealthcareFacility.js";
import capacityDeficitService from "../services/capacity/capacityDeficitService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

export const getCapacity = async (req, res) => {
  try {
    const district = req.query.district || "Gautam Buddha Nagar";
    const pincode = req.query.pincode || "201306";

    const capacity = await capacityDeficitService.getOrInitializeCapacityState({ district, pincode });
    return sendSuccess(res, { data: capacity });
  } catch (error) {
    return sendError(res, { status: 500, message: "Failed to fetch capacity state", details: error.message });
  }
};

export const updateCapacityMetrics = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await capacityDeficitService.updateCapacityMetrics(id, req.body);
    return sendSuccess(res, { data: updated, message: "Healthcare capacity updated" });
  } catch (error) {
    return sendError(res, { status: 400, message: "Failed to update capacity", details: error.message });
  }
};

export const listFacilities = async (req, res) => {
  try {
    const district = req.query.district || "Gautam Buddha Nagar";
    const facilities = await HealthcareFacility.find({ district }).lean();
    return sendSuccess(res, { data: facilities });
  } catch (error) {
    return sendError(res, { status: 500, message: "Failed to list facilities", details: error.message });
  }
};

export const createFacility = async (req, res) => {
  try {
    const facility = await HealthcareFacility.create(req.body);
    return sendSuccess(res, { data: facility }, 201);
  } catch (error) {
    return sendError(res, { status: 400, message: "Failed to create facility", details: error.message });
  }
};

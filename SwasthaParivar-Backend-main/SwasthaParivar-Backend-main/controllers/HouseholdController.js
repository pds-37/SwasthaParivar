import householdService from "../services/household/HouseholdService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

class HouseholdController {
  async getCurrent(req, res) {
    const summary = await householdService.getHouseholdSummary(req.userId);

    if (!summary) {
      return sendError(res, {
        status: 404,
        code: "HOUSEHOLD_NOT_FOUND",
        message: "Household not found",
      });
    }

    return sendSuccess(res, {
      status: 200,
      data: summary,
    });
  }

  async createInvite(req, res) {
    const result = await householdService.createInvite(req.userId, req.body);

    if (result.error) {
      return sendError(res, {
        status: result.status,
        code: result.error.code,
        message: result.error.message,
      });
    }

    return sendSuccess(res, {
      status: result.status,
      data: result.data,
    });
  }

  async acceptInvite(req, res) {
    const result = await householdService.acceptInvite(req.userId, req.body.code);

    if (result.error) {
      return sendError(res, {
        status: result.status,
        code: result.error.code,
        message: result.error.message,
      });
    }

    return sendSuccess(res, {
      status: result.status,
      data: result.data,
    });
  }
}

const householdController = new HouseholdController();

export default householdController;

import memberHealthService from "../services/health/MemberHealthService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

class HealthRecordController {
  async create(req, res) {
    const result = await memberHealthService.create(req.userId, req.params.memberId, req.body);
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

  async list(req, res) {
    const result = await memberHealthService.list(req.userId, req.params.memberId, req.query);
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
      meta: result.meta,
    });
  }
}

const healthRecordController = new HealthRecordController();

export default healthRecordController;

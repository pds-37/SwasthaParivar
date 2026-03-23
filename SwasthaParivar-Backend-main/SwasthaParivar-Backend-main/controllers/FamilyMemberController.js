import familyMemberService from "../services/member/FamilyMemberService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

class FamilyMemberController {
  async list(req, res) {
    const result = await familyMemberService.list(req.userId, req.query);
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

  async create(req, res) {
    const result = await familyMemberService.create(req.userId, req.body);
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

  async get(req, res) {
    const result = await familyMemberService.get(req.userId, req.params.id);
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

  async updateHealth(req, res) {
    const result = await familyMemberService.updateHealth(req.userId, req.params.id, req.body);
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

  async updateProfile(req, res) {
    const result = await familyMemberService.updateProfile(req.userId, req.params.id, req.body);
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

  async delete(req, res) {
    const result = await familyMemberService.delete(req.userId, req.params.id);
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

const familyMemberController = new FamilyMemberController();

export default familyMemberController;

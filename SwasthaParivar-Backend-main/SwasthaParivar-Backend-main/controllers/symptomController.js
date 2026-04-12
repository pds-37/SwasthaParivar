import SymptomEpisode from "../models/symptomepisode.js";
import householdService from "../services/household/HouseholdService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";

export const createSymptomEpisode = async (req, res) => {
  try {
    const householdContext = await householdService.ensureUserHouseholdContext(req.userId);
    const memberResult = await householdService.findAccessibleMember(req.userId, req.body.memberId);

    if (memberResult.error || !memberResult.member) {
      return sendError(res, {
        status: 404,
        code: "MEMBER_NOT_FOUND",
        message: "Selected family member was not found",
      });
    }

    const episode = await SymptomEpisode.create({
      ownerId: req.userId,
      householdId: householdContext?.household?._id || null,
      memberId: req.body.memberId,
      symptoms: req.body.symptoms,
      severity: req.body.severity,
      sourceMessage: req.body.sourceMessage,
      status: "open",
    });

    return sendSuccess(res, {
      status: 201,
      data: episode,
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "SYMPTOM_EPISODE_CREATE_FAILED",
      message: "Could not log symptom episode",
      details: error.message,
    });
  }
};

export const listSymptomEpisodes = async (req, res) => {
  try {
    const householdContext = await householdService.ensureUserHouseholdContext(req.userId);
    const pagination = parsePagination(req.query);
    const filter = {
      $or: [
        { householdId: householdContext?.household?._id || null },
        { ownerId: req.userId },
      ],
      ...(req.query.memberId ? { memberId: req.query.memberId } : {}),
    };

    const [episodes, total] = await Promise.all([
      SymptomEpisode.find(filter)
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      SymptomEpisode.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      data: episodes,
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "SYMPTOM_EPISODE_LIST_FAILED",
      message: "Could not load symptom episodes",
      details: error.message,
    });
  }
};

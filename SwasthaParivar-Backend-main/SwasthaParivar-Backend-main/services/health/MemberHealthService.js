import familyMemberService from "../member/FamilyMemberService.js";
import { checkAndAwardBadges } from "../../utils/badgeChecker.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";
import { getPlanLimits } from "../../utils/planState.js";

class MemberHealthService {
  async list(ownerId, memberId, query = {}, user = null) {
    const result = await familyMemberService.findOwnedMember(ownerId, memberId);
    if (result.error) {
      return { status: result.status, error: { code: "MEMBER_NOT_FOUND", message: result.error } };
    }

    const pagination = parsePagination(query);
    const limits = getPlanLimits(user || {});
    let records = familyMemberService.buildSnapshotTimeline(result.member);

    if (Number.isFinite(limits.recordHistoryDays)) {
      const cutoff = new Date(Date.now() - limits.recordHistoryDays * 24 * 60 * 60 * 1000);
      records = records.filter((record) => {
        const date = new Date(record?.date || 0);
        return !Number.isNaN(date.getTime()) && date >= cutoff;
      });
    }

    return {
      status: 200,
      data: records.slice(pagination.skip, pagination.skip + pagination.limit),
      meta: buildPaginationMeta({ ...pagination, total: records.length }),
    };
  }

  async create(ownerId, memberId, payload) {
    const result = await familyMemberService.findOwnedMember(ownerId, memberId);
    if (result.error) {
      return { status: result.status, error: { code: "MEMBER_NOT_FOUND", message: result.error } };
    }

    const sanitizedSnapshot = familyMemberService.sanitizeSnapshotPayload(payload);
    if (sanitizedSnapshot.error) {
      return { status: 400, error: { code: "VALIDATION_ERROR", message: sanitizedSnapshot.error } };
    }

    result.member.health = familyMemberService.mergeSnapshotIntoHealth(
      result.member.health,
      sanitizedSnapshot.data
    );

    await result.member.save();
    const newBadges = await checkAndAwardBadges(ownerId);

    return {
      status: 201,
      data: {
        member: familyMemberService.serializeMember(result.member),
        records: familyMemberService.buildSnapshotTimeline(result.member),
        newBadges,
      },
    };
  }
}

const memberHealthService = new MemberHealthService();

export default memberHealthService;

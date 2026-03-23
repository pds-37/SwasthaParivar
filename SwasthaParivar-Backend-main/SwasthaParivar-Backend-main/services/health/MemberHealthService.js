import familyMemberService from "../member/FamilyMemberService.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";

class MemberHealthService {
  async list(ownerId, memberId, query = {}) {
    const result = await familyMemberService.findOwnedMember(ownerId, memberId);
    if (result.error) {
      return { status: result.status, error: { code: "MEMBER_NOT_FOUND", message: result.error } };
    }

    const pagination = parsePagination(query);
    const records = familyMemberService.buildSnapshotTimeline(result.member);

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

    return {
      status: 201,
      data: {
        member: familyMemberService.serializeMember(result.member),
        records: familyMemberService.buildSnapshotTimeline(result.member),
      },
    };
  }
}

const memberHealthService = new MemberHealthService();

export default memberHealthService;

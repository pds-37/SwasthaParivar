import mongoose from "mongoose";
import appConfig from "../../config/AppConfig.js";
import AIInsight from "../../models/aiinsightmodel.js";
import AIMemory from "../../models/aimemorymodel.js";
import AIChatLog from "../../models/aichatlog.js";
import Consent from "../../models/Consent.js";
import DoctorPacket from "../../models/doctorpacket.js";
import FamilyMember from "../../models/familymembermodel.js";
import HealthRecord from "../../models/healthrecord.js";
import HouseholdInvite from "../../models/householdinvitemodel.js";
import HouseholdMembership from "../../models/householdmembershipmodel.js";
import Household from "../../models/householdmodel.js";
import MLPredictionAudit from "../../models/mlpredictionaudit.js";
import PromptLog from "../../models/PromptLog.js";
import Reminder from "../../models/remindermodel.js";
import Report from "../../models/reportmodel.js";
import SecurityEvent from "../../models/SecurityEvent.js";
import Session from "../../models/Session.js";
import SymptomEpisode from "../../models/symptomepisode.js";
import ThreatScore from "../../models/ThreatScore.js";
import User from "../../models/user.js";
import familyMemberService from "../member/FamilyMemberService.js";
import reportStorageService from "../storage/reportStorageService.js";
import { auditLoggerService } from "../diContainer.js";
import { logger } from "../../utils/logger.js";

export function buildAuthorizedMemberScopeQuery(userId, activeHouseholdId = null) {
  if (activeHouseholdId) {
    return {
      householdId: activeHouseholdId,
      profileStatus: { $ne: "archived" },
    };
  }

  return {
    $or: [{ user: userId }, { linkedUserId: userId }, { managedByUserId: userId }],
    profileStatus: { $ne: "archived" },
  };
}

export function sanitizeUserForExport(user) {
  if (!user) return null;
  const {
    password: _p,
    refreshTokenHash: _rt,
    refreshTokenExpiresAt: _rte,
    pushSubscriptions: _ps,
    googleId: _gid,
    ...safeUser
  } = user;
  return safeUser;
}

export function extractActiveHealthSnapshots(members = []) {
  const snapshots = [];

  for (const member of members) {
    const serializedMember = familyMemberService.serializeMember(member);
    const timeline = familyMemberService.buildSnapshotTimeline(serializedMember);

    for (const row of timeline) {
      snapshots.push({
        memberId: serializedMember._id,
        memberName: serializedMember.name,
        relation: serializedMember.relation || "",
        ...row,
      });
    }
  }

  return snapshots.sort((left, right) => new Date(right.date) - new Date(left.date));
}

export async function exportUserAccountData(userId) {
  const rawUser = await User.findById(userId)
    .select("-password -refreshTokenHash -refreshTokenExpiresAt -pushSubscriptions -googleId")
    .lean();

  if (!rawUser) {
    return null;
  }

  const activeHouseholdId = rawUser.activeHouseholdId || null;
  const memberFilter = buildAuthorizedMemberScopeQuery(userId, activeHouseholdId);
  const members = await FamilyMember.find(memberFilter).lean();
  const memberIds = members.map((member) => member._id);

  const reportScope = activeHouseholdId
    ? { $or: [{ householdId: activeHouseholdId }, { ownerId: userId, householdId: null }] }
    : { ownerId: userId };

  const [
    consents,
    legacyHealthRecords,
    reminders,
    reports,
    aiMemories,
    aiInsights,
    aiChatLogs,
    symptomEpisodes,
    doctorPackets,
    memberships,
    invites,
  ] = await Promise.all([
    Consent.find({ userId }).sort({ givenAt: -1 }).lean(),
    HealthRecord.find({ memberId: { $in: memberIds } }).sort({ date: -1 }).lean(),
    Reminder.find({ ownerId: userId, deletedAt: null }).sort({ createdAt: -1 }).lean(),
    Report.find(reportScope).select("-fileBuffer -storageKey").sort({ createdAt: -1 }).lean(),
    AIMemory.find({ ownerId: userId }).sort({ updatedAt: -1 }).lean(),
    AIInsight.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    AIChatLog.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    SymptomEpisode.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    DoctorPacket.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    HouseholdMembership.find({ userId }).sort({ createdAt: -1 }).lean(),
    HouseholdInvite.find({
      $or: [{ createdByUserId: userId }, { acceptedByUserId: userId }],
    })
      .select("-tokenHash")
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const serializedMembers = members.map((m) => familyMemberService.serializeMember(m));
  const activeHealthSnapshots = extractActiveHealthSnapshots(serializedMembers);

  return {
    exportedAt: new Date().toISOString(),
    privacyPolicyVersion: appConfig.privacyPolicyVersion,
    user: sanitizeUserForExport(rawUser),
    consents,
    members: serializedMembers,
    activeHealthSnapshots,
    healthRecords: activeHealthSnapshots,
    legacyHealthRecords,
    reminders,
    reports,
    aiMemories,
    aiInsights,
    aiChatLogs,
    symptomEpisodes,
    doctorPackets,
    memberships,
    invites,
  };
}

async function promoteNextHouseholdOwner(householdId, deletedUserId) {
  const nextOwnerMembership = await HouseholdMembership.findOne({
    householdId,
    userId: { $ne: deletedUserId },
    status: "active",
  }).sort({ createdAt: 1 });

  if (!nextOwnerMembership) {
    await Promise.all([
      HouseholdInvite.deleteMany({ householdId }),
      Household.deleteOne({ _id: householdId }),
    ]);
    return;
  }

  await Promise.all([
    Household.updateOne({ _id: householdId }, { $set: { createdByUserId: nextOwnerMembership.userId } }),
    HouseholdMembership.updateOne(
      { _id: nextOwnerMembership._id },
      {
        $set: {
          role: "owner",
          permissions: {
            canInvite: true,
            canManageDependents: true,
            canViewFamilyDetails: true,
          },
        },
      }
    ),
  ]);
}

export async function deleteUserAccountData(userId) {
  const personalMemberFilter = {
    $or: [{ user: userId }, { linkedUserId: userId }, { managedByUserId: userId }],
  };
  const members = await FamilyMember.find(personalMemberFilter).select("_id householdId").lean();
  const memberIds = Array.from(
    new Set(
      members
        .map((m) => m._id)
        .filter(Boolean)
        .map(String)
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    )
  ).map((id) => new mongoose.Types.ObjectId(id));

  const ownedHouseholds = await Household.find({ createdByUserId: userId }).select("_id").lean();
  const userReports = await Report.find({ ownerId: userId }).select("_id storageProvider storageKey").lean();

  // Delete external object storage blobs safely before removing report metadata
  for (const rep of userReports) {
    try {
      await reportStorageService.deleteReportObject(rep);
    } catch (err) {
      logger.warn({ reportId: String(rep._id), err: err.message }, "Object delete warning during account erasure");
    }
  }

  await auditLoggerService.anonymizeUserLogs(userId);

  await Promise.all([
    Session.deleteMany({ userId }),
    ThreatScore.deleteOne({ userId }),
    SecurityEvent.updateMany({ userId }, { $set: { userId: null, ipAddress: "redacted" } }),
    PromptLog.updateMany({ userId }, { $set: { userId: null, ipAddress: "redacted" } }),
    MLPredictionAudit.updateMany({ userId }, { $set: { userId: null, patientId: "redacted" } }),
    HealthRecord.deleteMany({ memberId: { $in: memberIds } }),
    Reminder.deleteMany({ ownerId: userId }),
    Report.deleteMany({ ownerId: userId }),
    AIMemory.deleteMany({ ownerId: userId }),
    AIInsight.deleteMany({ ownerId: userId }),
    AIChatLog.deleteMany({ ownerId: userId }),
    SymptomEpisode.deleteMany({ ownerId: userId }),
    DoctorPacket.deleteMany({ ownerId: userId }),
    Consent.deleteMany({ userId }),
    HouseholdInvite.deleteMany({
      $or: [{ createdByUserId: userId }, { acceptedByUserId: userId }],
    }),
    HouseholdMembership.deleteMany({ userId }),
    FamilyMember.deleteMany(personalMemberFilter),
    User.deleteOne({ _id: userId }),
  ]);

  await Promise.all(
    ownedHouseholds.map((household) => promoteNextHouseholdOwner(household._id, userId))
  );

  return { deleted: true };
}

export default {
  buildAuthorizedMemberScopeQuery,
  sanitizeUserForExport,
  extractActiveHealthSnapshots,
  exportUserAccountData,
  deleteUserAccountData,
};

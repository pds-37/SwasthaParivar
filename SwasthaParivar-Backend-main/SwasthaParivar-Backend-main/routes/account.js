import express from "express";
import mongoose from "mongoose";

import appConfig from "../config/AppConfig.js";
import AIInsight from "../models/aiinsightmodel.js";
import AIMemory from "../models/aimemorymodel.js";
import AIChatLog from "../models/aichatlog.js";
import Consent from "../models/Consent.js";
import DoctorPacket from "../models/doctorpacket.js";
import FamilyMember from "../models/familymembermodel.js";
import HealthRecord from "../models/healthrecord.js";
import HouseholdInvite from "../models/householdinvitemodel.js";
import HouseholdMembership from "../models/householdmembershipmodel.js";
import Household from "../models/householdmodel.js";
import Reminder from "../models/remindermodel.js";
import Report from "../models/reportmodel.js";
import SymptomEpisode from "../models/symptomepisode.js";
import User from "../models/user.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { clearAuthCookies } from "../utils/tokenCookies.js";

const router = express.Router();

const buildOwnedMemberFilter = (userId) => ({
  $or: [
    { user: userId },
    { linkedUserId: userId },
    { managedByUserId: userId },
  ],
});

const toObjectIdArray = (values = []) =>
  Array.from(
    new Set(
      values
        .filter(Boolean)
        .map((value) => String(value))
        .filter((value) => mongoose.Types.ObjectId.isValid(value))
    )
  ).map((value) => new mongoose.Types.ObjectId(value));

const promoteNextHouseholdOwner = async (householdId, deletedUserId) => {
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
    Household.updateOne(
      { _id: householdId },
      { $set: { createdByUserId: nextOwnerMembership.userId } }
    ),
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
};

router.get("/me/export", async (req, res) => {
  const userId = req.userId;
  const memberFilter = buildOwnedMemberFilter(userId);
  const members = await FamilyMember.find(memberFilter).lean();
  const memberIds = members.map((member) => member._id);

  const [
    user,
    consents,
    healthRecords,
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
    User.findById(userId).select("-password -refreshTokenHash").lean(),
    Consent.find({ userId }).sort({ givenAt: -1 }).lean(),
    HealthRecord.find({ memberId: { $in: memberIds } }).sort({ date: -1 }).lean(),
    Reminder.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    Report.find({ ownerId: userId }).select("-fileBuffer").sort({ createdAt: -1 }).lean(),
    AIMemory.find({ ownerId: userId }).sort({ updatedAt: -1 }).lean(),
    AIInsight.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    AIChatLog.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    SymptomEpisode.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    DoctorPacket.find({ ownerId: userId }).sort({ createdAt: -1 }).lean(),
    HouseholdMembership.find({ userId }).sort({ createdAt: -1 }).lean(),
    HouseholdInvite.find({
      $or: [{ createdByUserId: userId }, { acceptedByUserId: userId }],
    })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="my-swasthaparivar-data.json"'
  );

  return res.status(200).json({
    exportedAt: new Date().toISOString(),
    privacyPolicyVersion: appConfig.privacyPolicyVersion,
    user,
    consents,
    members,
    healthRecords,
    reminders,
    reports,
    aiMemories,
    aiInsights,
    aiChatLogs,
    symptomEpisodes,
    doctorPackets,
    memberships,
    invites,
  });
});

router.delete("/me", async (req, res) => {
  const userId = req.userId;
  const memberFilter = buildOwnedMemberFilter(userId);
  const members = await FamilyMember.find(memberFilter).select("_id householdId").lean();
  const memberIds = toObjectIdArray(members.map((member) => member._id));

  const ownedHouseholds = await Household.find({ createdByUserId: userId })
    .select("_id")
    .lean();

  await Promise.all([
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
    FamilyMember.deleteMany(memberFilter),
    User.deleteOne({ _id: userId }),
  ]);

  await Promise.all(
    ownedHouseholds.map((household) =>
      promoteNextHouseholdOwner(household._id, userId)
    )
  );

  clearAuthCookies(res);
  return sendSuccess(res, {
    data: {
      message: "All your data has been permanently deleted.",
    },
  });
});

export default router;

import crypto from "node:crypto";
import mongoose from "mongoose";

import FamilyMember from "../../models/familymembermodel.js";
import HouseholdInvite from "../../models/householdinvitemodel.js";
import HouseholdMembership from "../../models/householdmembershipmodel.js";
import Household from "../../models/householdmodel.js";
import Reminder from "../../models/remindermodel.js";
import Report from "../../models/reportmodel.js";
import SymptomEpisode from "../../models/symptomepisode.js";
import User from "../../models/user.js";
import { logger } from "../../utils/logger.js";

const HEALTH_METRICS = [
  "bloodPressure",
  "heartRate",
  "bloodSugar",
  "weight",
  "sleep",
  "steps",
];

class HouseholdService {
  normalizeText(value, { maxLength = 120 } = {}) {
    const normalized = String(value || "")
      .trim()
      .replace(/\s+/g, " ");

    return normalized.slice(0, maxLength);
  }

  normalizeEmail(value = "") {
    return String(value || "").trim().toLowerCase();
  }

  buildEmptyHealth() {
    return HEALTH_METRICS.reduce((health, metric) => {
      health[metric] = [];
      return health;
    }, {});
  }

  buildHouseholdName(user) {
    const firstName = this.normalizeText(user?.fullName?.split(" ")?.[0] || "My", {
      maxLength: 40,
    });
    return `${firstName} Household`;
  }

  buildSlug(name = "") {
    return String(name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 140);
  }

  getDefaultPermissions(role = "adult") {
    if (role === "viewer") {
      return {
        canInvite: false,
        canManageDependents: false,
        canViewFamilyDetails: true,
      };
    }

    return {
      canInvite: true,
      canManageDependents: true,
      canViewFamilyDetails: true,
    };
  }

  getDefaultSharingPreferences(profileType = "self") {
    if (profileType === "dependent") {
      return {
        visibility: "full",
        allowFamilySummary: true,
        allowCaregiverDetails: true,
      };
    }

    return {
      visibility: "summary",
      allowFamilySummary: true,
      allowCaregiverDetails: false,
    };
  }

  normalizeBoolean(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (value === "true" || value === "1" || value === 1) return true;
    if (value === "false" || value === "0" || value === 0) return false;
    return fallback;
  }

  normalizeInteger(value, { min = 0, max = 120, fallback = 0 } = {}) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, Math.round(parsed)));
  }

  normalizeEnum(value, allowedValues, fallback) {
    const normalized = String(value || "").trim().toLowerCase();
    return allowedValues.has(normalized) ? normalized : fallback;
  }

  normalizeStringList(value, { maxItems = 8, maxLength = 80 } = {}) {
    const source = Array.isArray(value) ? value : [];
    const seen = new Set();

    return source.reduce((items, item) => {
      const normalized = this.normalizeText(item, { maxLength });
      const key = normalized.toLowerCase();

      if (!normalized || seen.has(key) || items.length >= maxItems) {
        return items;
      }

      seen.add(key);
      items.push(normalized);
      return items;
    }, []);
  }

  normalizeMetricEntry(metric, entry) {
    if (!entry || typeof entry !== "object") return null;

    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime())) return null;

    if (metric === "bloodPressure") {
      const value = this.normalizeText(entry.value, { maxLength: 20 });
      if (!value) return null;

      return {
        value,
        date: date.toISOString(),
      };
    }

    const value = Number(entry.value);
    if (!Number.isFinite(value) || value < 0 || value > 200000) {
      return null;
    }

    return {
      value: Number(value.toFixed(2)),
      date: date.toISOString(),
    };
  }

  normalizeHealthPayload(health) {
    const normalized = this.buildEmptyHealth();

    for (const metric of HEALTH_METRICS) {
      const source = Array.isArray(health?.[metric]) ? health[metric] : [];
      const timeline = new Map();

      source.slice(0, 365).forEach((entry) => {
        const normalizedEntry = this.normalizeMetricEntry(metric, entry);
        if (!normalizedEntry) return;
        timeline.set(normalizedEntry.date, normalizedEntry);
      });

      normalized[metric] = Array.from(timeline.values()).sort(
        (left, right) => new Date(left.date) - new Date(right.date)
      );
    }

    return normalized;
  }

  normalizeSharingPreferences(value = {}, profileType = "self") {
    const defaults = this.getDefaultSharingPreferences(profileType);

    return {
      visibility: this.normalizeEnum(
        value?.visibility,
        new Set(["private", "summary", "full"]),
        defaults.visibility
      ),
      allowFamilySummary: this.normalizeBoolean(
        value?.allowFamilySummary,
        defaults.allowFamilySummary
      ),
      allowCaregiverDetails: this.normalizeBoolean(
        value?.allowCaregiverDetails,
        defaults.allowCaregiverDetails
      ),
    };
  }

  normalizeInviteContact(value = {}) {
    return {
      email: this.normalizeEmail(value?.email),
      phone: this.normalizeText(value?.phone, { maxLength: 40 }),
    };
  }

  normalizeBaselinePreferences(value = {}) {
    return {
      preferredFormats: this.normalizeStringList(value?.preferredFormats, {
        maxItems: 8,
        maxLength: 40,
      }),
      avoidedIngredients: this.normalizeStringList(value?.avoidedIngredients, {
        maxItems: 12,
        maxLength: 40,
      }),
      clinicianName: this.normalizeText(value?.clinicianName, { maxLength: 80 }),
      notes: this.normalizeText(value?.notes, { maxLength: 300 }),
    };
  }

  normalizeEmergencyContact(value = {}) {
    return {
      name: this.normalizeText(value?.name, { maxLength: 80 }),
      phone: this.normalizeText(value?.phone, { maxLength: 40 }),
      relation: this.normalizeText(value?.relation, { maxLength: 40 }),
    };
  }

  buildSelfMemberPayload(member = {}, user, household) {
    return {
      householdId: household._id,
      user: user._id,
      linkedUserId: user._id,
      managedByUserId: user._id,
      name: this.normalizeText(user.fullName || member.name, { maxLength: 80 }) || "Self",
      age: this.normalizeInteger(member.age, { min: 0, max: 120, fallback: 0 }),
      gender: this.normalizeEnum(member.gender, new Set(["male", "female", "other"]), "other"),
      avatar: this.normalizeText(member.avatar, { maxLength: 200 }),
      relation: "Self",
      health: this.normalizeHealthPayload(member.health),
      conditions: this.normalizeStringList(member.conditions, { maxItems: 10, maxLength: 60 }),
      allergies: this.normalizeStringList(member.allergies, { maxItems: 10, maxLength: 60 }),
      medications: this.normalizeStringList(member.medications, { maxItems: 12, maxLength: 80 }),
      pregnancyStatus: this.normalizeEnum(
        member.pregnancyStatus,
        new Set(["not_applicable", "not_pregnant", "pregnant", "postpartum"]),
        "not_applicable"
      ),
      childSensitive: this.normalizeBoolean(member.childSensitive, false),
      careRoles: this.normalizeStringList(member.careRoles, { maxItems: 8, maxLength: 40 }),
      profileType: "self",
      profileStatus: "active",
      sharingPreferences: this.normalizeSharingPreferences(member.sharingPreferences, "self"),
      connectionStatus: this.normalizeEnum(
        member.connectionStatus,
        new Set(["not_connected", "pending", "connected", "revoked", "error"]),
        "not_connected"
      ),
      inviteContact: this.normalizeInviteContact(member.inviteContact),
      baselinePreferences: this.normalizeBaselinePreferences(member.baselinePreferences),
      emergencyContact: this.normalizeEmergencyContact(member.emergencyContact),
    };
  }

  valuesEqual(left, right) {
    if (left instanceof mongoose.Types.ObjectId || right instanceof mongoose.Types.ObjectId) {
      return String(left || "") === String(right || "");
    }

    return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
  }

  repairSelfMemberRecord(member, user, household) {
    const nextValues = this.buildSelfMemberPayload(member, user, household);
    let changed = false;

    Object.entries(nextValues).forEach(([key, value]) => {
      const currentValue = typeof member.get === "function" ? member.get(key) : member[key];
      if (this.valuesEqual(currentValue, value)) {
        return;
      }

      if (typeof member.set === "function") {
        member.set(key, value);
      } else {
        member[key] = value;
      }
      changed = true;
    });

    return changed;
  }

  async syncUserHouseholdState(user, { activeHouseholdId, primaryMemberProfileId }) {
    const nextState = {
      activeHouseholdId,
      primaryMemberProfileId,
    };

    await User.updateOne(
      { _id: user._id },
      {
        $set: nextState,
      }
    );

    user.activeHouseholdId = activeHouseholdId;
    user.primaryMemberProfileId = primaryMemberProfileId;
  }

  logHouseholdFallback(userId, error, action) {
    logger.warn({
      route: "household-fallback",
      userId: String(userId || ""),
      action,
      error: {
        message: error?.message || "Household fallback triggered",
      },
    });
  }

  async buildFallbackSummary(userId) {
    const members = await FamilyMember.find({
      user: userId,
      profileStatus: { $ne: "archived" },
    })
      .sort({ createdAt: 1 })
      .lean();

    return {
      household: null,
      selfMember: null,
      members,
      memberships: [],
      pendingInvites: [],
    };
  }

  buildSafeUser(user, context = {}) {
    return {
      id: user._id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl || null,
      activeHouseholdId: context.household?._id || user.activeHouseholdId || null,
      primaryMemberProfileId:
        context.selfMember?._id || user.primaryMemberProfileId || null,
    };
  }

  async loadUser(userOrId) {
    if (!userOrId) return null;

    if (typeof userOrId === "object" && userOrId._id && typeof userOrId.save === "function") {
      return userOrId;
    }

    const userId =
      typeof userOrId === "object" && userOrId._id ? userOrId._id : userOrId;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }

    return User.findById(userId);
  }

  async findActiveMembership(userId, preferredHouseholdId = null) {
    if (preferredHouseholdId && mongoose.Types.ObjectId.isValid(preferredHouseholdId)) {
      const membership = await HouseholdMembership.findOne({
        householdId: preferredHouseholdId,
        userId,
        status: "active",
      });

      if (membership) {
        return membership;
      }
    }

    return HouseholdMembership.findOne({
      userId,
      status: "active",
    }).sort({ createdAt: 1 });
  }

  async createPersonalHousehold(user) {
    const household = await Household.create({
      name: this.buildHouseholdName(user),
      slug: this.buildSlug(this.buildHouseholdName(user)),
      createdByUserId: user._id,
    });

    const membership = await HouseholdMembership.create({
      householdId: household._id,
      userId: user._id,
      role: "owner",
      permissions: this.getDefaultPermissions("owner"),
    });

    return { household, membership };
  }

  async ensureSelfMember(user, household) {
    let member = null;

    if (user.primaryMemberProfileId) {
      member = await FamilyMember.findOne({
        _id: user.primaryMemberProfileId,
        linkedUserId: user._id,
      });
    }

    if (!member) {
      member = await FamilyMember.findOne({
        linkedUserId: user._id,
        profileType: "self",
      }).sort({ createdAt: 1 });
    }

    if (!member) {
      member = await FamilyMember.findOne({
        user: user._id,
        householdId: household._id,
        profileStatus: { $ne: "archived" },
        $or: [
          { relation: mongoose.trusted({ $regex: "^self$", $options: "i" }) },
          { name: this.normalizeText(user.fullName, { maxLength: 80 }) },
        ],
      }).sort({ createdAt: 1 });
    }

    if (!member) {
      member = await FamilyMember.create({
        ...this.buildSelfMemberPayload({}, user, household),
      });
      return member;
    }

    const changed = this.repairSelfMemberRecord(member, user, household);

    if (changed) {
      await member.save();
    }

    return member;
  }

  async backfillLegacyHouseholdData(userId, householdId) {
    const householdObjectId = new mongoose.Types.ObjectId(householdId);
    const backfillMemberFilter = {
      user: userId,
      $or: [{ householdId: { $exists: false } }, { householdId: null }],
    };

    await Promise.all([
      FamilyMember.updateMany(backfillMemberFilter, {
        $set: {
          householdId: householdObjectId,
          managedByUserId: userId,
          profileStatus: "active",
          connectionStatus: "not_connected",
        },
      }),
      Reminder.updateMany(
        { ownerId: userId, householdId: null },
        { $set: { householdId: householdObjectId } }
      ),
      Report.updateMany(
        { ownerId: userId, householdId: null },
        { $set: { householdId: householdObjectId } }
      ),
      SymptomEpisode.updateMany(
        { ownerId: userId, householdId: null },
        { $set: { householdId: householdObjectId } }
      ),
    ]);
  }

  async ensureUserHouseholdContext(userOrId) {
    const user = await this.loadUser(userOrId);
    if (!user) {
      return null;
    }

    let membership = await this.findActiveMembership(user._id, user.activeHouseholdId);
    let household = membership ? await Household.findById(membership.householdId) : null;

    if (!membership || !household) {
      const created = await this.createPersonalHousehold(user);
      membership = created.membership;
      household = created.household;
    }

    await this.backfillLegacyHouseholdData(user._id, household._id);

    const selfMember = await this.ensureSelfMember(user, household);

    const needsUserUpdate =
      String(user.activeHouseholdId || "") !== String(household._id) ||
      String(user.primaryMemberProfileId || "") !== String(selfMember._id);

    if (needsUserUpdate) {
      await this.syncUserHouseholdState(user, {
        activeHouseholdId: household._id,
        primaryMemberProfileId: selfMember._id,
      });
    }

    return {
      household,
      membership,
      selfMember,
      safeUser: this.buildSafeUser(user, { household, selfMember }),
    };
  }

  async listHouseholdMembers(userId) {
    try {
      const context = await this.ensureUserHouseholdContext(userId);
      if (!context) return [];

      return FamilyMember.find({
        householdId: context.household._id,
        profileStatus: { $ne: "archived" },
      }).sort({ createdAt: 1 });
    } catch (error) {
      this.logHouseholdFallback(userId, error, "listHouseholdMembers");
      return FamilyMember.find({
        user: userId,
        profileStatus: { $ne: "archived" },
      }).sort({ createdAt: 1 });
    }
  }

  async findAccessibleMember(userId, memberId) {
    if (!mongoose.Types.ObjectId.isValid(memberId)) {
      return { error: "Invalid member id", status: 400 };
    }

    let member = null;

    try {
      const context = await this.ensureUserHouseholdContext(userId);
      if (!context) {
        return { error: "Household not found", status: 404 };
      }

      member = await FamilyMember.findOne({
        _id: memberId,
        householdId: context.household._id,
        profileStatus: { $ne: "archived" },
      });
    } catch (error) {
      this.logHouseholdFallback(userId, error, "findAccessibleMember");
      member = await FamilyMember.findOne({
        _id: memberId,
        user: userId,
        profileStatus: { $ne: "archived" },
      });
    }

    if (!member) {
      return { error: "Member not found", status: 404 };
    }

    return { member, household: member.householdId ? { _id: member.householdId } : null };
  }

  async findHouseholdMemberByName(userId, name) {
    const normalized = this.normalizeText(name, { maxLength: 80 });
    if (!normalized) return null;

    const nameFilter = {
      name: mongoose.trusted({
        $regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      }),
    };

    try {
      const context = await this.ensureUserHouseholdContext(userId);
      if (!context) return null;

      return FamilyMember.findOne({
        householdId: context.household._id,
        profileStatus: { $ne: "archived" },
        ...nameFilter,
      });
    } catch (error) {
      this.logHouseholdFallback(userId, error, "findHouseholdMemberByName");
      return FamilyMember.findOne({
        user: userId,
        profileStatus: { $ne: "archived" },
        ...nameFilter,
      });
    }
  }

  serializeInvite(invite) {
    const plain = typeof invite?.toObject === "function" ? invite.toObject() : { ...invite };
    return {
      id: plain._id,
      householdId: plain.householdId,
      createdByUserId: plain.createdByUserId,
      acceptedByUserId: plain.acceptedByUserId || null,
      inviteType: plain.inviteType,
      email: plain.email,
      name: plain.name || "",
      relation: plain.relation || "",
      code: plain.code,
      status: plain.status,
      expiresAt: plain.expiresAt,
      acceptedAt: plain.acceptedAt || null,
      createdAt: plain.createdAt,
    };
  }

  serializeMembership(membership) {
    const plain =
      typeof membership?.toObject === "function" ? membership.toObject() : { ...membership };
    return {
      id: plain._id,
      householdId: plain.householdId,
      userId: plain.userId?._id || plain.userId,
      role: plain.role,
      status: plain.status,
      permissions: plain.permissions || this.getDefaultPermissions(plain.role),
      user: plain.userId?._id
        ? {
            id: plain.userId._id,
            email: plain.userId.email,
            fullName: plain.userId.fullName,
            avatarUrl: plain.userId.avatarUrl || null,
          }
        : null,
    };
  }

  serializeHousehold(household) {
    const plain = typeof household?.toObject === "function" ? household.toObject() : { ...household };
    return {
      id: plain._id,
      name: plain.name,
      slug: plain.slug || "",
      status: plain.status,
      createdByUserId: plain.createdByUserId,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  async getHouseholdSummary(userId) {
    try {
      const context = await this.ensureUserHouseholdContext(userId);
      if (!context) {
        return null;
      }

      const [members, memberships, pendingInvites] = await Promise.all([
        FamilyMember.find({
          householdId: context.household._id,
          profileStatus: { $ne: "archived" },
        }).sort({ createdAt: 1 }).lean(),
        HouseholdMembership.find({
          householdId: context.household._id,
          status: "active",
        }).populate("userId", "email fullName avatarUrl").lean(),
        HouseholdInvite.find({
          householdId: context.household._id,
          status: "pending",
          expiresAt: { $gt: new Date() },
        }).sort({ createdAt: -1 }).lean(),
      ]);

      return {
        household: this.serializeHousehold(context.household),
        selfMember: members.find(
          (member) => String(member._id) === String(context.selfMember._id)
        ) || context.selfMember.toObject(),
        members,
        memberships: memberships.map((membership) => this.serializeMembership(membership)),
        pendingInvites: pendingInvites.map((invite) => this.serializeInvite(invite)),
      };
    } catch (error) {
      this.logHouseholdFallback(userId, error, "getHouseholdSummary");
      return this.buildFallbackSummary(userId);
    }
  }

  async generateUniqueInviteCode() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = crypto.randomBytes(4).toString("hex").toUpperCase();
      const existing = await HouseholdInvite.exists({ code });

      if (!existing) {
        return code;
      }
    }

    throw new Error("Could not generate invite code");
  }

  async createInvite(userId, payload = {}) {
    const context = await this.ensureUserHouseholdContext(userId);
    if (!context) {
      return { status: 404, error: { code: "HOUSEHOLD_NOT_FOUND", message: "Household not found" } };
    }

    if (!context.membership?.permissions?.canInvite) {
      return { status: 403, error: { code: "FORBIDDEN", message: "You cannot invite members to this household" } };
    }

    const email = this.normalizeEmail(payload.email);
    if (!email) {
      return { status: 400, error: { code: "VALIDATION_ERROR", message: "Invite email is required" } };
    }

    const currentUser = await this.loadUser(userId);
    if (!currentUser) {
      return { status: 404, error: { code: "USER_NOT_FOUND", message: "User not found" } };
    }

    if (email === currentUser.email) {
      return {
        status: 400,
        error: { code: "VALIDATION_ERROR", message: "You are already part of this household" },
      };
    }

    const inviteType =
      payload.inviteType === "link_existing" ? "link_existing" : "adult_invite";

    const existingInvite = await HouseholdInvite.findOne({
      householdId: context.household._id,
      email,
      status: "pending",
      expiresAt: { $gt: new Date() },
    });

    if (existingInvite) {
      return {
        status: 200,
        data: this.serializeInvite(existingInvite),
      };
    }

    const invite = await HouseholdInvite.create({
      householdId: context.household._id,
      createdByUserId: userId,
      inviteType,
      email,
      name: this.normalizeText(payload.name, { maxLength: 120 }),
      relation: this.normalizeText(payload.relation, { maxLength: 40 }),
      code: await this.generateUniqueInviteCode(),
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    });

    return {
      status: 201,
      data: this.serializeInvite(invite),
    };
  }

  async isPortableHousehold(householdId, selfMemberId, userId) {
    const [membershipCount, otherMembersCount] = await Promise.all([
      HouseholdMembership.countDocuments({ householdId, status: "active" }),
      FamilyMember.countDocuments({
        householdId,
        profileStatus: { $ne: "archived" },
        _id: { $ne: selfMemberId },
      }),
    ]);

    return membershipCount <= 1 && otherMembersCount === 0 && Boolean(userId);
  }

  async cleanupHouseholdIfEmpty(householdId) {
    const [membershipCount, memberCount] = await Promise.all([
      HouseholdMembership.countDocuments({ householdId, status: "active" }),
      FamilyMember.countDocuments({
        householdId,
        profileStatus: { $ne: "archived" },
      }),
    ]);

    if (membershipCount > 0 || memberCount > 0) {
      return;
    }

    await Promise.all([
      HouseholdInvite.deleteMany({ householdId }),
      Household.deleteOne({ _id: householdId }),
    ]);
  }

  async acceptInvite(userId, code) {
    const normalizedCode = this.normalizeText(code, { maxLength: 20 }).toUpperCase();
    if (!normalizedCode) {
      return { status: 400, error: { code: "VALIDATION_ERROR", message: "Invite code is required" } };
    }

    const invite = await HouseholdInvite.findOne({
      code: normalizedCode,
      status: "pending",
    });

    if (!invite) {
      return { status: 404, error: { code: "INVITE_NOT_FOUND", message: "Invite not found or already used" } };
    }

    if (invite.expiresAt.getTime() < Date.now()) {
      invite.status = "expired";
      await invite.save();
      return { status: 410, error: { code: "INVITE_EXPIRED", message: "Invite has expired" } };
    }

    const user = await this.loadUser(userId);
    if (!user) {
      return { status: 404, error: { code: "USER_NOT_FOUND", message: "User not found" } };
    }

    if (invite.email && invite.email !== user.email) {
      return {
        status: 403,
        error: { code: "INVITE_EMAIL_MISMATCH", message: "This invite was sent to a different email address" },
      };
    }

    const currentContext = await this.ensureUserHouseholdContext(user);
    let activeMembership = await HouseholdMembership.findOne({
      householdId: invite.householdId,
      userId,
      status: "active",
    });

    if (!activeMembership) {
      const canMoveProfile = await this.isPortableHousehold(
        currentContext.household._id,
        currentContext.selfMember._id,
        userId
      );

      if (!canMoveProfile) {
        return {
          status: 409,
          error: {
            code: "HOUSEHOLD_MERGE_REQUIRED",
            message: "This account already manages another household. Move that household first before joining a new one.",
          },
        };
      }

      currentContext.selfMember.householdId = invite.householdId;
      currentContext.selfMember.user = userId;
      currentContext.selfMember.linkedUserId = userId;
      currentContext.selfMember.managedByUserId = userId;
      currentContext.selfMember.profileType = "self";
      currentContext.selfMember.profileStatus = "active";
      currentContext.selfMember.relation = "Self";
      await currentContext.selfMember.save();

      await HouseholdMembership.deleteMany({
        householdId: currentContext.household._id,
        userId,
      });

      activeMembership = await HouseholdMembership.create({
        householdId: invite.householdId,
        userId,
        role: "adult",
        permissions: this.getDefaultPermissions("adult"),
      });

      await this.cleanupHouseholdIfEmpty(currentContext.household._id);
    }

    await this.syncUserHouseholdState(user, {
      activeHouseholdId: invite.householdId,
      primaryMemberProfileId: user.primaryMemberProfileId || currentContext?.selfMember?._id || null,
    });

    invite.status = "accepted";
    invite.acceptedByUserId = userId;
    invite.acceptedAt = new Date();
    await invite.save();

    const summary = await this.getHouseholdSummary(userId);

    return {
      status: 200,
      data: {
        invite: this.serializeInvite(invite),
        membership: this.serializeMembership(activeMembership),
        household: summary?.household || null,
        selfMember: summary?.selfMember || null,
      },
    };
  }
}

const householdService = new HouseholdService();

export default householdService;

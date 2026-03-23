import mongoose from "mongoose";
import FamilyMember from "../../models/familymembermodel.js";
import { buildPaginationMeta, parsePagination } from "../../utils/pagination.js";

export const HEALTH_METRICS = [
  "bloodPressure",
  "heartRate",
  "bloodSugar",
  "weight",
  "sleep",
  "steps",
];

const ALLOWED_GENDERS = new Set(["male", "female", "other"]);

class FamilyMemberService {
  normalizeText(value, { maxLength = 80 } = {}) {
    const text = String(value || "")
      .trim()
      .replace(/\s+/g, " ");

    if (!text) return "";
    return text.slice(0, maxLength);
  }

  normalizeAge(value) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) return null;
    return Math.min(120, Math.max(0, Math.round(parsed)));
  }

  normalizeBoolean(value) {
    return value === true || value === "true" || value === 1 || value === "1";
  }

  normalizeList(value, { maxItems = 8, maxLength = 60 } = {}) {
    const source = Array.isArray(value)
      ? value
      : typeof value === "string"
        ? value.split(",")
        : [];

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

  ensureValidMemberId(memberId) {
    return mongoose.Types.ObjectId.isValid(memberId);
  }

  getEmptyHealth() {
    return HEALTH_METRICS.reduce((health, metric) => {
      health[metric] = [];
      return health;
    }, {});
  }

  normalizeHealthEntry(metric, entry) {
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

  sanitizeHealthPayload(health) {
    if (!health || typeof health !== "object" || Array.isArray(health)) {
      return { error: "Missing health object" };
    }

    const normalized = this.getEmptyHealth();

    for (const metric of HEALTH_METRICS) {
      const source = Array.isArray(health[metric]) ? health[metric] : [];
      const timeline = new Map();

      source.slice(0, 365).forEach((entry) => {
        const normalizedEntry = this.normalizeHealthEntry(metric, entry);
        if (!normalizedEntry) return;
        timeline.set(normalizedEntry.date, normalizedEntry);
      });

      normalized[metric] = Array.from(timeline.values()).sort(
        (left, right) => new Date(left.date) - new Date(right.date)
      );
    }

    return { data: normalized };
  }

  sanitizeSnapshotPayload(payload) {
    const date = new Date(payload?.date);

    if (Number.isNaN(date.getTime())) {
      return { error: "Valid date is required" };
    }

    const snapshot = { date: date.toISOString() };
    let hasMetric = false;

    for (const metric of HEALTH_METRICS) {
      const rawValue = payload?.[metric];

      if (rawValue === "" || rawValue === null || rawValue === undefined) {
        continue;
      }

      const normalizedEntry = this.normalizeHealthEntry(metric, {
        value: rawValue,
        date,
      });

      if (!normalizedEntry) {
        return { error: `Invalid ${metric} value` };
      }

      snapshot[metric] = normalizedEntry.value;
      hasMetric = true;
    }

    if (!hasMetric) {
      return { error: "Provide at least one health metric" };
    }

    return { data: snapshot };
  }

  mergeSnapshotIntoHealth(currentHealth, snapshot) {
    const nextHealth = this.sanitizeHealthPayload(currentHealth).data || this.getEmptyHealth();

    for (const metric of HEALTH_METRICS) {
      nextHealth[metric] = (nextHealth[metric] || []).filter((entry) => entry.date !== snapshot.date);

      if (snapshot[metric] !== undefined) {
        nextHealth[metric].push({
          value: snapshot[metric],
          date: snapshot.date,
        });
      }

      nextHealth[metric].sort((left, right) => new Date(left.date) - new Date(right.date));
    }

    return nextHealth;
  }

  buildSnapshotTimeline(member) {
    const health = this.serializeMember(member).health;
    const timeline = new Map();

    for (const metric of HEALTH_METRICS) {
      for (const entry of health[metric] || []) {
        const existing = timeline.get(entry.date) || { date: entry.date };
        existing[metric] = entry.value;
        timeline.set(entry.date, existing);
      }
    }

    return Array.from(timeline.values()).sort(
      (left, right) => new Date(right.date) - new Date(left.date)
    );
  }

  sanitizeMemberPayload(payload, { requireName = false } = {}) {
    const name = this.normalizeText(payload?.name, { maxLength: 80 });
    const relation = this.normalizeText(payload?.relation, { maxLength: 40 });
    const age = this.normalizeAge(payload?.age);
    const gender = String(payload?.gender || "other").toLowerCase();

    if (requireName && !name) {
      return { error: "Name required" };
    }

    if (name && name.length < 2) {
      return { error: "Name must be at least 2 characters" };
    }

    if (!ALLOWED_GENDERS.has(gender)) {
      return { error: "Gender must be male, female, or other" };
    }

    return {
      data: {
        name,
        age: age ?? 0,
        gender,
        relation,
        avatar: this.normalizeText(payload?.avatar, { maxLength: 200 }),
        conditions: this.normalizeList(payload?.conditions, { maxItems: 10, maxLength: 60 }),
        allergies: this.normalizeList(payload?.allergies, { maxItems: 10, maxLength: 60 }),
        medications: this.normalizeList(payload?.medications, { maxItems: 12, maxLength: 80 }),
        childSensitive: this.normalizeBoolean(payload?.childSensitive),
      },
    };
  }

  serializeMember(member) {
    const plainMember = typeof member?.toObject === "function" ? member.toObject() : { ...member };
    const normalizedHealth = this.sanitizeHealthPayload(plainMember.health || {}).data || this.getEmptyHealth();

    return {
      ...plainMember,
      health: normalizedHealth,
      relation: plainMember.relation || "",
      conditions: Array.isArray(plainMember.conditions) ? plainMember.conditions : [],
      allergies: Array.isArray(plainMember.allergies) ? plainMember.allergies : [],
      medications: Array.isArray(plainMember.medications) ? plainMember.medications : [],
      childSensitive: Boolean(plainMember.childSensitive),
    };
  }

  async findOwnedMember(ownerId, memberId) {
    if (!this.ensureValidMemberId(memberId)) {
      return { error: "Invalid member id", status: 400 };
    }

    const member = await FamilyMember.findOne({ _id: memberId, user: ownerId });

    if (!member) {
      return { error: "Member not found", status: 404 };
    }

    return { member };
  }

  async list(ownerId, query = {}) {
    const pagination = parsePagination(query);
    const [members, total] = await Promise.all([
      FamilyMember.find({ user: ownerId })
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      FamilyMember.countDocuments({ user: ownerId }),
    ]);

    return {
      status: 200,
      data: members.map((member) => this.serializeMember(member)),
      meta: buildPaginationMeta({ ...pagination, total }),
    };
  }

  async create(ownerId, payload) {
    const sanitized = this.sanitizeMemberPayload(payload, { requireName: true });
    if (sanitized.error) {
      return { status: 400, error: { code: "VALIDATION_ERROR", message: sanitized.error } };
    }

    const member = await FamilyMember.create({
      user: ownerId,
      ...sanitized.data,
      health: this.getEmptyHealth(),
    });

    return {
      status: 201,
      data: this.serializeMember(member),
    };
  }

  async get(ownerId, memberId) {
    const result = await this.findOwnedMember(ownerId, memberId);
    if (result.error) {
      return { status: result.status, error: { code: "MEMBER_NOT_FOUND", message: result.error } };
    }

    return {
      status: 200,
      data: this.serializeMember(result.member),
    };
  }

  async updateHealth(ownerId, memberId, payload) {
    const result = await this.findOwnedMember(ownerId, memberId);
    if (result.error) {
      return { status: result.status, error: { code: "MEMBER_NOT_FOUND", message: result.error } };
    }

    const sanitizedHealth = this.sanitizeHealthPayload(payload?.health);
    if (sanitizedHealth.error) {
      return { status: 400, error: { code: "VALIDATION_ERROR", message: sanitizedHealth.error } };
    }

    result.member.health = sanitizedHealth.data;
    await result.member.save();

    return {
      status: 200,
      data: this.serializeMember(result.member),
    };
  }

  async updateProfile(ownerId, memberId, payload) {
    const result = await this.findOwnedMember(ownerId, memberId);
    if (result.error) {
      return { status: result.status, error: { code: "MEMBER_NOT_FOUND", message: result.error } };
    }

    const sanitized = this.sanitizeMemberPayload(payload);
    if (sanitized.error) {
      return { status: 400, error: { code: "VALIDATION_ERROR", message: sanitized.error } };
    }

    Object.entries(sanitized.data).forEach(([key, value]) => {
      if (value === undefined) {
        return;
      }

      if (Array.isArray(value)) {
        result.member[key] = value;
        return;
      }

      if (typeof value === "string") {
        if (value !== "" || key === "relation" || key === "avatar") {
          result.member[key] = value;
        }
        return;
      }

      result.member[key] = value;
    });

    await result.member.save();

    return {
      status: 200,
      data: this.serializeMember(result.member),
    };
  }

  async delete(ownerId, memberId) {
    if (!this.ensureValidMemberId(memberId)) {
      return { status: 400, error: { code: "INVALID_MEMBER_ID", message: "Invalid member id" } };
    }

    const member = await FamilyMember.findOneAndDelete({
      _id: memberId,
      user: ownerId,
    });

    if (!member) {
      return { status: 404, error: { code: "MEMBER_NOT_FOUND", message: "Member not found" } };
    }

    return {
      status: 200,
      data: { id: memberId, deleted: true },
    };
  }
}

const familyMemberService = new FamilyMemberService();

export default familyMemberService;

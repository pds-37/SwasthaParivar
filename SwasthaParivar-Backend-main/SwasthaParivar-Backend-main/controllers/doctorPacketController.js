import DoctorPacket from "../models/doctorpacket.js";
import householdService from "../services/household/HouseholdService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";

const normalizeList = (items = [], limit = 12) =>
  Array.isArray(items)
    ? items.map((item) => String(item || "").trim()).filter(Boolean).slice(0, limit)
    : [];

const serializePacket = (packet) => {
  const normalized = typeof packet?.toObject === "function" ? packet.toObject() : packet;

  return {
    _id: normalized._id,
    ownerId: normalized.ownerId,
    memberId: normalized.memberId,
    episodeId: normalized.episodeId || null,
    source: normalized.source || "ai_chat",
    triageTier: normalized.triageTier || "",
    riskLevel: normalized.riskLevel || "",
    summary: normalized.summary || "",
    userConcern: normalized.userConcern || "",
    symptomTimeline: normalized.symptomTimeline || [],
    remediesTried: normalized.remediesTried || [],
    warningsTriggered: normalized.warningsTriggered || [],
    contextChecked: normalized.contextChecked || [],
    missingContext: normalized.missingContext || [],
    doctorNotes: normalized.doctorNotes || [],
    latestVitals: normalized.latestVitals || {},
    trendFlags: normalized.trendFlags || [],
    sourceReferences: normalized.sourceReferences || [],
    exportedAt: normalized.exportedAt || null,
    createdAt: normalized.createdAt || null,
    updatedAt: normalized.updatedAt || null,
  };
};

const buildExportText = (packet) => {
  const data = serializePacket(packet);
  const sections = [
    ["SwasthaParivar Doctor Packet", [`Generated: ${new Date().toLocaleString("en-IN")}`]],
    ["User concern", [data.userConcern || "Not recorded"]],
    ["Triage", [`Tier: ${data.triageTier || "Not recorded"}`, `Risk: ${data.riskLevel || "Not recorded"}`]],
    ["Summary", [data.summary]],
    ["Context checked", data.contextChecked],
    ["Missing context", data.missingContext],
    ["Doctor notes", data.doctorNotes],
    ["Warnings", data.warningsTriggered],
    ["Trend flags", data.trendFlags],
    [
      "References",
      data.sourceReferences.map((ref) => [ref.title, ref.source, ref.url].filter(Boolean).join(" - ")),
    ],
  ];

  return sections
    .map(([title, lines]) => {
      const body = lines?.length ? lines.map((line) => `- ${line}`).join("\n") : "- None recorded";
      return `${title}\n${body}`;
    })
    .join("\n\n");
};

async function ensureMemberAccess(userId, memberId) {
  const access = await householdService.findAccessibleMember(userId, memberId);

  if (!access?.member) {
    return { error: true };
  }

  return { member: access.member };
}

export const createDoctorPacket = async (req, res) => {
  const access = await ensureMemberAccess(req.userId, req.body.memberId);

  if (access.error) {
    return sendError(res, {
      status: 404,
      code: "MEMBER_NOT_FOUND",
      message: "Member not found or not accessible",
    });
  }

  const packet = await DoctorPacket.create({
    ownerId: req.userId,
    memberId: req.body.memberId,
    episodeId: req.body.episodeId || null,
    source: req.body.source || "ai_chat",
    triageTier: req.body.triageTier || "",
    riskLevel: req.body.riskLevel || "",
    summary: req.body.summary,
    userConcern: req.body.userConcern || "",
    symptomTimeline: normalizeList(req.body.symptomTimeline),
    remediesTried: normalizeList(req.body.remediesTried),
    warningsTriggered: normalizeList(req.body.warningsTriggered),
    contextChecked: normalizeList(req.body.contextChecked),
    missingContext: normalizeList(req.body.missingContext),
    doctorNotes: normalizeList(req.body.doctorNotes),
    latestVitals: req.body.latestVitals || {},
    trendFlags: normalizeList(req.body.trendFlags),
    sourceReferences: Array.isArray(req.body.sourceReferences)
      ? req.body.sourceReferences.slice(0, 8).map((ref) => ({
          title: String(ref?.title || "").trim().slice(0, 160),
          source: String(ref?.source || "").trim().slice(0, 220),
          url: String(ref?.url || "").trim().slice(0, 500),
        }))
      : [],
  });

  return sendSuccess(res, {
    status: 201,
    data: serializePacket(packet),
  });
};

export const listDoctorPackets = async (req, res) => {
  const pagination = parsePagination(req.query);
  const filter = {
    ownerId: req.userId,
    ...(req.query.memberId ? { memberId: req.query.memberId } : {}),
  };

  const [packets, total] = await Promise.all([
    DoctorPacket.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    DoctorPacket.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    data: packets.map(serializePacket),
    meta: buildPaginationMeta({ ...pagination, total }),
  });
};

export const getDoctorPacket = async (req, res) => {
  const packet = await DoctorPacket.findOne({
    _id: req.params.id,
    ownerId: req.userId,
  }).lean();

  if (!packet) {
    return sendError(res, {
      status: 404,
      code: "DOCTOR_PACKET_NOT_FOUND",
      message: "Doctor packet not found",
    });
  }

  return sendSuccess(res, { data: serializePacket(packet) });
};

export const exportDoctorPacket = async (req, res) => {
  const packet = await DoctorPacket.findOne({
    _id: req.params.id,
    ownerId: req.userId,
  }).lean();

  if (!packet) {
    return sendError(res, {
      status: 404,
      code: "DOCTOR_PACKET_NOT_FOUND",
      message: "Doctor packet not found",
    });
  }

  return sendSuccess(res, {
    data: {
      packet: serializePacket(packet),
      exportText: buildExportText(packet),
    },
  });
};

export default {
  createDoctorPacket,
  listDoctorPackets,
  getDoctorPacket,
  exportDoctorPacket,
};

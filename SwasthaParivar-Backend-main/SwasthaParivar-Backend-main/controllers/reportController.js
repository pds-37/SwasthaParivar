import Report from "../models/reportmodel.js";
import FamilyMember from "../models/familymembermodel.js";
import { reviewHealthAttachment } from "../services/ai/reportReviewService.js";
import {
  MAX_UPLOAD_BYTES,
  buildSignedDownloadToken,
  buildStoredFileName,
  detectMimeFromBuffer,
  isSafeFileName,
  verifySignedDownloadToken,
} from "../utils/fileUpload.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import { buildPaginationMeta, parsePagination } from "../utils/pagination.js";

const buildSignedUrl = (req, reportId, expiresAt) => {
  const token = buildSignedDownloadToken(reportId, expiresAt);
  return `${req.protocol}://${req.get("host")}/api/reports/${reportId}/download?expiresAt=${encodeURIComponent(expiresAt)}&token=${token}`;
};

const serializeReport = (req, report) => {
  const plain = typeof report.toObject === "function" ? report.toObject() : report;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  return {
    id: plain._id,
    memberId: plain.memberId,
    reportType: plain.reportType,
    notes: plain.notes,
    aiSummary: plain.aiSummary || "",
    originalName: plain.originalName,
    storedFileName: plain.storedFileName,
    mimeType: plain.mimeType,
    size: plain.size,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
    signedUrl: buildSignedUrl(req, plain._id, expiresAt),
    signedUrlExpiresAt: expiresAt,
  };
};

export const listReports = async (req, res) => {
  try {
    const pagination = parsePagination(req.query);
    const filter = { ownerId: req.userId };

    if (req.query.memberId) {
      filter.memberId = req.query.memberId;
    }

    if (req.query.reportType) {
      filter.reportType = req.query.reportType;
    }

    const [reports, total] = await Promise.all([
      Report.find(filter)
        .select("-fileBuffer")
        .sort({ createdAt: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit),
      Report.countDocuments(filter),
    ]);

    return sendSuccess(res, {
      data: reports.map((report) => serializeReport(req, report)),
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REPORT_LIST_FAILED",
      message: "Could not load reports",
      details: error.message,
    });
  }
};

export const uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, {
        status: 400,
        code: "FILE_REQUIRED",
        message: "Report file is required",
      });
    }

    if (req.file.size > MAX_UPLOAD_BYTES) {
      return sendError(res, {
        status: 413,
        code: "FILE_TOO_LARGE",
        message: "File size must be 10MB or less",
      });
    }

    if (!isSafeFileName(req.file.originalname)) {
      return sendError(res, {
        status: 400,
        code: "INVALID_FILE_NAME",
        message: "Filename contains invalid characters",
      });
    }

    const detectedMime = detectMimeFromBuffer(req.file.buffer);
    if (!detectedMime || detectedMime !== req.file.mimetype) {
      return sendError(res, {
        status: 400,
        code: "INVALID_FILE_TYPE",
        message: "Unsupported or mismatched file type",
      });
    }

    const member = await FamilyMember.findOne({
      _id: req.body.memberId,
      user: req.userId,
    }).select("name");
    if (!member) {
      return sendError(res, {
        status: 404,
        code: "MEMBER_NOT_FOUND",
        message: "Selected family member was not found",
      });
    }

    const review = await reviewHealthAttachment({
      base64Data: req.file.buffer.toString("base64"),
      mimeType: detectedMime,
      fileName: req.file.originalname,
      memberLabel: member.name,
    });

    if (!review.isHealthReport) {
      return sendError(res, {
        status: 422,
        code: "INVALID_HEALTH_REPORT",
        message: "Please upload a genuine health report",
        details: review.reason,
      });
    }

    const report = await Report.create({
      ownerId: req.userId,
      memberId: req.body.memberId,
      reportType: req.body.reportType,
      notes: req.body.notes || "",
      aiSummary: review.summary || req.body.aiSummary || "",
      originalName: req.file.originalname,
      storedFileName: buildStoredFileName(detectedMime),
      mimeType: detectedMime,
      size: req.file.size,
      fileBuffer: req.file.buffer,
    });

    return sendSuccess(res, {
      status: 201,
      data: serializeReport(req, report),
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REPORT_UPLOAD_FAILED",
      message: "Could not upload report",
      details: error.message,
    });
  }
};

export const downloadReport = async (req, res) => {
  try {
    const report = await Report.findOne({
      _id: req.params.id,
      ownerId: req.userId,
    }).select("+fileBuffer");

    if (!report) {
      return sendError(res, {
        status: 404,
        code: "REPORT_NOT_FOUND",
        message: "Report not found",
      });
    }

    const expiresAt = new Date(req.query.expiresAt);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() < Date.now()) {
      return sendError(res, {
        status: 401,
        code: "SIGNED_URL_EXPIRED",
        message: "Signed URL has expired",
      });
    }

    const validToken = verifySignedDownloadToken({
      reportId: String(report._id),
      expiresAt: req.query.expiresAt,
      token: req.query.token,
    });

    if (!validToken) {
      return sendError(res, {
        status: 401,
        code: "SIGNED_URL_INVALID",
        message: "Signed URL is invalid",
      });
    }

    res.setHeader("Content-Type", report.mimeType);
    res.setHeader("Content-Length", report.size);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${encodeURIComponent(report.originalName)}"`
    );

    return res.send(report.fileBuffer);
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REPORT_DOWNLOAD_FAILED",
      message: "Could not download report",
      details: error.message,
    });
  }
};

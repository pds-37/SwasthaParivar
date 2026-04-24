import Report from "../models/reportmodel.js";
import householdService from "../services/household/HouseholdService.js";
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

const buildReportScope = (householdId, ownerId) =>
  householdId
    ? {
        $or: [
          { householdId },
          { ownerId, householdId: null },
        ],
      }
    : { ownerId };

export const listReports = async (req, res) => {
  try {
    const pagination = parsePagination(req.query);
    const householdContext = await householdService.getOptionalUserHouseholdContext(
      req.userId,
      "listReports"
    );
    const filter = buildReportScope(householdContext?.household?._id || null, req.userId);

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
    const householdContext = await householdService.getOptionalUserHouseholdContext(
      req.userId,
      "uploadReport"
    );

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

    const memberResult = await householdService.findAccessibleMember(req.userId, req.body.memberId);
    if (memberResult.error || !memberResult.member) {
      return sendError(res, {
        status: 404,
        code: "MEMBER_NOT_FOUND",
        message: "Selected family member was not found",
      });
    }

    const report = await Report.create({
      ownerId: req.userId,
      householdId: householdContext?.household?._id || null,
      memberId: req.body.memberId,
      reportType: req.body.reportType,
      notes: req.body.notes || "",
      aiSummary: req.body.aiSummary || "",
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

export const analyzeReport = async (req, res) => {
  try {
    const householdContext = await householdService.getOptionalUserHouseholdContext(
      req.userId,
      "analyzeReport"
    );
    const report = await Report.findOne({
      _id: req.params.id,
      ...buildReportScope(householdContext?.household?._id || null, req.userId),
    }).select("+fileBuffer");

    if (!report) {
      return sendError(res, {
        status: 404,
        code: "REPORT_NOT_FOUND",
        message: "Report not found",
      });
    }

    const memberResult = await householdService.findAccessibleMember(req.userId, report.memberId);
    const memberLabel = memberResult?.member?.name || "Family member";
    const review = await reviewHealthAttachment({
      base64Data: report.fileBuffer.toString("base64"),
      mimeType: report.mimeType,
      fileName: report.originalName,
      memberLabel,
    });

    if (!review.isHealthReport) {
      return sendError(res, {
        status: 422,
        code: "INVALID_HEALTH_REPORT",
        message: "Please upload a genuine health report",
        details: review.reason,
      });
    }

    report.aiSummary = review.summary || report.aiSummary || "";
    await report.save();

    return sendSuccess(res, {
      data: serializeReport(req, report),
    });
  } catch (error) {
    return sendError(res, {
      status: 500,
      code: "REPORT_ANALYSIS_FAILED",
      message: "Could not analyze report",
      details: error.message,
    });
  }
};

export const downloadReport = async (req, res) => {
  try {
    const householdContext = await householdService.getOptionalUserHouseholdContext(
      req.userId,
      "downloadReport"
    );
    const report = await Report.findOne({
      _id: req.params.id,
      ...buildReportScope(householdContext?.household?._id || null, req.userId),
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

import { createHmac, randomUUID } from "node:crypto";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import appConfig from "../config/AppConfig.js";
import securityConfig from "../config/security.config.js";

export const MAX_UPLOAD_BYTES = securityConfig.upload.maxSizeBytes;

export const isSafeFileName = (fileName = "") => {
  const normalized = path.posix.normalize(String(fileName || ""));
  return !normalized.includes("..") && !normalized.includes("/") && !normalized.includes("\\");
};

export const detectMimeFromBuffer = async (buffer) => {
  const result = await fileTypeFromBuffer(buffer);
  
  if (!result || !securityConfig.upload.allowedMimeTypes.includes(result.mime)) {
    return null;
  }
  
  if (!securityConfig.upload.allowedExtensions.includes(`.${result.ext}`)) {
    return null;
  }

  return { mimeType: result.mime, extension: `.${result.ext}` };
};

export const buildStoredFileName = (extension) => {
  return `${randomUUID()}${extension}`;
};

export const buildSignedDownloadToken = (reportId, expiresAt) =>
  createHmac("sha256", appConfig.jwtSecret)
    .update(`${reportId}:${expiresAt}`)
    .digest("hex");

export const verifySignedDownloadToken = ({ reportId, expiresAt, token }) =>
  buildSignedDownloadToken(reportId, expiresAt) === token;


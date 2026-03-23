import { createHmac, randomUUID } from "node:crypto";
import path from "node:path";
import appConfig from "../config/AppConfig.js";

const allowedMimeTypes = new Map([
  ["application/pdf", { signature: "25504446", extension: ".pdf" }],
  ["image/png", { signature: "89504e47", extension: ".png" }],
  ["image/jpeg", { signature: "ffd8ff", extension: ".jpg" }],
  ["image/webp", { signature: "52494646", extension: ".webp" }],
]);

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const isSafeFileName = (fileName = "") => {
  const normalized = path.posix.normalize(String(fileName || ""));
  return !normalized.includes("..") && !normalized.includes("/") && !normalized.includes("\\");
};

export const detectMimeFromBuffer = (buffer) => {
  const hex = buffer.subarray(0, 12).toString("hex").toLowerCase();

  for (const [mimeType, { signature }] of allowedMimeTypes.entries()) {
    if (hex.startsWith(signature)) {
      return mimeType;
    }
  }

  if (hex.startsWith("52494646") && buffer.subarray(8, 12).toString("ascii") === "WEBP") {
    return "image/webp";
  }

  return null;
};

export const buildStoredFileName = (mimeType) => {
  const extension = allowedMimeTypes.get(mimeType)?.extension || "";
  return `${randomUUID()}${extension}`;
};

export const buildSignedDownloadToken = (reportId, expiresAt) =>
  createHmac("sha256", appConfig.jwtSecret)
    .update(`${reportId}:${expiresAt}`)
    .digest("hex");

export const verifySignedDownloadToken = ({ reportId, expiresAt, token }) =>
  buildSignedDownloadToken(reportId, expiresAt) === token;


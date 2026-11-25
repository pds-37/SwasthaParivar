import { createHash, createHmac } from "node:crypto";
import { logger } from "../../utils/logger.js";

function getStorageConfig(env = process.env) {
  const endpoint = String(env.OBJECT_STORAGE_ENDPOINT || env.S3_ENDPOINT || "").trim().replace(/\/+$/, "");
  const bucket = String(env.OBJECT_STORAGE_BUCKET || env.S3_BUCKET || "").trim();
  const accessKeyId = String(env.OBJECT_STORAGE_ACCESS_KEY_ID || env.S3_ACCESS_KEY_ID || "").trim();
  const secretAccessKey = String(
    env.OBJECT_STORAGE_SECRET_ACCESS_KEY || env.S3_SECRET_ACCESS_KEY || ""
  ).trim();
  const region = String(env.OBJECT_STORAGE_REGION || env.S3_REGION || "auto").trim();
  const sseEnabled = String(env.OBJECT_STORAGE_SSE || "AES256").trim();

  return {
    endpoint,
    bucket,
    accessKeyId,
    secretAccessKey,
    region,
    sseEnabled,
    configured: Boolean(endpoint && bucket && accessKeyId && secretAccessKey),
  };
}

function sha256Hex(data) {
  return createHash("sha256").update(data).digest("hex");
}

function hmacSha256(key, data) {
  return createHmac("sha256", key).update(data).digest();
}

function formatAmzDate(date = new Date()) {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function encodeS3Path(key) {
  return String(key || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * Compute AWS Signature Version 4 Authorization headers for private S3 / Cloudflare R2 requests.
 */
export function signS3Request({
  method,
  key,
  payload = "",
  contentType = "",
  extraHeaders = {},
  config = getStorageConfig(),
  now = new Date(),
}) {
  if (!config.configured) {
    throw new Error("Object storage credentials are not configured");
  }

  const endpointUrl = new URL(config.endpoint);
  const { amzDate, dateStamp } = formatAmzDate(now);
  const canonicalUri = `/${config.bucket}/${encodeS3Path(key)}`;
  const payloadHash = sha256Hex(payload);

  const headers = {
    host: endpointUrl.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
    ...(contentType ? { "content-type": contentType } : {}),
    ...extraHeaders,
  };

  const sortedKeys = Object.keys(headers).map((k) => k.toLowerCase()).sort();
  const canonicalHeaders = sortedKeys
    .map((k) => {
      const originalKey = Object.keys(headers).find((h) => h.toLowerCase() === k);
      return `${k}:${String(headers[originalKey]).trim()}\n`;
    })
    .join("");
  const signedHeaders = sortedKeys.join(";");

  const canonicalRequest = [
    method.toUpperCase(),
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, config.region);
  const kService = hmacSha256(kRegion, "s3");
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return {
    url: `${config.endpoint}${canonicalUri}`,
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
  };
}

/**
 * Generate a short-lived SigV4 presigned GET URL for private S3 / Cloudflare R2 download.
 */
export function buildPresignedGetUrl({
  key,
  expiresInSeconds = 300,
  config = getStorageConfig(),
  now = new Date(),
}) {
  if (!config.configured) return null;

  const endpointUrl = new URL(config.endpoint);
  const { amzDate, dateStamp } = formatAmzDate(now);
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const canonicalUri = `/${config.bucket}/${encodeS3Path(key)}`;
  const ttl = Math.min(900, Math.max(30, Number(expiresInSeconds || 300)));

  const queryParams = new URLSearchParams({
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${config.accessKeyId}/${credentialScope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(ttl),
    "X-Amz-SignedHeaders": "host",
  });
  queryParams.sort();

  const canonicalQuery = queryParams.toString();
  const canonicalHeaders = `host:${endpointUrl.host}\n`;
  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${config.secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, config.region);
  const kService = hmacSha256(kRegion, "s3");
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return `${config.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

export function isObjectStorageConfigured(env = process.env) {
  return getStorageConfig(env).configured;
}

export function buildReportObjectKey({ ownerId, householdId, storedFileName }) {
  const tenant = householdId ? `households/${String(householdId)}` : `users/${String(ownerId)}`;
  return `reports/${tenant}/${storedFileName}`;
}

export async function storeReportObject(
  { key, buffer, contentType },
  { env = process.env, fetchImpl = fetch } = {}
) {
  const config = getStorageConfig(env);
  const checksumSha256 = sha256Hex(buffer);

  if (!config.configured) {
    return {
      storageProvider: "mongodb_buffer",
      storageKey: "",
      checksumSha256,
      encryptedAtRest: true,
      fileBuffer: buffer,
    };
  }

  const extraHeaders = {};
  if (config.sseEnabled && config.sseEnabled.toUpperCase() === "AES256") {
    extraHeaders["x-amz-server-side-encryption"] = "AES256";
  }

  const signed = signS3Request({
    method: "PUT",
    key,
    payload: buffer,
    contentType,
    extraHeaders,
    config,
  });

  const response = await fetchImpl(signed.url, {
    method: "PUT",
    headers: signed.headers,
    body: buffer,
  });

  if (!response.ok) {
    throw new Error(`Object storage upload failed with status ${response.status}`);
  }

  return {
    storageProvider: "s3_r2",
    storageKey: key,
    checksumSha256,
    encryptedAtRest: true,
    fileBuffer: undefined,
  };
}

export async function readReportBuffer(report, { env = process.env, fetchImpl = fetch } = {}) {
  if (!report) return null;

  if (report.storageProvider === "s3_r2" && report.storageKey) {
    const config = getStorageConfig(env);
    if (!config.configured) {
      throw new Error("Object storage credentials missing for reading stored report");
    }

    const signed = signS3Request({
      method: "GET",
      key: report.storageKey,
      payload: "",
      config,
    });
    const response = await fetchImpl(signed.url, {
      method: "GET",
      headers: signed.headers,
    });
    if (!response.ok) {
      throw new Error(`Object storage read failed with status ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  return report.fileBuffer || null;
}

export async function deleteReportObject(report, { env = process.env, fetchImpl = fetch } = {}) {
  if (!report || report.storageProvider !== "s3_r2" || !report.storageKey) {
    return { deleted: true, provider: "mongodb_buffer" };
  }

  const config = getStorageConfig(env);
  if (!config.configured) {
    logger.warn({ reportId: String(report._id || "") }, "Skipped remote report object deletion: storage env unset");
    return { deleted: false, provider: "s3_r2", skipped: true };
  }

  const signed = signS3Request({
    method: "DELETE",
    key: report.storageKey,
    payload: "",
    config,
  });

  const response = await fetchImpl(signed.url, {
    method: "DELETE",
    headers: signed.headers,
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Object storage deletion failed with status ${response.status}`);
  }

  return { deleted: true, provider: "s3_r2" };
}

export default {
  isObjectStorageConfigured,
  buildReportObjectKey,
  signS3Request,
  buildPresignedGetUrl,
  storeReportObject,
  readReportBuffer,
  deleteReportObject,
};

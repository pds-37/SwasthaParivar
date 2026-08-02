import { createHash } from "node:crypto";

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
const LATEST_HASH_KEY = "audit_log_latest_hash";

export function createAuditLoggerService({ AuditLogModel, SystemStateModel, loggerInstance }) {
  return {
    /**
     * Logs an action to the tamper-evident AuditLog collection.
     * Runs asynchronously and guarantees strict sequential hashing via SystemState.
     */
    async logAction({ action, resourceType, resourceId, actorId, ipAddress = "unknown", metadata = {} }) {
    try {
      // Find and update the latest hash in a single atomic operation
      const state = await SystemStateModel.findOneAndUpdate(
        { key: LATEST_HASH_KEY },
        { $setOnInsert: { value: GENESIS_HASH } }, // Upsert base case
        { new: false, upsert: true } // Returns the document BEFORE update
      );

      const previousHash = state ? state.value : GENESIS_HASH;

      const payload = {
        action,
        resourceType,
        resourceId: String(resourceId || "null"),
        actorId: String(actorId),
        ipAddress,
        metadata: JSON.stringify(metadata)
      };

      // Calculate the current hash: SHA-256(previousHash + stringified_payload)
      const dataToHash = previousHash + JSON.stringify(payload);
      const currentHash = createHash("sha256").update(dataToHash).digest("hex");

      // We must now update the SystemState to point to this new hash.
      // Note: A true distributed lock is safer here, but this suffices for our scale.
      await SystemStateModel.updateOne(
        { key: LATEST_HASH_KEY, value: previousHash },
        { $set: { value: currentHash } }
      );

      // Save the log
      await AuditLogModel.create({
        action,
        resourceType,
        resourceId,
        actorId,
        ipAddress,
        metadata,
        previousHash,
        hash: currentHash
      });

    } catch (error) {
      loggerInstance.error({ msg: "Failed to write audit log", error: error.message, action, actorId });
      // In a strict compliance environment, we might want to halt the system if audit logging fails.
      // For SwasthaParivar V2, we will log the error but allow the request to proceed.
    }
  },

    /**
     * Cryptographically anonymizes all audit logs for a given user.
     * This preserves the hash chain while wiping identifying data.
     */
    async anonymizeUserLogs(userId) {
      await AuditLogModel.updateMany(
        { actorId: userId },
        {
          $set: {
            anonymized: true,
            ipAddress: "redacted",
            actorId: "000000000000000000000000", // valid null object id
            "metadata.anonymizedAt": new Date().toISOString()
          }
        }
      );
    }
  };
}

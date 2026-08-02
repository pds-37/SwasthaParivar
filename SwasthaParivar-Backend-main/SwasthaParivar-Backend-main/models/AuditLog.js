import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: ["CREATE", "READ", "UPDATE", "DELETE", "EXPORT", "AI_ANALYSIS", "LOGIN", "EMERGENCY_ACCESS"]
    },
    resourceType: {
      type: String,
      required: true
    },
    resourceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    ipAddress: {
      type: String,
      default: "unknown"
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    previousHash: {
      type: String,
      required: true
    },
    hash: {
      type: String,
      required: true,
      unique: true
    },
    anonymized: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// We do not allow updates or deletes to the AuditLog to preserve the hash chain.
// The only exception is setting anonymized=true and wiping identifying data during GDPR deletion.
auditLogSchema.pre("findOneAndUpdate", function(next) {
  const update = this.getUpdate();
  if (update.$set && update.$set.anonymized === true) {
    return next();
  }
  next(new Error("Audit logs are immutable."));
});

auditLogSchema.pre("deleteOne", function(next) {
  next(new Error("Audit logs cannot be deleted. Anonymize them instead."));
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

export default AuditLog;

import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    refreshTokenHash: {
      type: String,
      required: true
    },
    deviceFingerprint: {
      type: String,
      default: null
    },
    ipAddress: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index so MongoDB automatically deletes expired sessions
    },
    revokedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// Method to check if session is active
sessionSchema.methods.isActive = function() {
  if (this.revokedAt) return false;
  if (this.expiresAt < new Date()) return false;
  return true;
};

// Method to revoke session
sessionSchema.methods.revoke = async function() {
  this.revokedAt = new Date();
  await this.save();
};

const Session = mongoose.model("Session", sessionSchema);

export default Session;

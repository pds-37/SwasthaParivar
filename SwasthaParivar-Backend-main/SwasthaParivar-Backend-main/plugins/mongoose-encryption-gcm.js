import aesGcmService from "../services/crypto/AesGcmService.js";

/**
 * Mongoose plugin to automatically encrypt and decrypt specific string fields using AES-256-GCM.
 * 
 * Usage:
 * const schema = new mongoose.Schema({ notes: String, ... });
 * schema.plugin(mongooseEncryptionGcm, { fields: ["notes", "aiSummary"] });
 */
export default function mongooseEncryptionGcm(schema, options) {
  const fields = options?.fields || [];

  if (!Array.isArray(fields) || fields.length === 0) {
    return;
  }

  // Pre-save hook: Encrypt specified fields before saving to DB
  schema.pre("save", function (next) {
    for (const field of fields) {
      if (this.isModified(field) && typeof this[field] === "string") {
        this[field] = aesGcmService.encrypt(this[field]);
      }
    }
    next();
  });

  schema.pre("insertMany", function (next, docs) {
    for (const doc of docs) {
      for (const field of fields) {
        if (typeof doc[field] === "string") {
          doc[field] = aesGcmService.encrypt(doc[field]);
        }
      }
    }
    next();
  });

  // Post hooks: Decrypt fields when fetching from DB
  const decryptDoc = (doc) => {
    if (!doc) return;
    for (const field of fields) {
      if (typeof doc[field] === "string") {
        doc[field] = aesGcmService.decrypt(doc[field]);
      }
    }
  };

  schema.post("init", function (doc) {
    decryptDoc(doc);
  });

  schema.post("find", function (docs) {
    if (Array.isArray(docs)) {
      for (const doc of docs) {
        decryptDoc(doc);
      }
    }
  });

  schema.post("findOne", function (doc) {
    decryptDoc(doc);
  });
  
  schema.post("findOneAndUpdate", function (doc) {
    decryptDoc(doc);
  });
}

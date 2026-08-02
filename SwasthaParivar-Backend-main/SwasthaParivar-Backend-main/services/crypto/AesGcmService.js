import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import keyManagementService from "./KeyManagementService.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;
const DELIMITER = ":";

class AesGcmService {
  /**
   * Encrypts a plaintext string using AES-256-GCM.
   * Returns a composite string: version:iv:authTag:ciphertext
   */
  encrypt(plaintext) {
    if (!plaintext) return plaintext;

    const { version, key } = keyManagementService.getActiveKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(String(plaintext), "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const authTag = cipher.getAuthTag().toString("hex");

    return `${version}${DELIMITER}${iv.toString("hex")}${DELIMITER}${authTag}${DELIMITER}${encrypted}`;
  }

  /**
   * Decrypts a composite string: version:iv:authTag:ciphertext
   */
  decrypt(compositeData) {
    if (!compositeData || typeof compositeData !== "string") return compositeData;

    const parts = compositeData.split(DELIMITER);
    if (parts.length !== 4) {
      // Data is not in expected encrypted format, return as is (could be legacy plaintext)
      return compositeData;
    }

    const [version, ivHex, authTagHex, encryptedHex] = parts;

    try {
      const key = keyManagementService.getKeyByVersion(version);
      const iv = Buffer.from(ivHex, "hex");
      const authTag = Buffer.from(authTagHex, "hex");

      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encryptedHex, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      // Authentication failed or key missing
      throw new Error("Data decryption failed: Authentication tag mismatch or invalid key.");
    }
  }
}

const aesGcmService = new AesGcmService();
export default aesGcmService;

import { randomBytes } from "node:crypto";

/**
 * Abstracts the fetching and rotation of encryption keys.
 * In a production setup, this would interface with AWS KMS, Google Secret Manager, or HashiCorp Vault.
 */
class KeyManagementService {
  constructor() {
    // Expected format: V1:hex_key_32_bytes,V2:hex_key_32_bytes
    this._keys = new Map();
    this._activeVersion = null;
    this._init();
  }

  _init() {
    const rawKeys = process.env.ENCRYPTION_KEYS || `V1:${randomBytes(32).toString("hex")}`;
    const pairs = rawKeys.split(",").filter(Boolean);

    for (const pair of pairs) {
      const [version, hexKey] = pair.split(":");
      if (version && hexKey && hexKey.length === 64) {
        this._keys.set(version, Buffer.from(hexKey, "hex"));
        this._activeVersion = version; // The last one listed is the active one
      }
    }

    if (!this._activeVersion) {
      // Fallback for dev environments if env is missing/invalid
      const devKey = randomBytes(32);
      this._keys.set("V1", devKey);
      this._activeVersion = "V1";
      console.warn("[KeyManagementService] Using generated memory key. Data will be lost on restart.");
    }
  }

  /**
   * Returns the currently active encryption key and its version.
   * Used for encrypting new data.
   */
  getActiveKey() {
    return {
      version: this._activeVersion,
      key: this._keys.get(this._activeVersion)
    };
  }

  /**
   * Returns a specific key by its version.
   * Used for decrypting existing data.
   */
  getKeyByVersion(version) {
    const key = this._keys.get(version);
    if (!key) {
      throw new Error(`Encryption key version ${version} not found in key ring.`);
    }
    return key;
  }
}

const keyManagementService = new KeyManagementService();
export default keyManagementService;

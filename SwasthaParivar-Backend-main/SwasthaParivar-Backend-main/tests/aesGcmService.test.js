import test from "node:test";
import assert from "node:assert";
import aesGcmService from "../services/crypto/AesGcmService.js";

test("AES-GCM Service Tests", async (t) => {
  await t.test("should encrypt and decrypt correctly", () => {
    const plaintext = "This is a highly sensitive medical note.";
    const encrypted = aesGcmService.encrypt(plaintext);
    
    assert.notStrictEqual(plaintext, encrypted);
    assert.ok(encrypted.includes(":"));
    
    const decrypted = aesGcmService.decrypt(encrypted);
    assert.strictEqual(decrypted, plaintext);
  });

  await t.test("should fail decryption if tampered", () => {
    const plaintext = "Safe data";
    let encrypted = aesGcmService.encrypt(plaintext);
    
    // Tamper with the ciphertext (the last part)
    const parts = encrypted.split(":");
    parts[3] = "bad" + parts[3].substring(3);
    const tampered = parts.join(":");

    assert.throws(() => aesGcmService.decrypt(tampered), /Data decryption failed/);
  });

  await t.test("should return plaintext as-is if missing delimiter format", () => {
    const legacyPlaintext = "Just some old unencrypted text";
    const decrypted = aesGcmService.decrypt(legacyPlaintext);
    assert.strictEqual(decrypted, legacyPlaintext);
  });
});

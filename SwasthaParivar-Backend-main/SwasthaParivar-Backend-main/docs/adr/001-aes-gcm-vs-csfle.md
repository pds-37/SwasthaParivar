# 001 - AES-GCM vs MongoDB CSFLE for Field-Level Encryption

## Status
Accepted

## Context
SwasthaParivar V2 requires field-level encryption for Protected Health Information (PHI) stored in MongoDB, such as report summaries and medical notes. We need a solution that balances robust security, maintainability, and infrastructure constraints.

We evaluated three options:
1. **mongoose-field-encryption:** A community Mongoose plugin.
2. **MongoDB CSFLE (Client-Side Field Level Encryption):** Native driver encryption.
3. **Application-Layer AES-256-GCM:** Custom Mongoose plugin leveraging Node's native `crypto`.

## Decision
We chose **Application-Layer AES-256-GCM** wrapped in a custom Mongoose plugin.

## Rationale
- **Dependency Independence:** CSFLE requires the `mongodb-client-encryption` binary driver (often a source of build issues) and Enterprise features. Our custom approach relies entirely on Node's native `crypto` module, guaranteeing a small footprint and no vendor lock-in.
- **Authenticated Encryption:** Using AES-256-GCM provides both confidentiality and authenticity. If the ciphertext is tampered with in the database, decryption will explicitly fail (auth tag mismatch), preventing attackers from injecting malicious payloads into encrypted fields.
- **Key Management:** Building this ourselves allows us to decouple the Key Management System (KMS). We can start with environment variables and seamlessly migrate to AWS KMS or HashiCorp Vault without changing the underlying MongoDB integration.
- **Searchability vs Security:** By applying encryption purely at the application layer, we maintain precise control over which fields are `RESTRICTED` (encrypted) vs `CONFIDENTIAL` (plaintext but access-controlled).

## Consequences
- We lose the ability to perform full-text searches on encrypted fields within MongoDB. This is an acceptable trade-off for protecting PHI at rest.
- We must manually rotate keys in the application layer by supporting multiple key versions in the KeyManagementService.

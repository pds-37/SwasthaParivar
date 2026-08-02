# 002 - Tamper-Evident Hash Chain for Audit Logs

## Status
Accepted

## Context
HIPAA and GDPR compliance require maintaining a strict access log of all PHI (Protected Health Information) interactions. To prevent malicious insiders (or attackers who have compromised the database) from silently deleting or altering these logs to cover their tracks, we need a tamper-evident mechanism.

## Decision
We chose to implement a **Cryptographic Hash Chain** for the `AuditLog` collection.

## Rationale
- Each `AuditLog` will store a `previousHash`.
- Its own `hash` is calculated as `SHA-256(previousHash + stringified_payload)`.
- If an attacker alters a log in the middle of the chain, or deletes a log, the subsequent `previousHash` references will no longer match the recalculated hashes, raising an immediate red flag during compliance audits.
- We will store the global "latest" hash in a `SystemState` MongoDB collection to orchestrate the chain creation across concurrent requests. 
- While `SystemState` can become a concurrency bottleneck at extremely high scale, an async queue or Redis can alleviate this later. For our current scale, a Mongoose `findOneAndUpdate` with upsert on a single document provides adequate atomicity.

## Consequences
- Deleting user data (Right to be Forgotten) cannot include physically deleting `AuditLog` records, as that breaks the hash chain. Instead, we must cryptographically anonymize the user-identifiable fields in the log while preserving the original `hash`.

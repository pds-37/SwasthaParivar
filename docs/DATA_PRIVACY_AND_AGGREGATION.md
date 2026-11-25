# Data Privacy, K-Anonymity Aggregation & DPDP Compliance

---

## 1. Zero-PII Public-Health Boundaries

The public-health intelligence layer (`EvidenceSignal`, `HealthState`, `Intervention`) must never store or expose direct patient identifiers:

1. **Keyed Pseudonymous Node IDs:** `createPseudonymousNodeId("HH", rawId)` computes a 16-character truncated HMAC-SHA-256 digest seeded by `process.env.HEALTH_SIGNAL_SALT || process.env.JWT_SECRET` ([healthStateTransformer.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/hierarchical/healthStateTransformer.js)). Raw `memberId`, `householdId`, and `userId` values are stripped before persistence.
2. **Attribute Scrubbing:** `scrubPiiObject()` in [evidenceConvergenceEngine.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/hierarchical/evidenceConvergenceEngine.js) strips `name`, `fullName`, `email`, `phone`, `mobile`, `memberId`, `householdId`, `userId`, `linkedUserId`, and `address` from signal metadata and payloads.
3. **Residential Location Coarsening:** `transformSignalToHealthState()` suppresses exact home GPS coordinates for `household` and `individual` level `HealthState` documents, retaining only pincode/district-level centroid coordinates alongside district/state tokens.

---

## 2. Spatial Isolation & K-Anonymity Guards

To prevent pincode collisions across different districts and small-group re-identification:

1. **Mandatory Dual Geo-Keying:** `isValidGeographicScope()` requires both `district.length >= 2` and a 6-digit `pincode`. `evaluateCommunityConvergence()` filters candidate signals strictly by both `pincode` and canonicalized `normalizeGeoToken(district)` ([evidenceConvergenceEngine.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/hierarchical/evidenceConvergenceEngine.js)).
2. **Minimum Aggregation Threshold (`k >= 2` Sources & Identifiers):** A community `HealthState` is only formed within a category cluster when:
   - Total signals in the evaluation window (`windowHours`, default `72`) are `>= 2`.
   - Distinct source categories (`uniqueSources.length`) are `>= 2` (e.g., `household` + `asha_worker`, `phc_clinic`, or `diagnostic_lab`).
   - Distinct reporting source identifiers (`uniqueIdentifiers.size`) are `>= 2`.
   - Calculated convergence confidence meets `>= 0.35`.

---

## 3. DPDP Right to Access (`/api/account/me/export`)

Implemented in [accountPrivacyService.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/account/accountPrivacyService.js) and [routes/account.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/routes/account.js):

- **Authorized Member Scope:** Uses `buildAuthorizedMemberScopeQuery(userId, activeHouseholdId)` instead of legacy `ownerId`-only filters.
- **Active Health Vitals Coverage:** Exports `activeHealthSnapshots` (aliased also as `healthRecords` alongside `legacyHealthRecords`) extracted via `FamilyMemberService.buildSnapshotTimeline()`, preserving `bloodPressure`, `heartRate`, `bloodSugar`, `spO2`, `weight`, `sleep`, `steps`, and `source` tags (`manual`, `ble_device`, `ble_simulated`).
- **Secret Redaction:** Explicitly excludes `password`, `refreshTokenHash`, `refreshTokenExpiresAt`, `pushSubscriptions`, `googleId`, invite `tokenHash`, `Report.fileBuffer`, and internal `Report.storageKey` paths.

---

## 4. DPDP Right to Erasure (`DELETE /api/account/me`)

`deleteUserAccountData(userId)` performs complete coordinated cleanup:

1. Deletes remote report objects from private S3/Cloudflare R2 (`reportStorageService.deleteReportObject()`) before removing `Report` metadata rows.
2. Anonymizes tamper-evident audit records (`auditLoggerService.anonymizeUserLogs(userId)`), and nullifies/redacts PII references in `SecurityEvent`, `PromptLog`, and `MLPredictionAudit`.
3. Deletes authentication `Session` tokens and `ThreatScore` records, personal `FamilyMember` profiles (`user`, `linkedUserId`, `managedByUserId`), `HealthRecord`, `Reminder`, `Report`, AI logs/memories/insights, `SymptomEpisode`, `DoctorPacket`, `Consent`, `HouseholdInvite`, `HouseholdMembership`, and the `User` record.
4. Safely transfers ownership (`promoteNextHouseholdOwner`) to the earliest active remaining household member—or deletes empty households—without erasing surviving household members' unrelated records.

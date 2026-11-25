# Hierarchical Health Data Pipeline

This document describes the end-to-end individual-to-population clinical data flow connected during Phase 2 remediation.

---

## 1. End-to-End Architecture

```text
Manual Vital Entry / Web Bluetooth GATT (src/lib/bleGatt.js)
        │
        ▼
MemberHealthService.create()  [services/health/MemberHealthService.js]
        │  1. Validates via FamilyMemberService.sanitizeSnapshotPayload()
        │  2. Persists FamilyMember.health arrays (preserving `source` & `spO2`)
        │  3. Evaluates badges via checkAndAwardBadges()
        │
        ▼  (Fault-isolated post-save bridge; personal write never fails on downstream error)
evidenceConvergenceEngine.processHouseholdVitalTelemetry()
        │  4. Validates geographic scope (`district` >= 2 chars + 6-digit `pincode`)
        │  5. Runs trend anomaly detector: buildHealthTrends() [services/health/healthTrendService.js]
        │  6. Classifies clinical syndrome & computes severity (`0.05`..`1.0`)
        │  7. Maps continuous score -> band via authoritative getSeverityBand()
        │  8. Builds deterministic SHA-256 `dedupKey` (`householdId` + `memberId` + `dateIso` + metrics)
        │  9. Hashes household/member identifier into keyed HMAC token (`HH-<16 hex>`)
        │ 10. Retries transient DB failures up to `maxRetries = 2` (or records `BASELINE_NORMAL`)
        │
        ▼
EvidenceSignal (sourceType: "household", PII stripped, unique sparse dedupKey)
        │
        ▼
HealthState (level: "household", de-identified nodeId, provenance metadata)
        │
        ▼  (Multi-source district + pincode convergence with k-anonymity guard)
evaluateCommunityConvergence()  ->  Community HealthState (level: "community")
        │
        ▼
stateTransitionEngine  ->  Capacity Deficit Index  ->  interventionEngine
        │                                                       │
        └────────── Closed-Loop Feedback (Delta_H) ◄────────────┘
```

---

## 2. Supported Individual Vital Metrics

1. **Blood Pressure (`bloodPressure` `"sys/dia"` or numeric `bpSystolic` / `bpDiastolic`)** — parsed uniformly by `parseBloodPressureReading()` and `normalizeVitalMetrics()` in [healthStateTransformer.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/hierarchical/healthStateTransformer.js).
2. **Heart Rate (`heartRate`)**
3. **Blood Glucose (`bloodSugar`)**
4. **Oxygen Saturation (`spO2`)** — values `< 92%` classify into `ACUTE_RESPIRATORY_SURGE`; `<= 90%` adds `+0.45` severity score and `< 94%` adds `+0.25`.
5. **Weight (`weight`)** — flags abrupt shifts (>5% within 30 days) in `healthTrendService.js` and extreme bounds (`< 25` or `> 180` kg) in `METABOLIC_CHRONIC`.
6. **BLE-Originated Readings (`source: "ble_device"` / `"ble_simulated"`)** — carries higher ingestion confidence (`0.78` vs `0.62` manual) while using the same validated clinical pathway.

---

## 3. Authoritative Severity Classification & Closed-Loop Updates

`getSeverityBand(score)` in [healthStateTransformer.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/hierarchical/healthStateTransformer.js) is the single source of truth across signal transformation, community convergence, and closed-loop intervention feedback:

| `severityScore` Range | `severity` Band |
|---|---|
| `>= 0.75` | `CRITICAL` |
| `>= 0.50` and `< 0.75` | `HIGH` |
| `>= 0.30` and `< 0.50` | `MODERATE` |
| `< 0.30` (or non-finite) | `LOW` |

During feedback evaluation ([closedLoopFeedbackService.js](file:///e:/Personal%20Docs%20%26%20Projects/Projects/Swastha%20Parivar/SwasthaParivar-Backend-main/SwasthaParivar-Backend-main/services/interventions/closedLoopFeedbackService.js)), `Delta_H = postInterventionSeverity - baselineSeverity` recomputes `healthState.severity = getSeverityBand(postInterventionSeverity)` on every transition (`DE_ESCALATED`, `ESCALATED`, `MAINTAINED`) and appends a timestamped entry to `healthState.metadata.transitionHistory`.

---

## 4. Fault Isolation & Idempotency

- `MemberHealthService.create()` commits `FamilyMember.health` first and wraps telemetry emission in a `try/catch` block. Even if MongoDB telemetry collections fail persistently (`FAILED_ISOLATED`), the user's personal health record and HTTP `201` response remain intact.
- Duplicate measurement replays produce the same `dedupKey`; `ingestEvidenceSignal()` catches Mongo duplicate-key conflicts (`code === 11000`) and returns the existing `EvidenceSignal` idempotently.
- Normal readings (`severityScore <= 0.25` and empty `trendFlags.length === 0`) avoid flooding `EvidenceSignal` and de-escalate prior active household `HealthState` anomalies to `DE_ESCALATED`.

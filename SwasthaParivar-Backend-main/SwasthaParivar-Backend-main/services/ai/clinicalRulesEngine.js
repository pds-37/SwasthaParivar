import MLPredictionAudit from "../../models/mlpredictionaudit.js";
import { logger } from "../../utils/logger.js";

const RED_FLAG_RULES = [
  {
    id: "chest_pain",
    level: "EMERGENCY",
    tier: "EMERGENCY",
    pattern: /\b(chest pain|chest tightness|heart attack|pressure in chest)\b/i,
    warning: "Chest pain or chest pressure can be an emergency.",
    action: "Call emergency services or go to the nearest emergency department now.",
  },
  {
    id: "breathing_trouble",
    level: "EMERGENCY",
    tier: "EMERGENCY",
    pattern: /\b(can't breathe|cannot breathe|difficulty breathing|severe breathlessness|blue lips|gasping)\b/i,
    warning: "Severe breathing difficulty is an emergency warning sign.",
    action: "Call emergency services immediately.",
  },
  {
    id: "stroke_signs",
    level: "EMERGENCY",
    tier: "EMERGENCY",
    pattern: /\b(face drooping|slurred speech|one-sided weakness|one sided weakness|stroke|sudden numbness)\b/i,
    warning: "Stroke-like symptoms need immediate emergency care.",
    action: "Call emergency services immediately. Do not wait for symptoms to improve.",
  },
  {
    id: "self_harm",
    level: "EMERGENCY",
    tier: "EMERGENCY",
    pattern: /\b(suicidal|suicide|self-harm|self harm|want to die|kill myself)\b/i,
    warning: "Self-harm or suicide language needs immediate human support.",
    action: "Contact emergency services or a crisis helpline now and stay with a trusted person.",
  },
  {
    id: "severe_bleeding",
    level: "EMERGENCY",
    tier: "EMERGENCY",
    pattern: /\b(severe bleeding|bleeding heavily|vomiting blood|blood in vomit|black stool)\b/i,
    warning: "Heavy bleeding or blood in vomit/stool can be dangerous.",
    action: "Seek urgent medical care immediately.",
  },
];

const CONTEXT_RULES = [
  {
    id: "infant_fever",
    level: "HIGH",
    tier: "DOCTOR",
    when: ({ text, member }) =>
      Number(member?.age) < 1 && /\b(fever|temperature|not feeding|lethargic|trouble breathing)\b/i.test(text),
    warning: "Fever or poor feeding in an infant needs a low threshold for urgent medical review.",
    action: "Contact a pediatrician or urgent care now.",
  },
  {
    id: "pregnancy_warning_symptoms",
    level: "HIGH",
    tier: "DOCTOR",
    when: ({ text, member }) =>
      ["pregnant", "postpartum"].includes(member?.pregnancyStatus) &&
      /\b(fever|bleeding|severe headache|vision|swelling|abdominal pain|faint|dizziness)\b/i.test(text),
    warning: "Pregnancy or postpartum symptoms can need prompt clinician review.",
    action: "Contact the OB-GYN or urgent care today.",
  },
  {
    id: "diabetes_vomiting_dizziness",
    level: "HIGH",
    tier: "DOCTOR",
    when: ({ text, member }) =>
      hasCondition(member, ["diabetes", "diabetic"]) &&
      /\b(vomit|vomiting|dizziness|dizzy|confusion|dehydration|not eating|low sugar|high sugar)\b/i.test(text),
    warning: "Diabetes plus vomiting, dizziness, dehydration, or abnormal sugar readings can become unsafe.",
    action: "Check glucose if possible and contact a doctor today.",
  },
  {
    id: "hypertension_neuro_headache",
    level: "HIGH",
    tier: "DOCTOR",
    when: ({ text, member }) =>
      hasCondition(member, ["hypertension", "high bp", "blood pressure"]) &&
      /\b(severe headache|vision|dizziness|chest pain|shortness of breath|weakness)\b/i.test(text),
    warning: "Hypertension with severe headache, vision symptoms, chest pain, or breathlessness can be high risk.",
    action: "Check BP and seek urgent medical advice if symptoms are severe or BP is very high.",
  },
  {
    id: "asthma_breathing",
    level: "HIGH",
    tier: "DOCTOR",
    when: ({ text, member }) =>
      hasCondition(member, ["asthma", "copd"]) &&
      /\b(wheezing|breathless|shortness of breath|oxygen|spo2|cough)\b/i.test(text),
    warning: "Breathing symptoms in asthma/COPD need careful monitoring and may need medical care.",
    action: "Use the prescribed action plan if available and seek care if breathing worsens.",
  },
  {
    id: "persistent_symptoms",
    level: "MODERATE",
    tier: "DOCTOR",
    when: ({ text }) =>
      /\b(\d+\s*(week|weeks|month|months|year|years)|few\s+(week|weeks|month|months|year|years)|persistent|recurring|keeps coming back)\b/i.test(text),
    warning: "Persistent or recurring symptoms should be reviewed instead of treated as a one-off episode.",
    action: "Prepare a symptom timeline and arrange a non-emergency doctor review.",
  },
];

function hasCondition(member, candidates = []) {
  const haystack = [
    ...(member?.conditions || []),
    ...(member?.medications || []),
    member?.baselinePreferences?.notes || "",
  ]
    .join(" ")
    .toLowerCase();

  return candidates.some((candidate) => haystack.includes(candidate));
}

const severityRank = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  EMERGENCY: 4,
};

const tierRank = {
  HOME_CARE: 1,
  DOCTOR: 2,
  EMERGENCY: 3,
};

function maxByRank(current, next, rank) {
  return rank[next] > rank[current] ? next : current;
}

function isTrendRelevant(text = "", flag = {}) {
  const normalized = String(text || "").toLowerCase();

  if (flag.metric === "bloodSugar") {
    return /\b(blood sugar|glucose|diabetes|diabetic|sugar|dizz|faint|confusion|sweat|shaky|vomit|not eating|weakness)\b/i.test(normalized);
  }

  if (flag.metric === "bloodPressure") {
    return /\b(bp|blood pressure|hypertension|severe headache|vision|chest pain|shortness of breath|dizz|weakness)\b/i.test(normalized);
  }

  if (flag.metric === "heartRate") {
    return /\b(heart rate|pulse|palpitation|chest pain|shortness of breath|dizz|faint)\b/i.test(normalized);
  }

  if (flag.metric === "sleep") {
    return /\b(sleep|insomnia|fatigue|tired|headache|stress)\b/i.test(normalized);
  }

  return false;
}

/**
 * Neuro-Symbolic Triage Reconciliation:
 * Compares empirical ML statistical classifications against absolute deterministic safety rules.
 * The Clinical Rules Engine acts as the supreme clinical authority.
 */
function reconcileMlWithRules(ruleLevel, ruleTier, mlPrediction = {}, matchedRules = []) {
  if (!mlPrediction || !mlPrediction.mlAvailable || mlPrediction.prediction === "MODEL_NOT_READY") {
    return {
      finalLevel: ruleLevel,
      finalTier: ruleTier,
      verdict: "NOT_APPLICABLE",
      reasoning: "ML prediction engine offline or warming up; strictly relying on deterministic Clinical Rules Engine.",
    };
  }

  const rfRisk = mlPrediction.prediction;
  const prob = Number(mlPrediction.probability || 0);

  // RULE OVERRIDE: If acute red flags trigger EMERGENCY (e.g. active chest pain or stroke signs),
  // but ML predicts LOW or MEDIUM risk due to historically benign vitals, deterministic safety rules OVERRIDE completely.
  if (ruleLevel === "EMERGENCY" && (rfRisk === "LOW_RISK" || rfRisk === "MEDIUM_RISK")) {
    return {
      finalLevel: "EMERGENCY",
      finalTier: "EMERGENCY",
      verdict: "OVERRIDDEN",
      reasoning: "Acute emergency life-threat regex patterns triggered. Clinical Rules Engine overrode ML historical risk estimate to protect patient safety.",
    };
  }

  // RULE UPGRADE: If deterministic rules evaluate LOW/MODERATE, but Random Forest classifies HIGH_RISK (prob > 0.65)
  // due to dangerous underlying chronic disease and polypharmacy interactions, we UPGRADE severity.
  if (rfRisk === "HIGH_RISK" && (ruleLevel === "LOW" || ruleLevel === "MODERATE")) {
    matchedRules.push({
      id: "ml_high_risk_consensus",
      warning: `AI Machine Learning diagnostic consensus classifies elevated risk (Calibrated probability: ${(prob * 100).toFixed(1)}%).`,
      action: "Schedule a comprehensive clinical review with your attending healthcare provider.",
      level: "HIGH",
      tier: "DOCTOR",
    });

    return {
      finalLevel: "HIGH",
      finalTier: maxByRank(ruleTier, "DOCTOR", tierRank),
      verdict: "UPGRADED",
      reasoning: `ML Random Forest detected severe underlying physiological stress (P=${prob.toFixed(2)}). Upgraded triage severity to HIGH/DOCTOR.`,
    };
  }

  // RULE DOWNGRADE: If deterministic rules trigger MODERATE due to generic symptom duration,
  // but calibrated ML prediction confirms LOW_RISK with exceptional adherence and vitals, flag as DOWNGRADED or maintained.
  if (ruleLevel === "MODERATE" && rfRisk === "LOW_RISK" && prob < 0.20) {
    return {
      finalLevel: "MODERATE", // Keep moderate safety tier, but mark clinical reconciliation as downgraded urgency
      finalTier: ruleTier,
      verdict: "DOWNGRADED",
      reasoning: "ML physiological model confirms Low Risk (P < 0.20), attenuating acute urgency of persistent symptom warning.",
    };
  }

  // CONCURRENCE: Rules and ML coincide closely in severity evaluation.
  return {
    finalLevel: ruleLevel,
    finalTier: ruleTier,
    verdict: "ACCEPTED",
    reasoning: `Deterministic clinical rules and ML Random Forest prediction (${rfRisk}) are in clinical consensus.`,
  };
}

export function evaluateClinicalRules({ message = "", member = {}, trends = {}, mlPrediction = null, userId = null } = {}) {
  const text = String(message || "");
  const matchedRules = [];
  let level = "LOW";
  let tier = "HOME_CARE";

  RED_FLAG_RULES.forEach((rule) => {
    if (rule.pattern.test(text)) {
      matchedRules.push(rule);
      level = maxByRank(level, rule.level, severityRank);
      tier = maxByRank(tier, rule.tier, tierRank);
    }
  });

  CONTEXT_RULES.forEach((rule) => {
    if (rule.when({ text, member, trends })) {
      matchedRules.push(rule);
      level = maxByRank(level, rule.level, severityRank);
      tier = maxByRank(tier, rule.tier, tierRank);
    }
  });

  const relevantTrendFlags = Array.isArray(trends?.flags)
    ? trends.flags.filter((flag) => isTrendRelevant(text, flag))
    : [];

  if (relevantTrendFlags.length) {
    const severeTrend = relevantTrendFlags.some((flag) => flag.severity === "high");
    const moderateTrend = relevantTrendFlags.some((flag) => flag.severity === "moderate");

    if (severeTrend) {
      level = maxByRank(level, "HIGH", severityRank);
      tier = maxByRank(tier, "DOCTOR", tierRank);
    } else if (moderateTrend) {
      level = maxByRank(level, "MODERATE", severityRank);
    }
  }

  // Perform supreme rule engine reconciliation against ML prediction vectors
  const mlReconciliation = reconcileMlWithRules(level, tier, mlPrediction, matchedRules);

  const finalLevel = mlReconciliation.finalLevel;
  const finalTier = mlReconciliation.finalTier;

  // Issue 2: Deterministic audit update targeting exact auditRecordId by primary key without race conditions or duplicates
  if (mlPrediction?.auditRecordId && mlReconciliation.verdict !== "ACCEPTED" && mlReconciliation.verdict !== "NOT_APPLICABLE") {
    Promise.resolve().then(() =>
      MLPredictionAudit.findByIdAndUpdate(
        mlPrediction.auditRecordId,
        { $set: { clinicalOverrideStatus: mlReconciliation.verdict } },
        { new: true }
      )
    ).catch((e) => logger.error({ err: e?.message, auditRecordId: mlPrediction.auditRecordId }, "Failed to update ML prediction audit override status"));
  }

  return {
    level: finalLevel,
    tier: finalTier,
    matchedRules: matchedRules.map((rule) => ({
      id: rule.id,
      warning: rule.warning,
      action: rule.action,
      level: rule.level,
      tier: rule.tier,
    })),
    warnings: matchedRules.map((rule) => rule.warning),
    actions: matchedRules.map((rule) => rule.action),
    mlAnalysis: {
      available: Boolean(mlPrediction?.mlAvailable),
      auditRecordId: mlPrediction?.auditRecordId || null,
      rfRisk: mlPrediction?.prediction || "MODEL_NOT_READY",
      logisticProbability: Number(mlPrediction?.probability ?? 0.0),
      decisionPath: Array.isArray(mlPrediction?.decisionPath) ? mlPrediction.decisionPath : ["No decision explanation available."],
      verdict: mlReconciliation.verdict,
      reasoning: mlReconciliation.reasoning,
      modelVersion: mlPrediction?.modelVersion || "offline-fallback",
    },
  };
}

export default {
  evaluateClinicalRules,
};

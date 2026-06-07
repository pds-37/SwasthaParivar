import test from "node:test";
import assert from "node:assert/strict";

import {
  assessContextualTriage,
  assessRisk,
  buildContextualCollectedData,
  buildFallbackResponse,
  buildIntakePrompt,
  buildIntakeQuestions,
  hasRecentIntakePrompt,
  mergeRisk,
  shouldAskIntakeBeforeAnswer,
  triageCheck,
} from "../aiOrchestrator.js";
import { retrieveClinicalKnowledge } from "../services/ai/clinicalKnowledgeService.js";
import { evaluateClinicalRules } from "../services/ai/clinicalRulesEngine.js";
import { buildHealthTrends } from "../services/health/healthTrendService.js";

test("emergency symptom text stops routine AI processing", () => {
  const result = triageCheck("My father has chest pain and difficulty breathing", 62);

  assert.equal(result.stopProcessing, true);
  assert.match(result.response, /112|emergency/i);
});

test("red flag screening prompts do not trigger emergency by keyword alone", () => {
  const screeningPrompt =
    "Are there any severe warning signs right now, such as trouble breathing, chest pain, confusion, fainting, severe weakness, or one-sided numbness?";
  const result = triageCheck(screeningPrompt, 32);
  const risk = assessRisk(screeningPrompt, { name: "Priyanshu", conditions: [], allergies: [], medications: [] });

  assert.equal(result.stopProcessing, false);
  assert.equal(risk.level, "LOW");
});

test("infant fever is escalated by deterministic clinical rules", () => {
  const member = { name: "Baby", age: 0.4, conditions: [], allergies: [], medications: [] };
  const clinicalRules = evaluateClinicalRules({
    message: "Baby has fever and is not feeding",
    member,
  });

  assert.equal(clinicalRules.level, "HIGH");
  assert.equal(clinicalRules.tier, "DOCTOR");
  assert.ok(clinicalRules.matchedRules.some((rule) => rule.id === "infant_fever"));
});

test("contextual triage prioritizes emergency clinical rules over base risk", () => {
  const member = { name: "Ravi", age: 58, conditions: ["hypertension"], allergies: [], medications: [] };
  const clinicalRules = evaluateClinicalRules({
    message: "Ravi has pressure in chest and sweating",
    member,
  });
  const risk = mergeRisk(assessRisk("pressure in chest and sweating", member), clinicalRules);
  const triage = assessContextualTriage({
    message: "pressure in chest and sweating",
    member,
    collectedData: buildContextualCollectedData(member, {}),
    risk,
    clinicalRules,
  });

  assert.equal(risk.level, "EMERGENCY");
  assert.equal(triage.tier, "EMERGENCY");
  assert.match(triage.action, /emergency/i);
});

test("health trends produce high severity flags for dangerous readings", () => {
  const trends = buildHealthTrends({
    health: {
      bloodPressure: [
        { value: "132/86", date: "2026-05-29" },
        { value: "185/122", date: "2026-06-02" },
      ],
      bloodSugar: [{ value: "62", date: "2026-06-02" }],
      heartRate: [{ value: "124", date: "2026-06-02" }],
    },
  });

  assert.ok(trends.flags.some((flag) => flag.metric === "bloodPressure" && flag.severity === "high"));
  assert.ok(trends.flags.some((flag) => flag.metric === "bloodSugar" && flag.severity === "high"));
  assert.match(trends.summary, /very high range|low/i);
});

test("clinical knowledge retrieval uses profile context for medicine safety", () => {
  const entries = retrieveClinicalKnowledge("Can I take this tablet?", {
    allergies: ["penicillin"],
    medications: ["metformin"],
    conditions: ["diabetes"],
  });

  const titles = entries.map((entry) => entry.title);
  assert.ok(titles.includes("Medicine safety"));
  assert.ok(titles.includes("Diabetes sick-day safety"));
});

test("fallback response keeps doctor guidance when model is unavailable", () => {
  const response = buildFallbackResponse(
    "vomiting and dizziness",
    { name: "Anita" },
    { level: "HIGH" },
    {
      clinicalRules: {
        warnings: ["Diabetes plus vomiting, dizziness, dehydration, or abnormal sugar readings can become unsafe."],
      },
      healthTrends: {
        flags: [{ message: "Latest blood sugar 62 is low." }],
      },
    }
  );

  assert.match(response, /Safety note/i);
  assert.match(response, /contact a doctor today|urgent care/i);
});

test("intake questions ask for missing profile and red flags", () => {
  const questions = buildIntakeQuestions(
    "fever",
    null,
    { profileGaps: ["saved member profile"] },
    { level: "MODERATE" }
  );

  assert.ok(questions.some((question) => question.id === "profile"));
  assert.ok(questions.some((question) => question.id === "red_flags"));
});

test("AI asks intake questions before giving non-emergency guidance", () => {
  const questions = buildIntakeQuestions(
    "headache",
    { name: "Priyanshu", conditions: [], allergies: [], medications: [] },
    { profileGaps: ["known conditions", "allergies"] },
    { level: "MODERATE" }
  );
  const prompt = buildIntakePrompt(questions, { level: "MODERATE" }, { name: "Priyanshu" });

  assert.equal(shouldAskIntakeBeforeAnswer(questions, [], { level: "MODERATE" }), true);
  assert.match(prompt, /please answer these first/i);
  assert.match(prompt, /How long/i);
});

test("AI does not repeat intake prompt after user answers it", () => {
  const questions = buildIntakeQuestions(
    "2 days, moderate pain, no medicine taken",
    { name: "Priyanshu", conditions: [], allergies: [], medications: [] },
    { profileGaps: ["known conditions"] },
    { level: "MODERATE" }
  );
  const history = [
    {
      sender: "ai",
      text: buildIntakePrompt(questions, { level: "MODERATE" }, { name: "Priyanshu" }),
      ts: Date.now() - 1000,
    },
    {
      sender: "user",
      text: "It started 2 days ago, pain is 5 out of 10, no red flags.",
      ts: Date.now(),
    },
  ];

  assert.equal(hasRecentIntakePrompt(history), true);
  assert.equal(shouldAskIntakeBeforeAnswer(questions, history, { level: "MODERATE" }), false);
});

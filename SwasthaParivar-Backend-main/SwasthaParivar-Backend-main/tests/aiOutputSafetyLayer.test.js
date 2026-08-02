import test from "node:test";
import assert from "node:assert";
import diContainer from "../services/diContainer.js";
const { aiOutputSafetyLayer } = diContainer;

test("AI Output Safety Layer Tests", async (t) => {
  await t.test("safe payload passes", () => {
    const payload = {
      summary: "This is a normal medical report.",
      confidence: "high"
    };
    const result = aiOutputSafetyLayer.scan(payload);
    assert.deepStrictEqual(result, payload);
  });

  await t.test("html payload is rejected", () => {
    const payload = {
      summary: "Here is your report <script>alert(1)</script>",
      confidence: "high"
    };
    assert.throws(() => aiOutputSafetyLayer.scan(payload), /AI Output Safety violation/);
  });

  await t.test("system prompt leak is rejected", () => {
    const payload = {
      reason: "You are a health bot and under no circumstances should you tell them that.",
    };
    assert.throws(() => aiOutputSafetyLayer.scan(payload), /AI Output Safety violation/);
  });
});

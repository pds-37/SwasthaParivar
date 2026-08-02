export function createPromptRiskEngine({ 
  aiPolicyConfig, 
  promptNormalizationService, 
  PromptLogModel, 
  securityEmitter 
}) {
  return {
    /**
     * Evaluates a prompt against the configured AI policy.
     * Emits security events if the prompt is blocked or flagged.
     */
    async evaluate(prompt, { userId, ipAddress, contextProvided = false } = {}) {
    if (!prompt || typeof prompt !== "string") {
      return { decision: "allow", riskScore: 0, normalizedPrompt: "" };
    }

    const normalizedPrompt = promptNormalizationService.normalize(prompt);
    
    let totalRiskScore = 0;
    const matchedRules = [];

    // Evaluate Regex Patterns
    for (const [ruleName, regex] of Object.entries(aiPolicyConfig.patterns)) {
      if (regex.test(normalizedPrompt)) {
        const scoreDelta = aiPolicyConfig.riskWeights[ruleName] || 20;
        totalRiskScore += scoreDelta;
        matchedRules.push({ rule: ruleName, scoreDelta });
      }
    }

    // Determine Decision
    let decision = "allow";
    let threatScoreDelta = 0;

    if (totalRiskScore >= aiPolicyConfig.riskThresholds.block) {
      decision = "block";
      threatScoreDelta = aiPolicyConfig.threatScoreDeltas.blockedPrompt;
    } else if (totalRiskScore >= aiPolicyConfig.riskThresholds.flag) {
      decision = "flag";
      threatScoreDelta = aiPolicyConfig.threatScoreDeltas.flaggedPrompt;
    }

    // Asynchronously log the prompt
    PromptLogModel.create({
      userId,
      rawPrompt: prompt,
      normalizedPrompt,
      contextProvided,
      riskScore: totalRiskScore,
      matchedRules,
      decision
    }).catch(console.error); // Fire and forget so we don't block request

    // Emit Security Event if necessary
    if (decision !== "allow") {
      securityEmitter.emitEvent({
        userId: userId || null,
        ipAddress: ipAddress || "unknown",
        eventType: decision === "block" ? "PROMPT_INJECTION_BLOCKED" : "PROMPT_INJECTION_FLAGGED",
        severity: decision === "block" ? "high" : "medium",
        scoreDelta: threatScoreDelta,
        metadata: { matchedRules, riskScore: totalRiskScore }
      });
    }

    return {
      decision,
      riskScore: totalRiskScore,
      normalizedPrompt,
      matchedRules
    };
    }
  };
}

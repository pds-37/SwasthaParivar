const aiPolicyConfig = {
  // Configurable thresholds for the Prompt Risk Engine
  riskThresholds: {
    block: 70,       // If prompt scores >= 70, block the request
    flag: 40         // If prompt scores >= 40, flag for review but allow
  },

  // Weighted score assignments for different types of detected risks
  riskWeights: {
    systemPromptLeakage: 80,
    roleplayJailbreak: 60,
    ignoreInstructions: 70,
    obfuscationHigh: 40,
    obfuscationLow: 15,
    harmfulContent: 90
  },

  // Threat Score adjustments applied to the user account if they exceed the block threshold
  threatScoreDeltas: {
    blockedPrompt: 25,
    flaggedPrompt: 5
  },

  // Regex patterns to identify potential prompt injection vectors
  patterns: {
    ignoreInstructions: /(?:ignore|disregard|forget|bypass)\s+(?:all\s+)?(?:previous\s+)?(?:instructions|directions|prompts|rules)/i,
    systemPromptLeakage: /(?:system\s+prompt|developer\s+mode|core\s+instructions|what\s+are\s+your\s+rules)/i,
    roleplayJailbreak: /(?:pretend\s+you\s+are|act\s+as|DAN|do\s+anything\s+now|hypothetical)/i,
  }
};

export default aiPolicyConfig;

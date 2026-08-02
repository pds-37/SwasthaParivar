export function createAiOutputSafetyLayer() {
  const _extractStrings = (obj, strings = []) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        strings.push(obj[key]);
      } else if (obj[key] !== null && typeof obj[key] === "object") {
        _extractStrings(obj[key], strings);
      }
    }
    return strings;
  };

  return {
    /**
     * Scans string properties of an AI payload for unsafe content.
     * Runs after structural validation.
     */
    scan(payload) {
    if (!payload || typeof payload !== "object") return payload;

    const unsafePatterns = [
      /<\s*script/i,           // HTML script tags
      /javascript:/i,          // JS protocol links
      /onload\s*=/i,           // JS event handlers
      /onerror\s*=/i,
      /you\s+are\s+a\s+health\s+bot/i, // System prompt leak
      /under\s+no\s+circumstances/i,    // System prompt leak
    ];

    const stringValues = _extractStrings(payload);
    
    for (const text of stringValues) {
      for (const pattern of unsafePatterns) {
        if (pattern.test(text)) {
          throw new Error(`AI Output Safety violation: Detected unsafe pattern '${pattern}'`);
        }
      }
    }

    return payload; // Safe
  }
  };
}

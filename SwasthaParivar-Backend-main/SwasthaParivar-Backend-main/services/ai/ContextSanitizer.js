export function createContextSanitizer() {
  const sanitize = (contextText) => {
    if (!contextText || typeof contextText !== "string") return "";

    let safeText = contextText;

    // Remove anything that looks like instructions or code blocks that could break the prompt fence
    safeText = safeText.replace(/```[a-z]*\n/gi, "");
    safeText = safeText.replace(/```/g, "");

    // Strip obvious malicious injection commands that shouldn't be in a medical record anyway
    safeText = safeText.replace(/(?:ignore|disregard|forget|bypass)\s+(?:all\s+)?(?:previous\s+)?(?:instructions|directions|prompts|rules)/gi, "[REDACTED_INJECTION]");
    safeText = safeText.replace(/(?:system\s+prompt|developer\s+mode|core\s+instructions)/gi, "[REDACTED_INJECTION]");

    return safeText.trim();
  };

  return {
    sanitize,

    /**
     * Safely wraps the context in a data fence.
     */
    fence(contextText) {
      if (!contextText) return "";
      return `\n===BEGIN USER/CONTEXT DATA===\n${sanitize(contextText)}\n===END USER/CONTEXT DATA===\n`;
    }
  };
}

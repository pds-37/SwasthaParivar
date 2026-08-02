class PromptNormalizationService {
  /**
   * Normalizes a prompt by stripping out common obfuscation techniques.
   * This prepares the prompt for the Risk Engine to accurately apply its rules.
   */
  normalize(prompt) {
    if (!prompt || typeof prompt !== "string") return "";

    let normalized = prompt;

    // 1. Remove zero-width characters (e.g., ZWSP, ZWNJ, etc) used to bypass regex
    normalized = normalized.replace(/[\u200B-\u200D\uFEFF]/g, "");

    // 2. Normalize unicode (NFKC normalizes fullwidth characters, superscripts, etc)
    normalized = normalized.normalize("NFKC");

    // 3. Replace multiple spaces, tabs, and newlines with a single space to thwart spatial obfuscation
    normalized = normalized.replace(/\s+/g, " ");

    // 4. Remove invisible formatting characters and control characters
    normalized = normalized.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    // 5. Convert to lowercase for easier rule matching
    normalized = normalized.toLowerCase().trim();

    return normalized;
  }
}

const promptNormalizationService = new PromptNormalizationService();

export default promptNormalizationService;

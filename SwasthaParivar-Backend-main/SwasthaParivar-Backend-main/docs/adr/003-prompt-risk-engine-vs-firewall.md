# Architecture Decision Record (ADR) 003: Prompt Risk Engine vs Firewall

## Status
Accepted

## Context
When implementing AI integration in SwasthaParivar V2, user inputs (prompts) need to be sent to external LLMs. A simple Prompt Firewall was initially considered, which would use regular expressions to block known malicious phrases. However, LLM prompt injection techniques (e.g., character obfuscation, roleplay jails, zero-width characters) easily bypass simple string matching.

## Decision
We implemented a **Prompt Risk Engine** combined with a **Prompt Normalization Service**.
1. **Normalization**: Before evaluation, the prompt is stripped of zero-width characters, normalized to NFKC, and whitespace is collapsed to mitigate obfuscation.
2. **Weighted Risk Scoring**: Instead of binary allow/block firewall rules, the engine evaluates the prompt against multiple heuristics (e.g., system prompt leakage attempts, ignore instruction attempts). Each matched rule applies a weighted penalty to the overall risk score.
3. **Thresholds**: If the risk score exceeds a configurable policy threshold (stored in `aiPolicy.config.js`), the prompt is blocked.

## Consequences
### Positive
*   **Resilience**: Far more resilient against sophisticated prompt injections than a simple firewall.
*   **Configurability**: New rules and weights can be updated in `aiPolicy.config.js` without rewriting core logic.
*   **Integration**: Tightly integrated with the `ThreatScoreService` and `SecurityEmitter` to dynamically penalize attackers.

### Negative
*   **Performance Overhead**: Running multiple Regex evaluations across the entire prompt string adds a slight latency overhead before calling the LLM.
*   **False Positives**: Strict rules might accidentally block benign user queries that happen to contain flagged keywords.

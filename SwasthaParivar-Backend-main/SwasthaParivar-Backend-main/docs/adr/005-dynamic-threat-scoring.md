# Architecture Decision Record (ADR) 005: Dynamic Threat Scoring

## Status
Accepted

## Context
Static rate limiting (e.g., 100 requests per 15 minutes) is insufficient for modern web applications. A malicious actor could execute 99 IDOR (Insecure Direct Object Reference) attempts, or 99 prompt injections without triggering a standard rate limit. We needed a mechanism to track malicious behavior holistically and penalize bad actors in real-time.

## Decision
We implemented a **Dynamic Threat Scoring** system:
1. Every malicious action (IDOR attempt, Prompt Injection, Malicious Upload, etc.) triggers a `SecurityEvent` via the `SecurityEmitter`.
2. The `ThreatScoreService` listens to these events and applies a numerical penalty to the user's `ThreatScore` document in MongoDB.
3. If the score exceeds configured thresholds (e.g., 50 for step-up auth, 100 for auto-suspend), the system takes automated action, such as revoking all active sessions and suspending the account.
4. The Threat Score automatically decays over time (half-life every 48 hours) to prevent permanent penalization for accidental misbehavior.

## Consequences
### Positive
*   **Proactive Defense**: Automatically isolates attackers before they can succeed.
*   **Holistic Tracking**: Aggregates disparate attacks (e.g., an upload attack followed by a prompt injection attack) into a single risk profile.
*   **Asynchronous Processing**: The use of `node:events` (`SecurityEmitter`) ensures that threat scoring and database logging do not block the HTTP request/response cycle.

### Negative
*   **Complexity**: Adds stateful security tracking and background decay logic.
*   **Session State**: Auto-suspension requires invalidating server-side session tokens, which introduces complexity around maintaining a synchronized session registry.

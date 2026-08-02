# Future Extension Points

SwasthaParivar V2 has been designed using Clean Architecture and loosely coupled modules to support upcoming feature roadmaps. Below are the designated extension points for future additions.

## 1. Retrieval-Augmented Generation (RAG)
**Target File/Layer**: `services/ai/reportReviewService.js` / `ContextSanitizer.js`
*   **Concept**: In the future, the AI will answer questions by searching past medical reports.
*   **Extension Point**: A `DocumentRetrieverService` can be injected into the `aiController`. Before context is fed into the LLM, the `DocumentRetrieverService` should fetch relevant database records, pass them through the `ContextSanitizer` (to isolate user prompts from retrieved data using markdown fences), and then append them to the system prompt.

## 2. Autonomous AI Agents (Tool Use)
**Target File/Layer**: `validations/llmOutputSchemas.js` / `AiOutputSafetyLayer.js`
*   **Concept**: Allowing the LLM to trigger backend actions (e.g., booking an appointment, sending an SMS).
*   **Extension Point**: The system currently forces structured JSON outputs. To support agents, add function/tool definitions to the Gemini API call. The LLM's tool-call requests must be routed through a dedicated `ToolExecutionSafetyLayer` (extending the current `AiOutputSafetyLayer`) to ensure the AI cannot execute destructive tools (like `deleteProfile`) without user confirmation.

## 3. Telemedicine Integration
**Target File/Layer**: `middleware/abac.middleware.js`
*   **Concept**: Allowing doctors to view user profiles.
*   **Extension Point**: Currently, the ABAC middleware strictly verifies that `req.user.id === resource.userId`. To support telemedicine, a `ConsentRegistry` service can be created. The ABAC middleware can be extended to check: `isOwner(req.user.id) || hasDoctorConsent(req.user.id, resource.userId)`.

## 4. Wearable Device Data Ingestion
**Target File/Layer**: `middleware/rateLimiter.js` / `services/security/SecurityEmitter.js`
*   **Concept**: High-frequency streaming of heart rate or step data from smartwatches.
*   **Extension Point**: The current rate limiter is designed for human HTTP requests. For wearables, a separate API router (`/api/iot`) should be created with a much higher rate limit or a bulk-ingestion endpoint. Additionally, IoT data should be validated strictly by an ingestion pipeline to prevent poison-pill attacks against the database.

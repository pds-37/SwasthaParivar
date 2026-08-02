# AI Security Flow

This document details the sequence of events when a user submits a prompt to the AI. It demonstrates how the `PromptRiskEngine`, `ContextSanitizer`, and `AiOutputSafetyLayer` intercept and validate interactions to prevent prompt injection and system leakage.

## Sequence Diagram

```mermaid
sequenceDiagram
    actor User
    participant Controller as AI Controller
    participant Engine as Prompt Risk Engine
    participant Sanitizer as Context Sanitizer
    participant LLM as Gemini API
    participant SafetyLayer as AI Output Safety Layer
    participant Zod as Zod Schema Validator
    participant SecurityEmitter as Security Emitter

    User->>Controller: POST /api/ai/chat (prompt, healthContext)
    
    %% Phase 1: Context Sanitization
    Controller->>Sanitizer: fence(healthContext)
    Sanitizer-->>Controller: [sanitized context]

    %% Phase 2: Input Risk Evaluation
    Controller->>Engine: evaluate(prompt)
    Engine->>Engine: Normalize prompt (strip whitespace, zero-width chars)
    Engine->>Engine: Evaluate against heuristic rules
    
    alt is riskScore > threshold
        Engine-->>Controller: Decision: BLOCK
        Engine->>SecurityEmitter: emit('security_event', PROMPT_INJECTION)
        SecurityEmitter-->>ThreatScore: increment score
        Controller-->>User: 403 Forbidden (Security Block)
    else is riskScore <= threshold
        Engine-->>Controller: Decision: ALLOW
        
        %% Phase 3: LLM Execution
        Controller->>LLM: Generate Content (prompt + context)
        LLM-->>Controller: Raw JSON response
        
        %% Phase 4: Validation and Safety Scanning
        Controller->>Zod: parse(raw json)
        Zod-->>Controller: Validated Object
        
        Controller->>SafetyLayer: scan(Validated Object)
        SafetyLayer->>SafetyLayer: Check for HTML, JS, System Prompt Leak
        
        alt if unsafe output detected
            SafetyLayer-->>Controller: Error (Unsafe output)
            Controller-->>User: 500 Internal Server Error
        else if safe
            SafetyLayer-->>Controller: Safe Object
            Controller-->>User: 200 OK (AI Response)
        end
    end
```

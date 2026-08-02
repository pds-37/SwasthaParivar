# High-Level System Design (HLD): SwasthaParivar V1

This document outlines the original architecture and system design for SwasthaParivar V1, before the introduction of advanced enterprise security, Zero Trust patterns, or AI safety features.

---

## 1. High-Level Architecture
SwasthaParivar V1 follows a standard monolithic client-server architecture (MERN stack without React Native). The React frontend communicates with a monolithic Express.js REST API, which persists data to MongoDB. The backend also makes external HTTP calls to the Google Gemini API to power the AI Health Chatbot.

## 2. System Context Diagram
```mermaid
C4Context
    title System Context Diagram - SwasthaParivar V1

    Person(user, "User", "Patient managing their family health data.")
    
    System(swastha, "SwasthaParivar V1", "Core application providing health tracking, family management, and AI chat.")
    
    System_Ext(gemini, "Google Gemini API", "External LLM providing health insights and answering medical queries.")
    
    Rel(user, swastha, "Manages profiles, uploads reports, asks questions", "HTTPS")
    Rel(swastha, gemini, "Forwards user prompts and health context", "HTTPS")
```

## 3. Container Diagram
```mermaid
C4Container
    title Container Diagram - SwasthaParivar V1

    Person(user, "User", "Accesses the application via web browser.")

    System_Boundary(c1, "SwasthaParivar") {
        Container(frontend, "Frontend SPA", "React.js, Vite, Material UI", "Provides the user interface for family and health management.")
        
        Container(backend, "Backend API", "Node.js, Express.js", "Handles business logic, routing, standard authentication, and AI API calls.")
        
        ContainerDb(db, "Database", "MongoDB", "Stores users, family profiles, medical records, and chats.")
    }

    System_Ext(gemini, "Google Gemini API", "LLM Provider")

    Rel(user, frontend, "Interacts with UI", "HTTPS")
    Rel(frontend, backend, "Makes API calls", "JSON/HTTPS")
    Rel(backend, db, "Reads/Writes data", "Mongoose")
    Rel(backend, gemini, "Sends prompts & retrieves text", "HTTPS")
```

## 4. Frontend Architecture
*   **Framework**: React.js bundled with Vite.
*   **UI Library**: Material UI (MUI) for rapid component development.
*   **State Management**: React Context / Hooks for managing user sessions and UI state.
*   **Routing**: React Router.
*   **Responsibilities**:
    *   Rendering dashboards and profile management views.
    *   Managing form state for Medical Record uploads.
    *   Maintaining the chat interface for the AI Health Chatbot.
    *   Storing standard JWT tokens in local storage for session persistence.

## 5. Backend Architecture
*   **Framework**: Express.js running on Node.js.
*   **Architecture Pattern**: Basic MVC (Model-View-Controller) / Monolith.
*   **Responsibilities**:
    *   Serving RESTful API endpoints.
    *   Authenticating users via standard JWT implementation.
    *   Storing and retrieving user and family data from MongoDB.
    *   Handling base64 file uploads for medical records.
    *   Acting as a proxy to the Google Gemini API for the chatbot feature.

## 6. Database Design
MongoDB is used as the primary data store, managed via Mongoose schemas.
*   **Users**: Stores user credentials and basic account info.
*   **Members/Profiles**: Stores family members associated with a parent User account.
*   **Medical Records**: Stores references/base64 strings of uploaded reports, linked to specific profiles.
*   **Reminders**: Stores medicine and vaccination reminder schedules.

## 7. API Flow
```mermaid
sequenceDiagram
    participant Client as Frontend (React)
    participant Express as Backend (Express.js)
    participant DB as MongoDB

    Client->>Express: GET /api/members (with JWT)
    Express->>Express: Validate JWT (Auth Middleware)
    Express->>DB: find({ userId })
    DB-->>Express: Returns Members Array
    Express-->>Client: 200 OK (JSON)
```

## 8. AI Chatbot Flow
The AI chatbot in V1 directly forwards user queries and basic health context to the Gemini API without advanced sanitization or prompt injection protection.

```mermaid
sequenceDiagram
    participant User
    participant Backend as Backend API
    participant Gemini as Gemini API

    User->>Backend: POST /api/chat { prompt, context }
    Backend->>Backend: Construct simple prompt string
    Backend->>Gemini: generateContent(prompt)
    Gemini-->>Backend: LLM Text Response
    Backend-->>User: Returns LLM Response directly
```

## 9. File Upload Flow
```mermaid
sequenceDiagram
    participant User
    participant Backend as Backend API
    participant DB as MongoDB

    User->>Backend: POST /api/reports (Base64 file string)
    Backend->>Backend: Basic MIME type check
    Backend->>DB: Save Base64 payload in Medical Records collection
    DB-->>Backend: Success
    Backend-->>User: 201 Created
```

## 10. Deployment Architecture
*   **Frontend Environment**: Vercel (CI/CD connected to the GitHub repository for automatic builds).
*   **Backend Environment**: Render (Hosts the Node.js Express server).
*   **Database**: MongoDB Atlas (Cloud-hosted MongoDB).

## 11. Request Lifecycle
1.  **Request Initiation**: The frontend sends an HTTP request (with a JWT in the `Authorization` header) to a Render backend endpoint.
2.  **Basic Middleware**: Express parses the JSON body.
3.  **Authentication**: A simple JWT verification middleware checks the token signature.
4.  **Controller Execution**: The route handler processes the request (e.g., querying MongoDB).
5.  **Response**: A JSON payload is returned to the frontend.

## 12. Sequence Diagrams
*(Included natively in sections 7, 8, and 9 above for context-specific flows).*

## 13. Folder Structure
A traditional flat MVC structure:
```text
/src
  /controllers     # HTTP request handlers
  /models          # Mongoose schemas
  /routes          # Express router definitions
  /middleware      # Basic JWT auth middleware
  /utils           # Helper functions
  server.js        # Express app entry point
```

---

## Known Limitations of V1

This architecture represents an early MVP phase of SwasthaParivar. It lacks several critical layers necessary for a secure, enterprise-grade healthcare application:

*   **Enterprise Security**: Lacks a comprehensive "Security Floor" (no advanced Helmet configurations, rate limiting, or request sanitization).
*   **AI Security**: The chatbot directly passes user input to the LLM, making it highly vulnerable to Prompt Injections, system prompt leakage, and jailbreaks. There is no AI Output Safety Layer to prevent malicious code or dangerous medical advice from being returned to the user.
*   **Advanced Authorization**: Relies entirely on basic JWT validation without robust Role-Based Access Control (RBAC) or Attribute-Based Access Control (ABAC) to strictly enforce resource ownership, leaving the system vulnerable to Insecure Direct Object Reference (IDOR) attacks.
*   **Encryption at Rest**: Personal Health Information (PHI) and medical records are stored in plaintext in the database. If the database is compromised, sensitive medical data is entirely exposed.
*   **Threat Detection**: No mechanisms exist to detect, track, or auto-suspend malicious actors aggressively probing the system.
*   **Audit Logging**: The system does not maintain tamper-evident audit trails for when sensitive medical records are accessed, created, or deleted.
*   **Privacy Controls**: Lacks granular, versioned consent management for users to opt-in or opt-out of their data being processed by external AI providers.

# System Overview: SwasthaParivar V2

## 1. Business Overview
SwasthaParivar V2 is a secure, privacy-first family health management platform designed to empower individuals to track and understand their family's health data. It allows users to digitize medical records (lab reports, prescriptions, scans), track symptoms, manage medications, and receive AI-driven insights into their health data in a highly secure environment. The platform focuses on maintaining absolute patient confidentiality and mitigating threats such as unauthorized access, data leaks, and AI prompt injections.

## 2. Functional Requirements
*   **User & Family Management**: Users can create accounts, manage profiles, and add family members with distinct health profiles.
*   **Medical Record Digitization**: Secure upload and storage of medical documents (PDFs, images).
*   **AI-Powered Insights**: An intelligent assistant capable of reviewing reports, triaging symptoms, and answering health questions based on the user's specific context.
*   **Security & Auditing**: Immutable audit trails for all actions involving Personal Health Information (PHI).
*   **Consent Management**: Granular tracking of user consent for AI processing.

## 3. Non-Functional Requirements
*   **Security (Zero Trust Base)**: All data access must be explicitly authorized. Malicious behavior must be tracked and auto-penalized.
*   **Privacy (HIPAA/GDPR Alignment)**: Sensitive medical data must be encrypted at rest (AES-256-GCM) and in transit.
*   **Scalability**: The backend must handle horizontal scaling seamlessly.
*   **Maintainability**: Code must adhere to Clean Architecture, SOLID principles, and use Factory-based Dependency Injection.
*   **Performance**: AI processing must happen asynchronously where possible to avoid blocking the Node.js event loop.

## 4. Technology Stack
*   **Backend Runtime**: Node.js
*   **Web Framework**: Express.js
*   **Database**: MongoDB (Mongoose ODM)
*   **AI/LLM Provider**: Google Generative AI (Gemini APIs)
*   **Cryptography**: Node.js native `crypto` module (AES-256-GCM, SHA-256)
*   **Validation**: Zod (for strict schema validation of AI outputs and request payloads)
*   **Architecture Pattern**: Clean Architecture with Factory-based Dependency Injection

## 5. Design Principles
*   **Security by Default**: Opt-in data sharing; data is assumed sensitive unless specified otherwise.
*   **Defense in Depth**: Layered security middleware (Helmet -> Rate Limiting -> Sanitization -> Auth -> RBAC -> ABAC).
*   **Fail-Safe Defaults**: If a security check fails or times out, access is denied.
*   **Separation of Concerns**: Controllers handle HTTP logic, Services handle business logic, and Repositories (Models) handle data access.

---

## 6. C4 Model Diagrams

### 6.1 Level 1: System Context Diagram
This diagram shows the high-level interactions between the users, the SwasthaParivar system, and external third-party services.

```mermaid
C4Context
    title System Context diagram for SwasthaParivar V2

    Person(patient, "Patient / User", "A user managing their family's health records and seeking AI insights.")
    Person(doctor, "Healthcare Provider", "A doctor accessing patient data (Future Scope).")
    
    System(swastha, "SwasthaParivar V2", "Allows users to manage health records, family profiles, and receive AI-driven health insights securely.")
    
    System_Ext(gemini, "Google Gemini API", "Provides Large Language Model capabilities for report summarization and symptom triage.")
    System_Ext(cloudStorage, "Cloud Object Storage", "Stores encrypted medical document uploads (e.g., AWS S3).")

    Rel(patient, swastha, "Uploads reports, asks health questions", "HTTPS/REST")
    Rel(doctor, swastha, "Views patient history with consent", "HTTPS/REST")
    
    Rel(swastha, gemini, "Sends sanitized prompts & receives structured health insights", "HTTPS")
    Rel(swastha, cloudStorage, "Stores/Retrieves encrypted files", "HTTPS")
```

### 6.2 Level 2: Container Diagram
This diagram zooms into the SwasthaParivar system to show its primary deployable containers and how they interact.

```mermaid
C4Container
    title Container diagram for SwasthaParivar V2

    Person(patient, "Patient / User", "User of the mobile/web app")

    System_Boundary(c1, "SwasthaParivar System") {
        Container(spa, "Single-Page Application", "React/Vite", "Provides the user interface for patients.")
        
        Container(api_gateway, "API Gateway / Reverse Proxy", "Nginx", "Handles SSL termination, global rate limiting, and routing.")
        
        Container(backend_api, "Backend API Application", "Node.js + Express", "Handles business logic, AI orchestration, and security enforcement.")
        
        ContainerDb(db, "Primary Database", "MongoDB", "Stores users, encrypted health profiles, audit logs, and threat scores.")
    }

    System_Ext(gemini, "Google Gemini API", "LLM Provider")

    Rel(patient, spa, "Views UI", "HTTPS")
    Rel(spa, api_gateway, "Makes API calls", "JSON/HTTPS")
    Rel(api_gateway, backend_api, "Routes requests", "HTTP")
    
    Rel(backend_api, db, "Reads/Writes data", "Mongoose/TCP")
    Rel(backend_api, gemini, "Generates AI responses", "HTTPS")
```

> [!NOTE]
> The C4 Level 3 (Component Diagrams) and detailed application flow will be covered in the subsequent **Application Architecture** and **AI Architecture** documents.

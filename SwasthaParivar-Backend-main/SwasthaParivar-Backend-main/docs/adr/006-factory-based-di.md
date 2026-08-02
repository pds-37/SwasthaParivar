# Architecture Decision Record (ADR) 006: Factory-Based Dependency Injection

## Status
Accepted

## Context
As the security architecture for SwasthaParivar V2 expanded, the system introduced multiple security modules including `AuditLoggerService`, `ThreatScoreService`, `PromptRiskEngine`, `AiOutputSafetyLayer`, and `SecurityEmitter`. 
Initially, these modules were implemented as global singletons (`export default new Service()`). This led to two significant architectural issues:
1. **Circular Dependencies**: Services that depend on each other (e.g., `PromptRiskEngine` and `SecurityEmitter`) would crash at runtime because Node.js ES modules cannot resolve circular references during initialization.
2. **Poor Testability**: Mocking dependencies for unit testing required intercepting global imports (using complex mock libraries) or writing to a real database in test environments, which causes Mongoose buffering timeouts.

## Decision
We decided to adopt a **Factory-Based Dependency Injection (DI)** pattern instead of importing a heavy Inversion of Control (IoC) framework (like InversifyJS or Awilix).

Each service now exports a factory function (e.g., `createThreatScoreService(dependencies)`) rather than an instantiated singleton.
A centralized composition root (`diContainer.js`) is responsible for instantiating these factories and passing dependencies (Mongoose models, logger, configuration, other services) into them sequentially.

## Consequences
### Positive
*   **Eliminates Circular Dependencies**: Instantiation order is explicitly managed in `diContainer.js`.
*   **Testability**: Test files can directly call the factory functions, passing in mock objects (e.g., `MockModel.create`) to completely isolate the service logic from the database and external dependencies.
*   **Lightweight**: No external libraries or decorators were added. We adhered to simple vanilla JavaScript functional composition.
*   **Adherence to SOLID**: The Dependency Inversion Principle is followed natively, increasing decoupling.

### Negative
*   **Boilerplate**: The `diContainer.js` must be manually updated whenever a service requires a new dependency.
*   **Legacy Middleware**: Legacy controllers and middlewares must import from `diContainer.js` and extract the instantiated services rather than directly importing the service file, which requires refactoring.

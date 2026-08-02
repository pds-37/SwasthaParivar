# Architecture Decision Record (ADR) 004: Decoupled RBAC and ABAC Middleware

## Status
Accepted

## Context
SwasthaParivar requires both Role-Based Access Control (RBAC) (e.g., verifying if a user has the 'admin' or 'user' role) and Attribute-Based Access Control (ABAC) (e.g., verifying if a specific user owns a specific profile or report). Implementing both inside controllers makes the controllers monolithic and violates the Single Responsibility Principle. Combining them into a single middleware makes it rigid and difficult to apply granularly across different routes.

## Decision
We decoupled authorization into two distinct middleware layers:
1. **RBAC Middleware**: Asserts role requirements globally or at the route level.
2. **ABAC Middleware**: Asserts resource ownership (e.g., verifying `req.user.id` against the resource's `userId` or `familyId` in the database).

These middlewares are executed in sequence in the route definitions:
`router.get('/:id', authenticate, requireRole('user'), requireOwnership('Report'), controller)`

## Consequences
### Positive
*   **Separation of Concerns**: Controllers only handle business logic, not authorization.
*   **Reusability**: `requireOwnership` is generic and can validate ownership for Members, Reports, or any entity by passing the resource type.
*   **Security Posture**: Pushes authorization to the "Security Floor" layer, ensuring that malicious requests are blocked before they ever reach the controller logic.

### Negative
*   **Performance**: ABAC middleware must query the database to retrieve the resource and verify ownership. The controller subsequently queries the same resource to process the business logic, resulting in a duplicate database read. (Future mitigation: attach the verified resource to `req.resource`).

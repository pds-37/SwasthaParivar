import {
  PERMISSIONS,
  getUserRoles,
  hasAnyRole,
  hasPermission,
  isScopeAuthorized,
} from "../config/roles.js";
import { sendError } from "../utils/apiResponse.js";

/**
 * Role-Based Access Control middleware.
 * Checks if any of the user's primary or secondary roles are permitted.
 */
export function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    if (!req.user.role) {
      return sendError(res, {
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have a role assigned.",
      });
    }

    if (!hasAnyRole(req.user, allowedRoles)) {
      return sendError(res, {
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
    }

    req.userRoles = getUserRoles(req.user);
    return next();
  };
}

/**
 * Permission-matrix middleware enforcing explicit operational policies.
 */
export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    if (!hasPermission(req.user, permission)) {
      return sendError(res, {
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
    }

    req.userRoles = getUserRoles(req.user);
    return next();
  };
}

/**
 * Geographic jurisdiction middleware validating target scope against user's assignedScope.
 */
export function requireScope(extractScope) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, {
        status: 401,
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const targetScope = typeof extractScope === "function" ? extractScope(req) : {};
    if (!isScopeAuthorized(req.user, targetScope || {})) {
      return sendError(res, {
        status: 403,
        code: "SCOPE_FORBIDDEN",
        message: "Resource access is outside your assigned jurisdiction.",
      });
    }

    return next();
  };
}

export { PERMISSIONS, hasPermission, isScopeAuthorized };

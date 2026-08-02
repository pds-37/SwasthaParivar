import { sendError } from "../utils/apiResponse.js";

// Role-Based Access Control
// Checks if the user's role is in the allowed list of roles.
export function rbac(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return sendError(res, {
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have a role assigned."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(res, {
        status: 403,
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action."
      });
    }

    next();
  };
}

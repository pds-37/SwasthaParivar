import { sendError } from "../utils/apiResponse.js";
import householdService from "../services/household/HouseholdService.js";

// Attribute-Based Access Control
// Ensures the user has ownership or access rights to a specific resource ID (memberId or householdId).
export function abac(resourceParam = "id") {
  return async (req, res, next) => {
    const resourceId = req.params[resourceParam];
    if (!resourceId) return next();

    try {
      // If the resource is a member, verify it belongs to the user's active household
      // Or is managed by the user
      const result = await householdService.findAccessibleMember(req.userId, resourceId);
      
      if (result.error) {
        return sendError(res, {
          status: result.status || 403,
          code: "FORBIDDEN",
          message: "You do not have permission to access this resource."
        });
      }

      req.accessibleMember = result.member;
      next();
    } catch (error) {
      return sendError(res, {
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Failed to verify access."
      });
    }
  };
}

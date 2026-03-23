import { sendError } from "../utils/apiResponse.js";

const buildFieldErrors = (issues = []) =>
  issues.reduce((accumulator, issue) => {
    const key = issue.path.join(".") || "root";
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(issue.message);
    return accumulator;
  }, {});

export const validate = (schema, target = "body") => (req, res, next) => {
  const result = schema.safeParse(req[target]);

  if (!result.success) {
    return sendError(res, {
      status: 400,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: {
        fields: buildFieldErrors(result.error.issues),
      },
    });
  }

  req[target] = result.data;
  return next();
};


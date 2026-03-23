export const successResponse = (data = null, meta = null) => ({
  success: true,
  data,
  error: null,
  meta: meta || null,
});

export const errorResponse = (code, message, details = null) => ({
  success: false,
  data: null,
  error: {
    code,
    message,
    ...(details ? { details } : {}),
  },
  meta: null,
});

export const sendSuccess = (res, { status = 200, data = null, meta = null } = {}) =>
  res.status(status).json(successResponse(data, meta));

export const sendError = (
  res,
  {
    status = 500,
    code = "INTERNAL_ERROR",
    message = "Internal server error",
    details = null,
  } = {}
) => res.status(status).json(errorResponse(code, message, details));


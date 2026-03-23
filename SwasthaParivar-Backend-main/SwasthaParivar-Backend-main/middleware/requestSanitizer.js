function sanitizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (key.startsWith("$") || key.includes(".")) {
        return accumulator;
      }

      accumulator[key] = sanitizeValue(nestedValue);
      return accumulator;
    }, {});
  }

  return typeof value === "string" ? value.trim() : value;
}

export default function requestSanitizer(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }

  if (req.params && typeof req.params === "object") {
    req.params = sanitizeValue(req.params);
  }

  next();
}

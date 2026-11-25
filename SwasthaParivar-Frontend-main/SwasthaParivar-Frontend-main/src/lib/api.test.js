import test, { describe } from "node:test";
import assert from "node:assert";

import {
  buildApiUrl,
  sanitizeBaseUrl,
  shouldAttemptTokenRefresh,
  shouldRedirectToAuth,
} from "./apiHelpers.js";

describe("Frontend API Helpers, URL Normalization & Refresh Loop Guards", () => {
  test("sanitizeBaseUrl normalizes missing /api, trailing slashes, and relative defaults", () => {
    assert.strictEqual(sanitizeBaseUrl(""), "/api");
    assert.strictEqual(sanitizeBaseUrl(undefined), "/api");
    assert.strictEqual(sanitizeBaseUrl("https://swasthaparivar.onrender.com"), "https://swasthaparivar.onrender.com/api");
    assert.strictEqual(sanitizeBaseUrl("https://swasthaparivar.onrender.com/"), "https://swasthaparivar.onrender.com/api");
    assert.strictEqual(sanitizeBaseUrl("https://swasthaparivar.onrender.com/api/"), "https://swasthaparivar.onrender.com/api");
    assert.strictEqual(buildApiUrl("/api", "hierarchical/district/overview"), "/api/hierarchical/district/overview");
    assert.strictEqual(buildApiUrl("/api", "/hierarchical/asha/tasks"), "/api/hierarchical/asha/tasks");
  });

  test("shouldAttemptTokenRefresh prevents infinite loops on /auth/refresh and retried requests", () => {
    assert.strictEqual(shouldAttemptTokenRefresh(401, { url: "/hierarchical/district/overview" }), true);
    assert.strictEqual(shouldAttemptTokenRefresh(401, { url: "/hierarchical/district/overview", __retry: true }), false);
    assert.strictEqual(shouldAttemptTokenRefresh(401, { url: "/auth/refresh" }), false);
    assert.strictEqual(shouldAttemptTokenRefresh(401, { url: "/auth/login" }), false);
    assert.strictEqual(shouldAttemptTokenRefresh(403, { url: "/hierarchical/district/overview" }), false);
  });

  test("shouldRedirectToAuth redirects only outside /auth and skips session bootstrap probes", () => {
    assert.strictEqual(shouldRedirectToAuth(401, { url: "/members" }, "/dashboard"), true);
    assert.strictEqual(shouldRedirectToAuth(401, { url: "/auth/session" }, "/dashboard"), false);
    assert.strictEqual(shouldRedirectToAuth(401, { url: "/members" }, "/auth"), false);
  });
});

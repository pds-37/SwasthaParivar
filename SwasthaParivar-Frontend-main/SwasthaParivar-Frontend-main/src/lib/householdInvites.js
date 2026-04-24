export const normalizeInviteCode = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

export const buildJoinHouseholdPath = (code = "") =>
  `/join/${encodeURIComponent(normalizeInviteCode(code))}`;

export const getInviteCodeFromRedirectPath = (value = "") => {
  const match = String(value || "").match(/^\/join\/([^/?#]+)/i);
  return match ? normalizeInviteCode(decodeURIComponent(match[1])) : "";
};

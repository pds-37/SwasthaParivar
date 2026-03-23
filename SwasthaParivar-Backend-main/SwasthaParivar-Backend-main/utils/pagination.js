const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const parsePagination = (query = {}, { defaultLimit = 20, maxLimit = 50 } = {}) => {
  const rawPage = Number.parseInt(query.page, 10);
  const rawLimit = Number.parseInt(query.limit, 10);
  const page = Number.isFinite(rawPage) ? clamp(rawPage, 1, 10_000) : 1;
  const limit = Number.isFinite(rawLimit) ? clamp(rawLimit, 1, maxLimit) : defaultLimit;

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const buildPaginationMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
});


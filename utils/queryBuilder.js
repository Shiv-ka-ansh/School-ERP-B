exports.getPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

exports.getSort = (query = {}, fallback = '-createdAt') => {
  if (!query.sortBy) return fallback;
  const direction = query.sortOrder === 'asc' ? '' : '-';
  return `${direction}${query.sortBy}`;
};

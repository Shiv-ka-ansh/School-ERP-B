exports.sendSuccess = (res, options = {}) => {
  const {
    statusCode = 200,
    message = 'Request successful',
    data = null,
    pagination = null
  } = options;

  return res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(pagination ? { pagination } : {}),
    timestamp: new Date().toISOString()
  });
};

exports.sendError = (res, options = {}) => {
  const {
    statusCode = 500,
    message = 'Internal server error',
    code = 'INTERNAL_ERROR',
    details = null
  } = options;

  return res.status(statusCode).json({
    success: false,
    message,
    error: {
      code,
      ...(details ? { details } : {})
    },
    timestamp: new Date().toISOString()
  });
};

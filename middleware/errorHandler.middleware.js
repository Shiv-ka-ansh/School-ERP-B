const logger = require('../utils/logger');

exports.errorHandler = (err, req, res, next) => {
  // Log error using Winston
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: req.user ? req.user.username : 'anonymous'
  });

  // Default error format
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.code || 'INTERNAL_ERROR';
  let errorDetails = null;

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
    errorCode = 'VALIDATION_ERROR';
    errorDetails = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern)[0];
    message = `Duplicate value for ${field}`;
    errorCode = 'DUPLICATE_ENTRY';
    errorDetails = { field };
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for ${err.path}`;
    errorCode = 'INVALID_ID';
  }

  res.status(statusCode).json({
    success: false,
    message,
    error: {
      code: errorCode,
      ...(errorDetails && { details: errorDetails })
    },
    timestamp: new Date().toISOString()
  });
};

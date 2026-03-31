const { validationResult, param } = require('express-validator');
const AppError = require('../utils/appError');

exports.handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const appError = new AppError('Validation error', 400, 'VALIDATION_ERROR');
  appError.name = 'ValidationError';
  appError.errors = errors.array().reduce((acc, err) => {
    acc[err.path || err.param] = { path: err.path || err.param, message: err.msg };
    return acc;
  }, {});

  return next(appError);
};

exports.validateObjectIdParam = (field = 'id') => [
  param(field).isMongoId().withMessage(`${field} must be a valid ObjectId`),
  exports.handleValidation
];

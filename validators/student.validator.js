const { body, validationResult } = require('express-validator');
const AppError = require('../utils/appError');

exports.validateStudent = [
  body('firstName').notEmpty().withMessage('First name is required').trim(),
  body('lastName').optional({ checkFalsy: true }).trim(),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('currentClass').notEmpty().withMessage('Current class is required'),
  body('primaryContactPhone').matches(/^[0-9]{10}$/).withMessage('Valid 10-digit primary contact phone is required'),
  
  // Middleware to catch the errors and pass them to error handler
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(e => ({
        field: e.path,
        message: e.msg
      }));
      
      const appError = new AppError('Validation error', 400, 'VALIDATION_ERROR');
      
      // Pass custom structure recognizable by our global handler for validations
      appError.name = 'ValidationError'; 
      appError.errors = errorDetails.reduce((acc, curr) => {
        acc[curr.field] = { path: curr.field, message: curr.message };
        return acc;
      }, {});
      
      return next(appError);
    }
    next();
  }
];

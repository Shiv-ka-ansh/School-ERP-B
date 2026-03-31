const { body } = require('express-validator');
const { handleValidation } = require('./common.validator');

exports.validateBulkResults = [
  body('examId').isMongoId().withMessage('examId is required'),
  body('results').isArray({ min: 1 }).withMessage('results must be a non-empty array'),
  body('results.*.studentId').isMongoId().withMessage('studentId is required in each result'),
  handleValidation
];

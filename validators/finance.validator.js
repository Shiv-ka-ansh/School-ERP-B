const { body } = require('express-validator');
const { handleValidation } = require('./common.validator');

exports.validateFeeCollection = [
  body('studentId').isMongoId().withMessage('studentId is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('mode').optional().isIn(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']).withMessage('Invalid mode'),
  handleValidation
];

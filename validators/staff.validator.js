const { body } = require('express-validator');
const { handleValidation } = require('./common.validator');

exports.validateStaff = [
  body('name').notEmpty().withMessage('name is required'),
  body('roleType').optional().isIn(['TEACHER', 'NON_TEACHING']).withMessage('Invalid roleType'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('phone must be 10 digits'),
  handleValidation
];

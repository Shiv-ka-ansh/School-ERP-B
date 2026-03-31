const SalaryPayment = require('../models/SalaryPayment.model');
const Staff = require('../models/Staff.model');
const Expense = require('../models/Expense.model');
const { createCrudController } = require('./crud.controller');
const { sendSuccess } = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const auditService = require('../services/audit.service');

const crud = createCrudController({ Model: SalaryPayment, moduleName: 'SALARY' });

exports.createSalaryPayment = async (req, res, next) => {
  try {
    const payload = { ...req.body, schoolId: req.schoolId, createdBy: req.user._id };
    const staff = await Staff.findOne({ _id: payload.staffId, schoolId: req.schoolId });
    if (!staff) {
      return next(new AppError('Staff not found', 404, 'NOT_FOUND'));
    }
    const payment = await SalaryPayment.create(payload);
    await Expense.create({
      schoolId: req.schoolId,
      category: 'Teacher Salary',
      amount: payment.amount,
      vendor: staff.name,
      description: `Salary - ${payment.month}/${payment.year}`,
      date: payment.paidDate,
      paymentMode: payment.mode,
      status: 'PAID',
      createdBy: req.user._id
    });
    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'SALARY',
      action: 'CREATE',
      actionDescription: `Salary paid for ${staff.name}`,
      targetCollection: 'SalaryPayment',
      targetId: payment._id,
      newValue: payment,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    return sendSuccess(res, { statusCode: 201, message: 'Salary payment recorded', data: payment });
  } catch (error) {
    return next(error);
  }
};
exports.getSalaryPayments = crud.list;
exports.getSalaryPaymentById = crud.getById;
exports.updateSalaryPayment = crud.update;
exports.deleteSalaryPayment = crud.remove;

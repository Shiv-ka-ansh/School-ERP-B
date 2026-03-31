const FeeStructure = require('../models/FeeStructure.model');
const FeeCollection = require('../models/FeeCollection.model');
const Discount = require('../models/Discount.model');
const Expense = require('../models/Expense.model');
const Student = require('../models/Student.model');
const { createCrudController } = require('./crud.controller');
const { sendSuccess } = require('../utils/apiResponse');

const feeStructureCrud = createCrudController({ Model: FeeStructure, moduleName: 'FEE', searchable: ['className', 'academicYear'] });
const discountCrud = createCrudController({ Model: Discount, moduleName: 'DISCOUNT' });
const expenseCrud = createCrudController({ Model: Expense, moduleName: 'FINANCE', searchable: ['category', 'description', 'vendor'] });

exports.createFeeStructure = feeStructureCrud.create;
exports.getFeeStructures = feeStructureCrud.list;
exports.updateFeeStructure = feeStructureCrud.update;
exports.deleteFeeStructure = feeStructureCrud.remove;

exports.createDiscount = discountCrud.create;
exports.getDiscounts = discountCrud.list;
exports.deleteDiscount = discountCrud.remove;

exports.createExpense = expenseCrud.create;
exports.getExpenses = expenseCrud.list;
exports.deleteExpense = expenseCrud.remove;

exports.collectFee = async (req, res, next) => {
  try {
    const { studentId, amount, mode, remarks } = req.body;
    const receiptNo = `RCPT-${Date.now()}`;
    const payment = await FeeCollection.create({
      schoolId: req.schoolId,
      studentId,
      amount,
      mode,
      remarks,
      receiptNo,
      createdBy: req.user._id
    });
    await Student.findByIdAndUpdate(studentId, { $inc: { totalFeesPaid: amount, totalFeesDue: -amount } });
    return sendSuccess(res, { statusCode: 201, message: 'Fee collected successfully', data: payment });
  } catch (error) {
    return next(error);
  }
};

exports.getFeeCollections = async (req, res, next) => {
  try {
    const rows = await FeeCollection.find({ schoolId: req.schoolId }).sort({ createdAt: -1 });
    return sendSuccess(res, { data: rows });
  } catch (error) {
    return next(error);
  }
};

exports.getFeeDefaulters = async (req, res, next) => {
  try {
    const rows = await Student.find({ schoolId: req.schoolId, isDeleted: false, totalFeesDue: { $gt: 0 } })
      .select('studentId firstName lastName currentClass totalFeesDue primaryContactPhone');
    return sendSuccess(res, { data: rows });
  } catch (error) {
    return next(error);
  }
};

exports.getPnL = async (req, res, next) => {
  try {
    const incomeAgg = await FeeCollection.aggregate([
      { $match: { schoolId: req.schoolId } },
      { $group: { _id: null, income: { $sum: '$amount' } } }
    ]);
    const expenseAgg = await Expense.aggregate([
      { $match: { schoolId: req.schoolId } },
      { $group: { _id: null, expense: { $sum: '$amount' } } }
    ]);
    const income = incomeAgg[0]?.income || 0;
    const expense = expenseAgg[0]?.expense || 0;
    return sendSuccess(res, { data: { income, expense, profit: income - expense } });
  } catch (error) {
    return next(error);
  }
};

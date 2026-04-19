const FeeStructure = require('../models/FeeStructure.model');
const FeeCollection = require('../models/FeeCollection.model');
const Discount = require('../models/Discount.model');
const Expense = require('../models/Expense.model');
const Income = require('../models/Income.model');
const Counter = require('../models/Counter.model');
const Student = require('../models/Student.model');
const { createCrudController } = require('./crud.controller');
const { sendSuccess } = require('../utils/apiResponse');
const AppError = require('../utils/appError');
const auditService = require('../services/audit.service');

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
    const { studentId, amount, mode, remarks, installmentNo = 1, period, feeHeads, refDetails, date: customDate } = req.body;
    const feeDate = customDate ? new Date(customDate) : new Date();
    const student = await Student.findOne({ _id: studentId, schoolId: req.schoolId, isDeleted: false });
    if (!student) {
      return next(new AppError('Student not found', 404, 'NOT_FOUND'));
    }

    const counter = await Counter.findOneAndUpdate(
      { key: `receipt-seq-${req.schoolId}` },
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    );
    const year = feeDate.getFullYear();
    const receiptNo = `RCPT-${year}-${String(counter.value).padStart(3, '0')}`;

    const now = new Date();
    const discount = await Discount.findOne({
      schoolId: req.schoolId,
      studentId,
      status: 'approved',
      $or: [{ validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: now } }],
      $and: [{ $or: [{ validTo: { $exists: false } }, { validTo: null }, { validTo: { $gte: now } }] }]
    }).sort({ createdAt: -1 });

    const discountAmount = discount
      ? discount.type === 'percent'
        ? Number(((amount * discount.value) / 100).toFixed(2))
        : Math.min(amount, discount.value)
      : 0;
    const netAmount = Number((amount - discountAmount).toFixed(2));

    const payment = await FeeCollection.create({
      schoolId: req.schoolId,
      studentId,
      amount: netAmount,
      mode,
      remarks,
      period,
      feeHeads,
      refDetails,
      installmentNo,
      grossAmount: amount,
      discountAmount,
      discountId: discount?._id,
      receiptNo,
      date: feeDate,
      createdBy: req.user._id
    });

    await Student.findByIdAndUpdate(studentId, { $inc: { totalFeesPaid: netAmount, totalFeesDue: -netAmount } });

    await Income.create({
      schoolId: req.schoolId,
      source: 'FEE',
      studentId,
      amount: netAmount,
      mode,
      description: `Fee - ${student.firstName} ${student.lastName}`,
      date: feeDate,
      createdBy: req.user._id
    });

    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'FEE',
      action: 'CREATE',
      actionDescription: `Collected fee receipt ${receiptNo}`,
      targetCollection: 'FeeCollection',
      targetId: payment._id,
      newValue: payment,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

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

exports.getFeeReceipt = async (req, res, next) => {
  try {
    const receipt = await FeeCollection.findOne({ _id: req.params.id, schoolId: req.schoolId }).populate(
      'studentId',
      'firstName lastName currentClass section studentId'
    );
    if (!receipt) return next(new AppError('Receipt not found', 404, 'NOT_FOUND'));
    return sendSuccess(res, {
      data: {
        receipt,
        layout: 'DUAL_SLIP_A4',
        copies: ['Student Copy', 'School Copy']
      }
    });
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

exports.getCollectionSummary = async (req, res, next) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const summary = await FeeCollection.aggregate([
      { $match: { schoolId: req.schoolId, date: { $gte: new Date(year, 0, 1), $lte: new Date(year, 11, 31, 23, 59, 59, 999) } } },
      {
        $group: {
          _id: { month: { $month: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);
    return sendSuccess(res, { data: summary });
  } catch (error) {
    return next(error);
  }
};

exports.getPnL = async (req, res, next) => {
  try {
    const start = req.query.startDate ? new Date(req.query.startDate) : null;
    const end = req.query.endDate ? new Date(req.query.endDate) : null;
    const dateFilter = start && end ? { date: { $gte: start, $lte: end } } : {};
    const incomeAgg = await FeeCollection.aggregate([
      { $match: { schoolId: req.schoolId, ...dateFilter } },
      { $group: { _id: null, income: { $sum: '$amount' } } }
    ]);
    const nonFeeIncomeAgg = await Income.aggregate([
      { $match: { schoolId: req.schoolId, ...dateFilter } },
      { $group: { _id: null, income: { $sum: '$amount' } } }
    ]);
    const expenseAgg = await Expense.aggregate([
      { $match: { schoolId: req.schoolId, ...dateFilter } },
      { $group: { _id: null, expense: { $sum: '$amount' } } }
    ]);
    const income = (incomeAgg[0]?.income || 0) + (nonFeeIncomeAgg[0]?.income || 0);
    const expense = expenseAgg[0]?.expense || 0;
    return sendSuccess(res, { data: { income, expense, profit: income - expense } });
  } catch (error) {
    return next(error);
  }
};

exports.getFinanceSummary = async (req, res, next) => {
  try {
    const year = Number(req.query.year || new Date().getFullYear());
    const monthly = [];
    for (let month = 1; month <= 12; month += 1) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      const [incomeFee, incomeOther, expense] = await Promise.all([
        FeeCollection.aggregate([{ $match: { schoolId: req.schoolId, date: { $gte: start, $lte: end } } }, { $group: { _id: null, v: { $sum: '$amount' } } }]),
        Income.aggregate([{ $match: { schoolId: req.schoolId, date: { $gte: start, $lte: end } } }, { $group: { _id: null, v: { $sum: '$amount' } } }]),
        Expense.aggregate([{ $match: { schoolId: req.schoolId, date: { $gte: start, $lte: end } } }, { $group: { _id: null, v: { $sum: '$amount' } } }])
      ]);
      const income = (incomeFee[0]?.v || 0) + (incomeOther[0]?.v || 0);
      const exp = expense[0]?.v || 0;
      monthly.push({ month, year, income, expense: exp, net: income - exp });
    }
    return sendSuccess(res, { data: monthly });
  } catch (error) {
    return next(error);
  }
};

exports.getVendorLedger = async (req, res, next) => {
  try {
    const vendor = req.query.vendor;
    const filter = { schoolId: req.schoolId };
    if (vendor) filter.vendor = vendor;
    const expenses = await Expense.find(filter).sort({ date: -1 });
    return sendSuccess(res, { data: expenses });
  } catch (error) {
    return next(error);
  }
};

exports.approveDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date(), updatedBy: req.user._id },
      { new: true }
    );
    if (!discount) return next(new AppError('Discount not found', 404, 'NOT_FOUND'));
    return sendSuccess(res, { message: 'Discount approved', data: discount });
  } catch (error) {
    return next(error);
  }
};

exports.rejectDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      {
        status: 'rejected',
        rejectedBy: req.user._id,
        rejectionReason: req.body.rejectionReason || '',
        updatedBy: req.user._id
      },
      { new: true }
    );
    if (!discount) return next(new AppError('Discount not found', 404, 'NOT_FOUND'));
    return sendSuccess(res, { message: 'Discount rejected', data: discount });
  } catch (error) {
    return next(error);
  }
};

exports.revokeDiscount = async (req, res, next) => {
  try {
    const discount = await Discount.findOneAndUpdate(
      { _id: req.params.id, schoolId: req.schoolId },
      { status: 'revoked', revokedBy: req.user._id, revokedAt: new Date(), updatedBy: req.user._id },
      { new: true }
    );
    if (!discount) return next(new AppError('Discount not found', 404, 'NOT_FOUND'));
    return sendSuccess(res, { message: 'Discount revoked', data: discount });
  } catch (error) {
    return next(error);
  }
};

exports.updateFeeCollection = async (req, res, next) => {
  try {
    const collection = await FeeCollection.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!collection) return next(new AppError('Fee collection not found', 404, 'NOT_FOUND'));

    const oldData = collection.toObject();
    const { amount, mode, remarks, feeHeads, refDetails } = req.body;

    // Recalculate student totals if amount changed
    if (amount !== undefined && amount !== collection.amount) {
      const diff = Number(amount) - collection.amount;
      await Student.findByIdAndUpdate(collection.studentId, { $inc: { totalFeesPaid: diff, totalFeesDue: -diff } });
    }

    Object.assign(collection, {
      ...(amount !== undefined && { amount: Number(amount) }),
      ...(mode !== undefined && { mode }),
      ...(remarks !== undefined && { remarks }),
      ...(feeHeads !== undefined && { feeHeads }),
      ...(refDetails !== undefined && { refDetails })
    });
    await collection.save();

    await auditService.logAction({
      userId: req.user._id, username: req.user.username, userRole: req.user.role,
      module: 'FEE', action: 'UPDATE',
      actionDescription: `Updated fee collection ${collection.receiptNo}`,
      targetCollection: 'FeeCollection', targetId: collection._id,
      oldValue: oldData, newValue: collection.toObject(),
      ipAddress: req.ip, userAgent: req.get('user-agent'), riskLevel: 'HIGH'
    });

    return sendSuccess(res, { message: 'Fee collection updated', data: collection });
  } catch (error) {
    return next(error);
  }
};

exports.deleteFeeCollection = async (req, res, next) => {
  try {
    const collection = await FeeCollection.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!collection) return next(new AppError('Fee collection not found', 404, 'NOT_FOUND'));

    // Reverse the student fee totals
    await Student.findByIdAndUpdate(collection.studentId, {
      $inc: { totalFeesPaid: -collection.amount, totalFeesDue: collection.amount }
    });

    await auditService.logAction({
      userId: req.user._id, username: req.user.username, userRole: req.user.role,
      module: 'FEE', action: 'DELETE',
      actionDescription: `Deleted fee collection ${collection.receiptNo}`,
      targetCollection: 'FeeCollection', targetId: collection._id,
      oldValue: collection.toObject(), ipAddress: req.ip,
      userAgent: req.get('user-agent'), riskLevel: 'HIGH'
    });

    await FeeCollection.deleteOne({ _id: collection._id });
    return sendSuccess(res, { message: 'Fee collection deleted' });
  } catch (error) {
    return next(error);
  }
};

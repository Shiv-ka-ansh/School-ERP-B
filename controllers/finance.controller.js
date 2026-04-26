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
exports.updateDiscount = discountCrud.update;
exports.deleteDiscount = discountCrud.remove;

exports.createExpense = expenseCrud.create;
exports.getExpenses = expenseCrud.list;
exports.deleteExpense = expenseCrud.remove;

exports.collectFee = async (req, res, next) => {
  try {
    const { studentId, amount, mode, remarks, installmentNo = 1, period, months, feeHeads, refDetails, date: customDate } = req.body;
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
    const discountAmount = Number(req.body.discountAmount) || 0;
    const netAmount = Number(amount);
    const grossAmount = netAmount + discountAmount;
    // amountDue = what the student was actually supposed to pay this session (before custom override)
    const amountDue = Number(req.body.amountDue) || netAmount;

    const discount = await Discount.findOne({
      schoolId: req.schoolId,
      studentId,
      status: 'approved',
      $or: [{ validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: now } }],
      $and: [{ $or: [{ validTo: { $exists: false } }, { validTo: null }, { validTo: { $gte: now } }] }]
    }).sort({ createdAt: -1 });

    const payment = await FeeCollection.create({
      schoolId: req.schoolId,
      studentId,
      amount: netAmount,
      amountDue,
      mode,
      remarks,
      period,
      months,
      feeHeads,
      refDetails,
      installmentNo,
      grossAmount: grossAmount,
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
    const filter = { schoolId: req.schoolId };
    if (req.query.studentId) filter.studentId = req.query.studentId;
    
    const rows = await FeeCollection.find(filter)
      .sort({ createdAt: -1 })
      .populate('studentId', 'firstName lastName currentClass section studentId');
      
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
    const ALL_MONTHS = [
      'April', 'May', 'June', 'July', 'August', 'September',
      'October', 'November', 'December', 'January', 'February', 'March'
    ];

    const today = new Date();
    const currentDay = today.getDate();

    // Get current month name
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthName = monthNames[today.getMonth()];
    const academicMonthIndex = ALL_MONTHS.indexOf(currentMonthName);

    // Calculate expected paid months based on grace period (1-15 = grace, 16+ = due)
    let expectedUpToIndex;
    if (academicMonthIndex === -1) {
      // Month not found — shouldn't happen, default to -1
      expectedUpToIndex = -1;
    } else if (currentDay <= 15) {
      expectedUpToIndex = academicMonthIndex - 1; // Previous month was last due
    } else {
      expectedUpToIndex = academicMonthIndex; // This month is now also due
    }

    // If expectedUpToIndex < 0, it means even April hasn't been due yet
    // (i.e., today is April 1-15) — no defaulters possible
    if (expectedUpToIndex < 0) {
      return sendSuccess(res, {
        data: {
          defaulters: [],
          expectedMonths: [],
          gracePeriodActive: true,
          asOfDate: today.toISOString(),
          message: `No fees due yet — grace period active (${currentMonthName} 1–15)`
        }
      });
    }

    const expectedMonths = ALL_MONTHS.slice(0, expectedUpToIndex + 1);

    // Get all active students
    const students = await Student.find({
      schoolId: req.schoolId,
      isDeleted: false,
      isActive: true
    }).select('studentId firstName lastName currentClass section primaryContactPhone totalFeesPaid totalFeesDue');

    if (students.length === 0) {
      return sendSuccess(res, {
        data: { defaulters: [], expectedMonths, gracePeriodActive: false, asOfDate: today.toISOString() }
      });
    }

    // Get all fee collections for this school (bulk — more efficient than per-student queries)
    const allCollections = await FeeCollection.find({
      schoolId: req.schoolId
    }).select('studentId months feeHeads amount discountAmount');

    // Get all fee structures
    const allFeeStructures = await FeeStructure.find({
      schoolId: req.schoolId
    });

    // Build a map: studentId → paid months
    const paidMonthsMap = {};
    const paidChargesMap = {};
    allCollections.forEach(c => {
      const sid = String(c.studentId);
      if (!paidMonthsMap[sid]) paidMonthsMap[sid] = [];
      if (!paidChargesMap[sid]) paidChargesMap[sid] = [];
      if (c.months && Array.isArray(c.months)) {
        paidMonthsMap[sid].push(...c.months);
      }
      if (c.feeHeads && Array.isArray(c.feeHeads)) {
        c.feeHeads.forEach(fh => {
          if (!fh.head.toLowerCase().includes('tuition')) {
            paidChargesMap[sid].push(fh.head.toLowerCase().trim());
          }
        });
      }
    });

    // Helper: get fee structure for a class
    const getFeeStructure = (className) => {
      return allFeeStructures.find(fs => {
        const classes = fs.className.split(',').map(c => c.trim());
        return classes.includes(className);
      });
    };

    const defaulters = [];

    for (const student of students) {
      const sid = String(student._id);
      const paidMonths = [...new Set(paidMonthsMap[sid] || [])];
      const paidCharges = [...new Set(paidChargesMap[sid] || [])];

      // Which expected months are NOT paid?
      const overdueMonths = expectedMonths.filter(m => !paidMonths.includes(m));

      if (overdueMonths.length === 0) continue; // Student is up to date — skip

      // Get fee structure to calculate remaining amount
      const feeStructure = getFeeStructure(student.currentClass);

      let monthlyTuition = 0;
      let unpaidChargesAmount = 0;
      let annualCharges = [];

      if (feeStructure) {
        monthlyTuition = feeStructure.monthlyTuition || 0;

        if (monthlyTuition === 0 && feeStructure.feeHeads?.length > 0) {
          const tuitionHead = feeStructure.feeHeads.find(h =>
            h.head.toLowerCase().includes('tuition')
          );
          if (tuitionHead) monthlyTuition = Number(tuitionHead.amount);
          annualCharges = feeStructure.feeHeads
            .filter(h => !h.head.toLowerCase().includes('tuition'))
            .map(h => ({ name: h.head, amount: Number(h.amount) }));
        } else {
          annualCharges = (feeStructure.annualCharges || [])
            .map(c => ({ name: c.name, amount: Number(c.amount) }));
        }

        // Calculate unpaid annual charges
        unpaidChargesAmount = annualCharges
          .filter(ac => !paidCharges.includes(ac.name.toLowerCase().trim()))
          .reduce((sum, ac) => sum + ac.amount, 0);
      }

      const overdueMonthsAmount = overdueMonths.length * monthlyTuition;
      const totalOverdue = overdueMonthsAmount + unpaidChargesAmount;

      defaulters.push({
        studentId: student._id,
        admissionNo: student.studentId,
        name: `${student.firstName} ${student.lastName}`.trim(),
        currentClass: student.currentClass,
        section: student.section || '',
        phone: student.primaryContactPhone || '',
        overdueMonths,          // e.g. ["April", "May"]
        overdueMonthsCount: overdueMonths.length,
        monthlyTuition,
        overdueMonthsAmount,    // tuition for overdue months
        unpaidChargesAmount,    // annual charges unpaid
        totalOverdue,           // grand total remaining till today
        paidMonthsCount: paidMonths.length,
        totalPaid: student.totalFeesPaid || 0
      });
    }

    // Sort: most overdue first (highest totalOverdue)
    defaulters.sort((a, b) => b.totalOverdue - a.totalOverdue);

    return sendSuccess(res, {
      data: {
        defaulters,
        expectedMonths,          // e.g. ["April", "May"]
        gracePeriodActive: false,
        asOfDate: today.toISOString(),
        totalDefaulters: defaulters.length,
        totalOverdueAmount: defaulters.reduce((s, d) => s + d.totalOverdue, 0)
      }
    });

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

exports.printReceipt = async (req, res, next) => {
  try {
      const receipt = await FeeCollection.findOne({ _id: req.params.id, schoolId: req.schoolId })
        .populate('studentId', 'firstName lastName currentClass section studentId fatherName primaryContactPhone academicYear');
    if (!receipt) return next(new AppError('Receipt not found', 404, 'NOT_FOUND'));

    const student = receipt.studentId;
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'N/A';
    const studentClass = student?.currentClass || '';
    const studentSection = student?.section || '';
    const studentIdNo = student?.studentId || '';
    const fatherName = student?.fatherName || '';
    const modeLabel = receipt.mode === 'BANK_TRANSFER' ? 'Cheque' : receipt.mode === 'CASH' ? 'Cash' : receipt.mode;
    const dateStr = receipt.date ? new Date(receipt.date).toLocaleDateString('en-IN') : '';
    const amountStr = `₹${Number(receipt.amount).toLocaleString('en-IN')}`;

    // Shortfall: how much was NOT paid in this session
    const amountDue = Number(receipt.amountDue) || 0;
    const amountPaid = Number(receipt.amount) || 0;
    const sessionShortfall = Math.max(0, amountDue - amountPaid);

    // Cumulative pending balance across ALL sessions for this student
    const allCollections = await FeeCollection.find({ schoolId: req.schoolId, studentId: receipt.studentId._id || receipt.studentId });
    const totalPending = Math.max(0, allCollections.reduce((sum, c) => {
      let d = c.amountDue || 0;
      if (c.feeHeads) {
        c.feeHeads.forEach(fh => {
          if (fh.head === "Previous Dues (Carry-forward)") {
            d -= (Number(fh.amount) || 0);
          }
        });
      }
      return sum + d - (c.amount || 0);
    }, 0));

    // Build fee rows HTML
    let feeRowsHtml = '';
    const feeHeads = receipt.feeHeads && receipt.feeHeads.length > 0
      ? receipt.feeHeads
      : [{ head: 'Fee', amount: receipt.amount }];

    feeHeads.forEach(fh => {
      feeRowsHtml += `
        <tr style="border-bottom:1px solid #eee;">
          <td style="padding:6px 8px;font-size:11px;">${fh.head}</td>
          <td style="padding:6px 8px;font-size:11px;text-align:right;font-family:monospace;">₹${Number(fh.amount).toLocaleString('en-IN')}</td>
        </tr>`;
    });

    if (receipt.discountAmount && receipt.discountAmount > 0) {
      feeRowsHtml += `
        <tr style="border-bottom:1px solid #eee;background:#f0fdf4;">
          <td style="padding:6px 8px;font-size:11px;color:#15803d;font-style:italic;">Discount Applied</td>
          <td style="padding:6px 8px;font-size:11px;text-align:right;color:#15803d;font-family:monospace;">-₹${Number(receipt.discountAmount).toLocaleString('en-IN')}</td>
        </tr>`;
    }

    feeRowsHtml += `
      <tr style="background:#f9fafb;">
        <td style="padding:8px 8px;font-size:13px;font-weight:bold;color:#1e3a5f;text-transform:uppercase;">Total Paid</td>
        <td style="padding:8px 8px;font-size:13px;font-weight:bold;color:#1e3a5f;text-align:right;font-family:monospace;">${amountStr}</td>
      </tr>`;

    if (sessionShortfall > 0) {
      feeRowsHtml += `
      <tr style="background:#fffbeb;">
        <td style="padding:6px 8px;font-size:11px;font-weight:bold;color:#b45309;border-top:1px solid #fde68a;">Remaining Balance</td>
        <td style="padding:6px 8px;font-size:11px;font-weight:bold;color:#b45309;text-align:right;font-family:monospace;border-top:1px solid #fde68a;">₹${sessionShortfall.toLocaleString('en-IN')} pending</td>
      </tr>`;
    }

    if (totalPending > 0) {
      feeRowsHtml += `
      <tr style="background:#fff7ed;">
        <td style="padding:6px 8px;font-size:11px;font-weight:bold;color:#c2410c;border-top:1px solid #fed7aa;">Total Pending Balance</td>
        <td style="padding:6px 8px;font-size:11px;font-weight:bold;color:#c2410c;text-align:right;font-family:monospace;border-top:1px solid #fed7aa;">₹${totalPending.toLocaleString('en-IN')}</td>
      </tr>`;
    }

    feeRowsHtml += `
      <tr>
        <td colspan="2" style="padding:6px 8px;font-size:10px;color:#6b7280;font-style:italic;">
          Payment Mode: <strong>${modeLabel.toUpperCase()}</strong>${receipt.refDetails ? ` | Ref: ${receipt.refDetails}` : ''}
        </td>
      </tr>`;

    const copyCssVars = `
      @page { size: A4 portrait; margin: 0; }
      body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background: white; }
      .page { width: 210mm; padding: 10mm 15mm; box-sizing: border-box; display: flex; flex-direction: column; }
      .copy { display: flex; flex-direction: column; }
      .cut-line { width: 100%; border-top: 1px dashed #ccc; margin: 8mm 0; text-align: center; }
      .cut-label { background: white; display: inline-block; padding: 0 6mm; font-size: 11px; color: #aaa; letter-spacing: 3px; font-weight: bold; margin-top: -7px; }
      table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; }
      @media print {
        body * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }
    `;

    const buildCopy = (label) => `
      <div class="copy">
        <div style="text-align:center;margin-bottom:8px;">
          <span style="padding:3px 12px;background:#f3f4f6;border:1px solid #d1d5db;font-size:11px;font-weight:bold;letter-spacing:3px;border-radius:999px;">${label}</span>
        </div>
        <div style="display:flex;align-items:center;gap:15px;padding-bottom:6px;border-bottom:2px solid #ef4444;margin-bottom:6px;">
          <div style="width:80px;height:80px;flex-shrink:0;">
            <img src="${process.env.APP_URL || 'http://localhost:5000'}/logo.png" style="width:100%;height:100%;object-contain;" />
          </div>
          <div style="flex:1;text-align:center;">
            <div style="font-size:22px;font-weight:bold;color:#1e3a5f;letter-spacing:1px;">SIDDESHWAR MOUNTAIN PUBLIC SCHOOL</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px;">Brahma Nagar Colony, Jhansi, UP | Ph: +91 9219745231 <br/> Session: ${student?.academicYear || '2026-2027'}</div>
          </div>
          <div style="width:80px;"></div>
        </div>
        <h2 style="text-align:center;font-size:14px;font-weight:bold;color:#1e3a5f;letter-spacing:2px;text-transform:uppercase;margin:8px 0 10px;">Fee Receipt</h2>
        <div style="display:flex;justify-content:space-between;font-size:11px;margin-bottom:10px;">
          <span style="font-family:monospace;background:#f9fafb;padding:3px 8px;border:1px solid #e5e7eb;border-radius:4px;">No: <strong>${receipt.receiptNo}</strong></span>
          <span style="background:#f9fafb;padding:3px 8px;border:1px solid #e5e7eb;border-radius:4px;">Date: ${dateStr}</span>
        </div>
        <div style="font-size:11px;border:1px solid #e5e7eb;border-radius:4px;padding:8px 10px;background:#fafafa;margin-bottom:10px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;">
            <div><span style="color:#6b7280;">Student Name:</span> <strong style="color:#1e3a5f;">${studentName.toUpperCase()}</strong></div>
            <div><span style="color:#6b7280;">Student ID:</span> <strong style="color:#1e3a5f;">${studentIdNo}</strong></div>
            <div><span style="color:#6b7280;">Class:</span> <strong style="color:#1e3a5f;">${studentClass}${studentSection ? '-' + studentSection : ''}</strong></div>
            <div><span style="color:#6b7280;">Father's Name:</span> <strong style="color:#1e3a5f;">${fatherName}</strong></div>
          </div>
          <div style="border-top:1px solid #e5e7eb;margin-top:6px;padding-top:4px;">
            <span style="color:#6b7280;">Fee Period:</span> <strong style="color:#1e3a5f;margin-left:4px;">${receipt.period || 'Annual'}</strong>
          </div>
        </div>
        <table>
          <thead>
            <tr style="background:#f3f4f6;">
              <th style="text-align:left;padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb;color:#1e3a5f;">Fee Head</th>
              <th style="text-align:right;padding:6px 8px;font-size:11px;border-bottom:1px solid #e5e7eb;color:#1e3a5f;width:90px;">Amount</th>
            </tr>
          </thead>
          <tbody>${feeRowsHtml}</tbody>
        </table>
        ${receipt.remarks ? `<p style="font-size:10px;color:#6b7280;font-style:italic;margin:6px 0 0;">Remarks: ${receipt.remarks}</p>` : ''}
        <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:6px;margin-bottom:4px;">
          <div style="padding:4px 12px;border:2px solid #2563eb;color:#2563eb;font-weight:bold;font-size:18px;transform:rotate(-12deg);opacity:0.8;border-radius:3px;letter-spacing:3px;">PAID</div>
          <div style="text-align:center;">
            <p style="font-size:10px;color:#6b7280;margin:0 0 10px;">Received by: Admin</p>
            <div style="border-bottom:1px solid #9ca3af;width:120px;margin:0 auto;"></div>
            <p style="font-size:9px;color:#6b7280;margin:4px 0 0;letter-spacing:2px;text-transform:uppercase;">Authorized Signatory</p>
          </div>
        </div>
      </div>`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Fee Receipt - ${receipt.receiptNo}</title>
  <style>${copyCssVars}</style>
</head>
<body>
  <div class="page">
    ${buildCopy('STUDENT COPY')}
    <div class="cut-line"><span class="cut-label">✂ CUT HERE ✂</span></div>
    ${buildCopy('INSTITUTE COPY')}
  </div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    return res.status(200).send(html);
  } catch (error) {
    return next(error);
  }
};

exports.getStudentFeeSummary = async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const student = await Student.findOne({
      _id: studentId,
      schoolId: req.schoolId,
      isDeleted: false
    });
    if (!student) return next(new AppError('Student not found', 404, 'NOT_FOUND'));

    // Get fee structure for this student's class
    const feeStructure = await FeeStructure.findOne({
      schoolId: req.schoolId,
      $or: [
        { className: student.currentClass },
        { className: { $regex: new RegExp(`(^|,)\\s*${student.currentClass}\\s*(,|$)`) } }
      ]
    });

    // Get all payments for this student
    const collections = await FeeCollection.find({
      schoolId: req.schoolId,
      studentId
    }).sort({ date: -1 });

    const totalPaid = collections.reduce((sum, c) => sum + (c.amount || 0), 0);
    const totalDiscount = collections.reduce((sum, c) => sum + (c.discountAmount || 0), 0);
    // partialBalance: total actual billed minus total paid (avoids double counting carry-forwards)
    const partialBalance = Math.max(0, collections.reduce((sum, c) => {
      let d = c.amountDue || 0;
      if (c.feeHeads) {
        c.feeHeads.forEach(fh => {
          if (fh.head === "Previous Dues (Carry-forward)") {
            d -= (Number(fh.amount) || 0);
          }
        });
      }
      return sum + d - (c.amount || 0);
    }, 0));

    // Calculate annual fee from fee structure
    let annualFeeTotal = 0;
    let monthlyTuition = 0;
    let annualChargesTotal = 0;

    if (feeStructure) {
      monthlyTuition = feeStructure.monthlyTuition || 0;

      // Support legacy feeHeads format
      if (monthlyTuition === 0 && feeStructure.feeHeads && feeStructure.feeHeads.length > 0) {
        const tuitionHead = feeStructure.feeHeads.find(h =>
          h.head.toLowerCase().includes('tuition')
        );
        if (tuitionHead) monthlyTuition = Number(tuitionHead.amount);

        const otherHeads = feeStructure.feeHeads.filter(h =>
          !h.head.toLowerCase().includes('tuition')
        );
        annualChargesTotal = otherHeads.reduce((sum, h) => sum + Number(h.amount), 0);
      } else {
        const annualCharges = feeStructure.annualCharges || [];
        annualChargesTotal = annualCharges.reduce((sum, c) => sum + Number(c.amount), 0);
      }

      annualFeeTotal = (monthlyTuition * 12) + annualChargesTotal;
    }

    // Extract paid months and paid annual charge heads from all collections
    const paidMonths = [];
    const paidCharges = [];
    collections.forEach(c => {
      if (c.months && Array.isArray(c.months)) {
        paidMonths.push(...c.months);
      }
      if (c.feeHeads && Array.isArray(c.feeHeads)) {
        c.feeHeads.forEach(fh => {
          if (!fh.head.toLowerCase().includes('tuition')) {
            paidCharges.push(fh.head.toLowerCase().trim());
          }
        });
      }
    });

    const uniquePaidMonths = [...new Set(paidMonths)];
    const unpaidMonthsCount = Math.max(0, 12 - uniquePaidMonths.length);

    // Calculate remaining annual charges not yet paid
    const paidChargesSet = new Set(paidCharges);
    const unpaidChargesTotal = feeStructure
      ? (feeStructure.annualCharges || [])
          .filter(ac => !paidChargesSet.has(ac.name.toLowerCase().trim()))
          .reduce((sum, ac) => sum + Number(ac.amount), 0)
      : 0;

    const remainingTuition = monthlyTuition * unpaidMonthsCount;
    const remaining = Math.max(0, annualFeeTotal - totalPaid - totalDiscount);

    return sendSuccess(res, {
      data: {
        studentId,
        studentName: `${student.firstName} ${student.lastName}`,
        currentClass: student.currentClass,
        annualFeeTotal,
        monthlyTuition,
        annualChargesTotal,
        totalPaid,
        totalDiscount,
        partialBalance,
        remaining,
        remainingTuition,
        unpaidChargesTotal,
        paidMonthsCount: uniquePaidMonths.length,
        unpaidMonthsCount,
        paidMonths: uniquePaidMonths,
        collectionsCount: collections.length,
        lastPaymentDate: collections[0]?.date || null,
        feeStructureFound: !!feeStructure
      }
    });
  } catch (error) {
    return next(error);
  }
};

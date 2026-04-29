const Attendance = require('../models/Attendance.model');
const LeaveRequest = require('../models/LeaveRequest.model');
const LeaveBalance = require('../models/LeaveBalance.model');
const Staff = require('../models/Staff.model');
const { calculateLop } = require('../services/lop.service');
const auditService = require('../services/audit.service');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');

exports.bulkUpsertAttendance = async (req, res, next) => {
  try {
    const { type, date, className, records = [] } = req.body;
    const schoolId = req.schoolId;
    const normalizedDate = new Date(date);

    const ops = records.map((record) => {
      const filter = {
        schoolId,
        type,
        date: normalizedDate
      };

      if (type === 'STUDENT') {
        filter.studentId = record.studentId;
      } else {
        filter.staffId = record.staffId;
      }

      return {
        updateOne: {
          filter,
          update: {
            $set: {
              ...record,
              schoolId,
              type,
              className,
              date: normalizedDate,
              updatedBy: req.user._id
            },
            $setOnInsert: { createdBy: req.user._id }
          },
          upsert: true
        }
      };
    });

    const result = await Attendance.bulkWrite(ops, { ordered: false });
    return sendSuccess(res, {
      message: 'Attendance saved successfully',
      data: result
    });
  } catch (error) {
    return next(error);
  }
};

exports.getAttendance = async (req, res, next) => {
  try {
    const filter = {
      schoolId: req.schoolId,
      type: req.query.type || 'STUDENT'
    };
    if (req.query.date) filter.date = new Date(req.query.date);
    if (req.query.className) filter.className = req.query.className;

    const rows = await Attendance.find(filter).sort({ date: -1 });
    return sendSuccess(res, { data: rows });
  } catch (error) {
    return next(error);
  }
};

exports.getAttendanceReport = async (req, res, next) => {
  try {
    const { type = 'STUDENT', month, year } = req.query;
    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const data = await Attendance.aggregate([
      {
        $match: {
          schoolId: req.schoolId,
          type,
          date: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: type === 'STUDENT' ? '$studentId' : '$staffId',
          present: {
            $sum: {
              $cond: [{ $in: ['$status', ['PRESENT', 'LATE', 'HALF_DAY']] }, 1, 0]
            }
          },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'ABSENT'] }, 1, 0] } },
          total: { $sum: 1 }
        }
      }
    ]);

    return sendSuccess(res, { data });
  } catch (error) {
    return next(error);
  }
};

exports.createLeaveRequest = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.create({
      ...req.body,
      schoolId: req.schoolId,
      createdBy: req.user._id
    });
    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'TEACHER_ATTENDANCE',
      action: 'CREATE',
      actionDescription: 'Created leave request',
      targetCollection: 'LeaveRequest',
      targetId: leave._id,
      newValue: leave,
      ipAddress: req.ip
    });
    return sendSuccess(res, { statusCode: 201, message: 'Leave request created', data: leave });
  } catch (error) {
    return next(error);
  }
};

exports.approveLeaveRequest = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findOne({ _id: req.params.id, schoolId: req.schoolId });
    if (!leave) return next(new AppError('Leave request not found', 404, 'NOT_FOUND'));
    leave.status = req.body.status === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    leave.rejectionReason = req.body.rejectionReason || '';
    await leave.save();

    if (leave.status === 'APPROVED' && leave.leaveType !== 'LWP') {
      const year = String(new Date(leave.startDate).getFullYear());
      const balance = await LeaveBalance.findOneAndUpdate(
        { schoolId: req.schoolId, staffId: leave.staffId, academicYear: year },
        {},
        { upsert: true, new: true }
      );
      const days = Math.max(1, Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1);
      const usedKey = `used${leave.leaveType}`;
      balance[usedKey] = (balance[usedKey] || 0) + days;
      await balance.save();
    }

    return sendSuccess(res, { message: 'Leave request processed', data: leave });
  } catch (error) {
    return next(error);
  }
};

exports.getLeaveRequests = async (req, res, next) => {
  try {
    const filter = { schoolId: req.schoolId };
    if (req.query.staffId) filter.staffId = req.query.staffId;
    if (req.query.status) filter.status = req.query.status;
    const rows = await LeaveRequest.find(filter).sort({ createdAt: -1 });
    return sendSuccess(res, { data: rows });
  } catch (error) {
    return next(error);
  }
};

exports.getLopSummary = async (req, res, next) => {
  try {
    const { staffId, month, year, workingDays = 26 } = req.query;
    const staff = await Staff.findOne({ _id: staffId, schoolId: req.schoolId });
    if (!staff) return next(new AppError('Staff not found', 404, 'NOT_FOUND'));

    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);
    const absentDays = await Attendance.countDocuments({
      schoolId: req.schoolId,
      type: 'STAFF',
      staffId,
      date: { $gte: start, $lte: end },
      status: 'ABSENT'
    });
    const approvedLeaves = await LeaveRequest.countDocuments({
      schoolId: req.schoolId,
      staffId,
      status: 'APPROVED',
      leaveType: { $ne: 'LWP' },
      startDate: { $lte: end },
      endDate: { $gte: start }
    });

    const result = calculateLop({
      basic: staff.basic,
      workingDays: Number(workingDays),
      absentDays,
      approvedLeaveDays: approvedLeaves
    });
    return sendSuccess(res, { data: { staffId, month: Number(month), year: Number(year), absentDays, approvedLeaves, ...result } });
  } catch (error) {
    return next(error);
  }
};

// @desc    Get current teacher's own attendance (My Attendance)
// @route   GET /api/v1/attendance/my
// @access  TEACHER
exports.getMyAttendance = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return next(new AppError('month and year are required', 400, 'VALIDATION_ERROR'));
    }

    // Find the Staff record: prefer linkedStaffId, fallback to fullName match
    let staffRecord = null;
    if (req.user.linkedStaffId) {
      staffRecord = await Staff.findOne({ _id: req.user.linkedStaffId, schoolId: req.schoolId });
    }
    if (!staffRecord && req.user.fullName) {
      staffRecord = await Staff.findOne({
        schoolId: req.schoolId,
        name: { $regex: new RegExp(`^${req.user.fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        isActive: true
      });
    }

    if (!staffRecord) {
      return sendSuccess(res, {
        data: {
          staffId: null,
          staffName: req.user.fullName,
          records: [],
          summary: { present: 0, absent: 0, halfDay: 0, leave: 0 }
        }
      });
    }

    const start = new Date(Number(year), Number(month) - 1, 1);
    const end = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

    const records = await Attendance.find({
      schoolId: req.schoolId,
      type: 'STAFF',
      staffId: staffRecord._id,
      date: { $gte: start, $lte: end }
    }).sort({ date: 1 });

    const summary = { present: 0, absent: 0, halfDay: 0, leave: 0 };
    records.forEach(r => {
      if (r.status === 'PRESENT') summary.present++;
      else if (r.status === 'ABSENT') summary.absent++;
      else if (r.status === 'HALF_DAY') summary.halfDay++;
      else if (r.status === 'LEAVE') summary.leave++;
    });

    return sendSuccess(res, {
      data: {
        staffId: staffRecord._id,
        staffName: staffRecord.name,
        records,
        summary
      }
    });
  } catch (error) {
    return next(error);
  }
};

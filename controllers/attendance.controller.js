const Attendance = require('../models/Attendance.model');
const { sendSuccess } = require('../utils/apiResponse');

exports.bulkUpsertAttendance = async (req, res, next) => {
  try {
    const { type, date, records = [] } = req.body;
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

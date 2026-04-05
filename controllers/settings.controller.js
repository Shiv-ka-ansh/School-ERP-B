const Setting = require('../models/Setting.model');
const { sendSuccess } = require('../utils/apiResponse');
const Student = require('../models/Student.model');
const FeeStructure = require('../models/FeeStructure.model');
const auditService = require('../services/audit.service');
const User = require('../models/User.model');
const AppError = require('../utils/appError');

const getOrDefault = async (schoolId, key, defaultValue) => {
  const row = await Setting.findOne({ schoolId, key });
  return row ? row.value : defaultValue;
};

exports.getSchoolSettings = async (req, res, next) => {
  try {
    const schoolProfile = await getOrDefault(req.schoolId, 'schoolProfile', {});
    const academicYear = await getOrDefault(req.schoolId, 'academicYear', '');
    const printFormats = await getOrDefault(req.schoolId, 'printFormats', {});
    const gradingScale = await getOrDefault(req.schoolId, 'gradingScale', []);
    const alertRules = await getOrDefault(req.schoolId, 'alertRules', {
      consecutiveAbsenceThreshold: 3,
      feeReminderDays: 7,
      lowAttendancePercent: 75,
      tcBlockWithDue: true
    });
    return sendSuccess(res, { data: { schoolProfile, academicYear, printFormats, gradingScale, alertRules } });
  } catch (error) {
    return next(error);
  }
};

exports.upsertSetting = async (req, res, next) => {
  try {
    const { key, value, password } = req.body;

    if (key === 'academicYear') {
      if (req.user.role !== 'PRINCIPAL') {
        return next(new AppError('Only Principal can change the academic year', 403));
      }
      if (!password) {
        return next(new AppError('Password required to change academic year', 401));
      }
      const user = await User.findById(req.user._id).select('+password');
      if (!(await user.comparePassword(password))) {
        return next(new AppError('Incorrect password', 401));
      }
    }
    const row = await Setting.findOneAndUpdate(
      { schoolId: req.schoolId, key },
      { value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );
    return sendSuccess(res, { message: 'Setting saved successfully', data: row });
  } catch (error) {
    return next(error);
  }
};

const CLASS_ORDER = [
  'Nursery', 'LKG', 'UKG',
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'
];

exports.rolloverSession = async (req, res, next) => {
  try {
    const { targetYear, password } = req.body; // e.g. "2026-27"
    if (!targetYear) {
      return next(new AppError('targetYear is required', 400, 'VALIDATION_ERROR'));
    }

    if (req.user.role !== 'PRINCIPAL') {
      return next(new AppError('Only Principal can initiate session rollover', 403));
    }
    if (!password) {
      return next(new AppError('Password required for session rollover', 401));
    }
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(password))) {
      return next(new AppError('Incorrect password', 401));
    }

    // 1. Get current academic year
    const currentYearSetting = await Setting.findOne({ schoolId: req.schoolId, key: 'academicYear' });
    const currentYear = currentYearSetting?.value || '';

    // 2. Fetch all active students
    const students = await Student.find({ schoolId: req.schoolId, isActive: true, isDeleted: false });

    let promoted = 0, graduated = 0;

    // 3. Promote each student
    const bulkOps = students.map(student => {
      const idx = CLASS_ORDER.indexOf(student.currentClass);
      if (idx === -1) return null; // unknown class — skip

      if (student.currentClass === 'Class 10') {
        // Graduate
        graduated++;
        return {
          updateOne: {
            filter: { _id: student._id },
            update: {
              $set: {
                isActive: false,
                leftReason: 'Graduated/Passed Out',
                leftDate: new Date(),
                updatedBy: req.user._id
              }
            }
          }
        };
      } else {
        // Promote to next class
        promoted++;
        return {
          updateOne: {
            filter: { _id: student._id },
            update: {
              $set: {
                currentClass: CLASS_ORDER[idx + 1],
                updatedBy: req.user._id
              }
            }
          }
        };
      }
    }).filter(Boolean);

    if (bulkOps.length > 0) {
      await Student.bulkWrite(bulkOps, { ordered: false });
    }

    // 4. Duplicate fee structures for new year
    const oldStructures = await FeeStructure.find({ schoolId: req.schoolId, academicYear: currentYear });
    if (oldStructures.length > 0) {
      const newStructures = oldStructures.map(fs => ({
        schoolId: req.schoolId,
        className: fs.className,
        academicYear: targetYear,
        feeHeads: fs.feeHeads,
        totalMonthly: fs.totalMonthly,
        createdBy: req.user._id
      }));
      // Only insert if not already exists for targetYear
      for (const ns of newStructures) {
        await FeeStructure.findOneAndUpdate(
          { schoolId: req.schoolId, className: ns.className, academicYear: targetYear },
          ns,
          { upsert: true }
        );
      }
    }

    // 5. Update academic year setting
    await Setting.findOneAndUpdate(
      { schoolId: req.schoolId, key: 'academicYear' },
      { value: targetYear, updatedBy: req.user._id },
      { new: true, upsert: true }
    );

    // 6. Audit log
    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'SETTINGS',
      action: 'ROLLOVER',
      actionDescription: `Session rollover executed: ${currentYear} \u2192 ${targetYear}. Promoted: ${promoted}, Graduated (Alumni): ${graduated}`,
      targetCollection: 'Student',
      targetId: null,
      newValue: { targetYear, promoted, graduated },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      riskLevel: 'HIGH'
    });

    return sendSuccess(res, {
      message: `Rollover complete. ${promoted} students promoted, ${graduated} graduated to Alumni.`,
      data: { targetYear, promoted, graduated, feeStructuresCopied: oldStructures.length }
    });
  } catch (error) {
    return next(error);
  }
};

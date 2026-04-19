const TCRecord = require('../models/TCRecord.model');
const Student = require('../models/Student.model');
const Counter = require('../models/Counter.model');
const Setting = require('../models/Setting.model');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');
const auditService = require('../services/audit.service');

exports.generateTC = async (req, res, next) => {
  try {
    const {
      studentId, characterCertText = '', dateOfLeaving, lastExamAppeared, result,
      tcFrom, classAtAdmission, classLeft, nationality, category,
      qualifiedForPromotion, subjectsStudied, outstandingAchievements,
      generalConduct, reasonForLeaving, udiseCode, studentPEN, remarks
    } = req.body;

    const student = await Student.findOne({ _id: studentId, schoolId: req.schoolId, isDeleted: false });
    if (!student) {
      return next(new AppError('Student not found', 404, 'NOT_FOUND'));
    }

    const tcBlockSetting = await Setting.findOne({ schoolId: req.schoolId, key: 'tcBlockWithDue' });
    const tcBlockWithDue = tcBlockSetting ? Boolean(tcBlockSetting.value) : true;
    if (tcBlockWithDue && student.totalFeesDue > 0) {
      return next(new AppError('Cannot generate TC until fee dues are cleared', 400, 'TC_DUE_BLOCK'));
    }

    const seq = await Counter.findOneAndUpdate(
      { key: `tc-seq-${req.schoolId}` },
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    );
    const year = new Date().getFullYear();
    const tcNumber = `TCN-${year}-${String(seq.value).padStart(3, '0')}`;

    const tc = await TCRecord.create({
      schoolId: req.schoolId,
      tcNumber,
      studentId: student._id,
      issuedBy: req.user._id,
      issuedAt: new Date(),
      feesClearedAt: student.totalFeesDue <= 0 ? new Date() : null,
      characterCertText,
      dateOfLeaving: dateOfLeaving ? new Date(dateOfLeaving) : new Date(),
      lastExamAppeared: lastExamAppeared || '',
      result: result || 'Pass',
      status: 'ISSUED',
      tcFrom: tcFrom || '',
      classAtAdmission: classAtAdmission || student.admissionClass || '',
      classLeft: classLeft || student.currentClass || '',
      nationality: nationality || 'Indian',
      category: category || student.socialCategory || '',
      qualifiedForPromotion: qualifiedForPromotion || 'Yes',
      subjectsStudied: subjectsStudied || '',
      outstandingAchievements: outstandingAchievements || '',
      generalConduct: generalConduct || 'Good',
      reasonForLeaving: reasonForLeaving || '',
      udiseCode: udiseCode || '',
      studentPEN: studentPEN || student.studentPEN || '',
      remarks: remarks || ''
    });

    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'TC',
      action: 'CREATE',
      actionDescription: `Issued TC ${tcNumber} for ${student.studentId}`,
      targetCollection: 'TCRecord',
      targetId: tc._id,
      newValue: tc,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { statusCode: 201, message: 'TC generated successfully', data: tc });
  } catch (error) {
    return next(error);
  }
};

exports.getTCRegister = async (req, res, next) => {
  try {
    const filter = { schoolId: req.schoolId };
    const rows = await TCRecord.find(filter)
      .populate('studentId', 'studentId firstName lastName currentClass section dateOfBirth')
      .sort({ issuedAt: -1 });
    return sendSuccess(res, { data: rows });
  } catch (error) {
    return next(error);
  }
};

exports.reprintTC = async (req, res, next) => {
  try {
    const tc = await TCRecord.findOne({ _id: req.params.id, schoolId: req.schoolId }).populate(
      'studentId',
      'studentId admissionNumber firstName lastName fatherName motherName currentClass section dateOfBirth dateOfAdmission bloodGroup nationality socialCategory studentPEN aadharNumber address primaryContactPhone'
    );
    if (!tc) {
      return next(new AppError('TC not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, {
      data: {
        tc,
        student: tc.studentId,
        printTemplate: 'SMPS_TC_FORMAT'
      }
    });
  } catch (error) {
    return next(error);
  }
};

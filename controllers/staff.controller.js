const Staff = require('../models/Staff.model');
const Counter = require('../models/Counter.model');
const { createCrudController } = require('./crud.controller');
const auditService = require('../services/audit.service');
const { sendSuccess } = require('../utils/apiResponse');

const crud = createCrudController({ Model: Staff, moduleName: 'USERS', searchable: ['name', 'staffId', 'subject', 'department', 'phone'] });

// Custom create with auto-generated staffId
exports.createStaff = async (req, res, next) => {
  try {
    const schoolId = req.schoolId || req.user.schoolId;

    // Generate staffId using atomic counter (same pattern as students)
    const seq = await Counter.findOneAndUpdate(
      { key: `staff-seq-${schoolId}` },
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    );
    const seqNum = seq.value;
    const staffId = `STF-${new Date().getFullYear()}-${String(seqNum).padStart(3, '0')}`;

    const TEACHING_ROLES = ['Teacher', 'Principal', 'Vice Principal', 'Coordinator'];
    const roleType = req.body.roleType || (TEACHING_ROLES.includes(req.body.role) ? 'TEACHER' : 'NON_TEACHING');

    const payload = {
      ...req.body,
      roleType,
      staffId,
      schoolId,
      createdBy: req.user._id
    };

    const doc = await Staff.create(payload);

    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'USERS',
      action: 'CREATE',
      actionDescription: `Created staff record: ${doc.name} (${staffId})`,
      targetCollection: 'Staff',
      targetId: doc._id,
      newValue: doc,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return sendSuccess(res, { statusCode: 201, message: 'Staff created successfully', data: doc });
  } catch (error) {
    return next(error);
  }
};

exports.getStaff = crud.list;
exports.getStaffById = crud.getById;
exports.updateStaff = async (req, res, next) => {
  try {
    if (req.body.role) {
      const TEACHING_ROLES = ['Teacher', 'Principal', 'Vice Principal', 'Coordinator'];
      req.body.roleType = TEACHING_ROLES.includes(req.body.role) ? 'TEACHER' : 'NON_TEACHING';
    }
    return await crud.update(req, res, next);
  } catch (error) {
    next(error);
  }
};
exports.deleteStaff = crud.remove;

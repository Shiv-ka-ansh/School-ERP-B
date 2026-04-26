const Student = require('../models/Student.model');
const Counter = require('../models/Counter.model');
const auditService = require('../services/audit.service');
const cloudinaryService = require('../services/cloudinary.service');
const AppError = require('../utils/appError');
const FeeStructure = require('../models/FeeStructure.model');

// @desc    Create new student
// @route   POST /api/v1/students
// @access  Admin, Principal
exports.createStudent = async (req, res, next) => {
  try {
    const studentData = req.body;
    
    // Duplicate check: Same name, class, and mobile in the same school
    const existingStudent = await Student.findOne({
      schoolId: req.schoolId,
      firstName: studentData.firstName,
      lastName: studentData.lastName,
      currentClass: studentData.currentClass,
      primaryContactPhone: studentData.primaryContactPhone,
      isDeleted: false
    });

    if (existingStudent) {
      return next(new AppError('A student with this name, class, and contact number already exists.', 400, 'DUPLICATE_ERROR'));
    }

    // Generate studentId using atomic counter to avoid race conditions
    const seq = await Counter.findOneAndUpdate(
      { key: `student-seq-${req.schoolId}` },
      { $inc: { value: 1 } },
      { upsert: true, new: true }
    );
    const sequenceNumber = seq.value;
    studentData.studentId = `SMPS-${new Date().getFullYear()}-${String(sequenceNumber).padStart(3, '0')}`;
    
    // Generate admission number
    studentData.admissionNumber = `ADM-${new Date().getFullYear()}-${String(sequenceNumber).padStart(3, '0')}`;
    
    // Generate familyId for sibling detection
    studentData.familyId = `FAM-${studentData.primaryContactPhone}`;
    studentData.schoolId = req.schoolId;
    
    // Check for siblings
    const siblings = await Student.find({
      schoolId: req.schoolId,
      familyId: studentData.familyId,
      isDeleted: false
    });
    studentData.hasSiblings = siblings.length > 0;
    
    studentData.createdBy = req.user._id;

    const student = await Student.create(studentData);
    
    // After student is saved, try to set initial fee due from fee structure
    try {
      const feeStructure = await FeeStructure.findOne({
        schoolId: req.schoolId,
        $or: [
          { className: studentData.currentClass },
          { className: { $regex: new RegExp(`(^|,)\\s*${studentData.currentClass}\\s*(,|$)`) } }
        ]
      });
      
      if (feeStructure) {
        let monthlyTuition = feeStructure.monthlyTuition || 0;
        let annualChargesTotal = 0;
        
        if (monthlyTuition === 0 && feeStructure.feeHeads?.length > 0) {
          const tuitionHead = feeStructure.feeHeads.find(h => h.head.toLowerCase().includes('tuition'));
          if (tuitionHead) monthlyTuition = Number(tuitionHead.amount);
          annualChargesTotal = feeStructure.feeHeads
            .filter(h => !h.head.toLowerCase().includes('tuition'))
            .reduce((sum, h) => sum + Number(h.amount), 0);
        } else {
          annualChargesTotal = (feeStructure.annualCharges || [])
            .reduce((sum, c) => sum + Number(c.amount), 0);
        }
        
        const annualFeeTotal = (monthlyTuition * 12) + annualChargesTotal;
        if (annualFeeTotal > 0) {
          await Student.findByIdAndUpdate(student._id, { totalFeesDue: annualFeeTotal });
        }
      }
    } catch (e) {
      // Non-critical — don't fail student creation if fee structure not found
      console.error('Could not set initial fee due:', e.message);
    }

    // Log to audit trail
    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'STUDENT',
      action: 'CREATE',
      actionDescription: `Created new student: ${student.firstName} ${student.lastName} (${student.studentId})`,
      targetCollection: 'Student',
      targetId: student._id,
      newValue: student,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    
    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student,
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all students (paginated)
// @route   GET /api/v1/students
// @access  All authenticated users
exports.getStudents = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const filter = { isDeleted: false, schoolId: req.schoolId };
    if (req.query.class) filter.currentClass = req.query.class;
    if (req.query.section) filter.section = req.query.section;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    if (req.query.search) {
      filter.$or = [
        { firstName: { $regex: req.query.search, $options: 'i' } },
        { lastName: { $regex: req.query.search, $options: 'i' } },
        { studentId: { $regex: req.query.search, $options: 'i' } },
        { admissionNumber: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    const students = await Student.find(filter)
      .select('studentId admissionNumber firstName lastName fatherName dateOfBirth currentClass section rollNumber photoUrl primaryContactPhone totalFeesDue isActive')
      .sort({ rollNumber: 1 })
      .skip(skip)
      .limit(limit);
    
    const totalItems = await Student.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);
    
    res.status(200).json({
      success: true,
      message: 'Students fetched successfully',
      data: students,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get student by ID
// @route   GET /api/v1/students/:id
// @access  All authenticated users
exports.getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, isDeleted: false, schoolId: req.schoolId });
    
    if (!student) {
      return next(new AppError('Student not found', 404, 'NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update student
// @route   PUT /api/v1/students/:id
// @access  Admin, Principal
exports.updateStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, isDeleted: false, schoolId: req.schoolId });
    
    if (!student) {
      return next(new AppError('Student not found', 404, 'NOT_FOUND'));
    }

    const oldData = student.toObject();

    // Prevent updating sensitive fields directly
    delete req.body.studentId;
    delete req.body.admissionNumber;
    delete req.body.familyId;

    req.body.updatedBy = req.user._id;

    Object.assign(student, req.body);
    await student.save();

    // Log to audit trail
    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'STUDENT',
      action: 'UPDATE',
      actionDescription: `Updated student details: ${student.studentId}`,
      targetCollection: 'Student',
      targetId: student._id,
      oldValue: oldData,
      newValue: student,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(200).json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Soft delete student
// @route   DELETE /api/v1/students/:id
// @access  Principal
exports.deleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, isDeleted: false, schoolId: req.schoolId });
    
    if (!student) {
      return next(new AppError('Student not found', 404, 'NOT_FOUND'));
    }

    const oldData = student.toObject();

    student.isDeleted = true;
    student.isActive = false;
    student.deletedBy = req.user._id;
    student.deletedAt = new Date();
    await student.save();

    // Log to audit trail
    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'STUDENT',
      action: 'DELETE',
      actionDescription: `Deleted student: ${student.studentId}`,
      targetCollection: 'Student',
      targetId: student._id,
      oldValue: oldData,
      newValue: student,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      riskLevel: 'HIGH'
    });

    res.status(200).json({
      success: true,
      message: 'Student archived successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload student photo
// @route   POST /api/v1/students/:id/photo
// @access  Admin, Principal
exports.uploadPhoto = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, isDeleted: false, schoolId: req.schoolId });
    if (!student) {
      return next(new AppError('Student not found', 404, 'NOT_FOUND'));
    }
    
    if (!req.file) {
      return next(new AppError('Please upload an image file', 400, 'VALIDATION_ERROR'));
    }

    const oldData = student.toObject();
    
    const photoUrl = await cloudinaryService.uploadImage(req.file, {
      folder: 'smps/students',
      public_id: student.studentId
    });
    
    student.photoUrl = photoUrl;
    student.updatedBy = req.user._id;
    await student.save();
    
    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'STUDENT',
      action: 'UPDATE',
      actionDescription: `Uploaded photo for student: ${student.studentId}`,
      targetCollection: 'Student',
      targetId: student._id,
      oldValue: oldData,
      newValue: student,
      ipAddress: req.ip
    });
    
    res.status(200).json({
      success: true,
      message: 'Photo uploaded successfully',
      data: { photoUrl },
      timestamp: new Date()
    });
  } catch (error) {
    next(error);
  }
};

exports.promoteStudentsBulk = async (req, res, next) => {
  try {
    const { studentIds = [], targetClass, targetSection = 'A' } = req.body;
    const result = await Student.updateMany(
      { _id: { $in: studentIds }, schoolId: req.schoolId, isDeleted: false },
      { $set: { currentClass: targetClass, section: targetSection, updatedBy: req.user._id } }
    );
    res.status(200).json({
      success: true,
      message: 'Students promoted successfully',
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all soft-deleted students (Recycle Bin)
// @route   GET /api/v1/students/deleted
// @access  Principal only
exports.getDeletedStudents = async (req, res, next) => {
  try {
    const rows = await Student.find({ schoolId: req.schoolId, isDeleted: true })
      .select('studentId admissionNumber firstName lastName currentClass section deletedAt deletedBy')
      .populate('deletedBy', 'fullName username')
      .sort({ deletedAt: -1 });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently delete a soft-deleted student
// @route   DELETE /api/v1/students/:id/permanent
// @access  Principal only
exports.permanentDeleteStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, schoolId: req.schoolId, isDeleted: true });
    if (!student) return next(new AppError('Archived student not found', 404, 'NOT_FOUND'));

    await auditService.logAction({
      userId: req.user._id, username: req.user.username, userRole: req.user.role,
      module: 'STUDENT', action: 'DELETE',
      actionDescription: `Permanently deleted student: ${student.studentId}`,
      targetCollection: 'Student', targetId: student._id,
      oldValue: student.toObject(), ipAddress: req.ip,
      userAgent: req.get('user-agent'), riskLevel: 'CRITICAL'
    });

    await Student.deleteOne({ _id: student._id });
    res.status(200).json({ success: true, message: 'Student permanently deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Restore a soft-deleted student
// @route   PUT /api/v1/students/:id/restore
// @access  Principal only
exports.restoreStudent = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, schoolId: req.schoolId, isDeleted: true });
    if (!student) return next(new AppError('Archived student not found', 404, 'NOT_FOUND'));

    student.isDeleted = false;
    student.isActive = true;
    student.deletedBy = null;
    student.deletedAt = null;
    await student.save();

    await auditService.logAction({
      userId: req.user._id, username: req.user.username, userRole: req.user.role,
      module: 'STUDENT', action: 'UPDATE',
      actionDescription: `Restored student: ${student.studentId}`,
      targetCollection: 'Student', targetId: student._id,
      ipAddress: req.ip, userAgent: req.get('user-agent')
    });

    res.status(200).json({ success: true, message: 'Student restored successfully', data: student });
  } catch (error) {
    next(error);
  }
};

exports.getStudentDocuments = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.id, schoolId: req.schoolId, isDeleted: false });
    if (!student) {
      return next(new AppError('Student not found', 404, 'NOT_FOUND'));
    }
    res.status(200).json({
      success: true,
      data: {
        studentId: student._id,
        photoUrl: student.photoUrl || null,
        documents: []
      }
    });
  } catch (error) {
    next(error);
  }
};

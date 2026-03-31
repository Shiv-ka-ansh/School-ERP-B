const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    type: { type: String, enum: ['STUDENT', 'STAFF'], required: true },
    date: { type: Date, required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' },
    className: String,
    status: { type: String, enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY'], required: true },
    remarks: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

attendanceSchema.index({ schoolId: 1, type: 1, date: 1, studentId: 1 }, { unique: true, sparse: true });
attendanceSchema.index({ schoolId: 1, type: 1, date: 1, staffId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Attendance', attendanceSchema);

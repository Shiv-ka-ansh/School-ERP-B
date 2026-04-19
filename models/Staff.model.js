const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    name: { type: String, required: true, trim: true },
    roleType: { type: String, enum: ['TEACHER', 'NON_TEACHING'], default: 'TEACHER' },
    subject: String,
    department: String,
    qualification: String,
    joinDate: Date,
    dateOfBirth: Date,
    phone: String,
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    allowances: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Staff', staffSchema);

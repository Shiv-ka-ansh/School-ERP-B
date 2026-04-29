const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    staffId: { type: String, unique: true, sparse: true }, // e.g. STF-2026-001
    name: { type: String, required: true, trim: true },
    roleType: { type: String, enum: ['TEACHER', 'NON_TEACHING'], default: 'TEACHER' },
    role: { type: String, default: 'Teacher' },
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

staffSchema.index({ schoolId: 1, staffId: 1 });

module.exports = mongoose.model('Staff', staffSchema);

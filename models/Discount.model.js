const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    feeHead: String,
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true },
    reason: String,
    academicYear: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Discount', discountSchema);

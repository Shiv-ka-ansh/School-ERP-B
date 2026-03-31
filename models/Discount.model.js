const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    feeHead: String,
    type: { type: String, enum: ['percent', 'flat'], required: true },
    value: { type: Number, required: true },
    discountType: {
      type: String,
      enum: [
        'Academic Scholarship',
        'Sports',
        'Sibling',
        'Staff Ward',
        'BPL',
        'Merit',
        'Govt Scheme',
        'Custom'
      ],
      default: 'Custom'
    },
    applyTo: { type: String, enum: ['tuition', 'all_heads'], default: 'all_heads' },
    validity: { type: String, enum: ['one-time', 'monthly', 'yearly', 'custom'], default: 'custom' },
    validFrom: Date,
    validTo: Date,
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'revoked'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: Date,
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: String,
    revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    revokedAt: Date,
    reason: String,
    academicYear: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Discount', discountSchema);

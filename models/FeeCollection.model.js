const mongoose = require('mongoose');

const feeCollectionSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    mode: { type: String, enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'], default: 'CASH' },
    status: { type: String, enum: ['PAID', 'PENDING', 'FAILED'], default: 'PAID' },
    receiptNo: { type: String, required: true, unique: true },
    remarks: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeeCollection', feeCollectionSchema);

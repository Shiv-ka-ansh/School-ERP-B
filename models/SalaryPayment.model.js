const mongoose = require('mongoose');

const salaryPaymentSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ['CASH', 'UPI', 'BANK_TRANSFER'], default: 'BANK_TRANSFER' },
    paidDate: { type: Date, default: Date.now },
    remarks: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SalaryPayment', salaryPaymentSchema);

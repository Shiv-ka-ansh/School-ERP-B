const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    date: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    description: String,
    paymentMode: { type: String, enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'], default: 'CASH' },
    vendor: String,
    billNo: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);

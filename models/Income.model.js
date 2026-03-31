const mongoose = require('mongoose');

const incomeSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    source: { type: String, enum: ['FEE', 'GRANT', 'DONATION', 'RENT', 'CANTEEN', 'OTHER'], default: 'OTHER' },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    mode: { type: String, enum: ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'], default: 'CASH' },
    description: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Income', incomeSchema);

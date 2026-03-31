const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    category: { type: String, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    plannedAmount: { type: Number, required: true },
    notes: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

budgetSchema.index({ schoolId: 1, category: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);

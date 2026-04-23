const mongoose = require('mongoose');

const feeStructureSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    className: { type: String, required: true },
    academicYear: { type: String, required: true },
    
    // Legacy fields (kept for backward compatibility)
    feeHeads: [{ head: String, amount: Number, months: String }],
    totalMonthly: { type: Number, default: 0 },
    
    // New fields
    monthlyTuition: { type: Number, default: 0 },
    annualCharges: [{
      name: String,
      amount: Number
    }],
    
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('FeeStructure', feeStructureSchema);

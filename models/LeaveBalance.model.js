const mongoose = require('mongoose');

const leaveBalanceSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
    academicYear: { type: String, required: true },
    CL: { type: Number, default: 12 },
    SL: { type: Number, default: 8 },
    EL: { type: Number, default: 15 },
    usedCL: { type: Number, default: 0 },
    usedSL: { type: Number, default: 0 },
    usedEL: { type: Number, default: 0 }
  },
  { timestamps: true }
);

leaveBalanceSchema.index({ schoolId: 1, staffId: 1, academicYear: 1 }, { unique: true });

module.exports = mongoose.model('LeaveBalance', leaveBalanceSchema);

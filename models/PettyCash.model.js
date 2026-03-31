const mongoose = require('mongoose');

const pettyCashSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    date: { type: Date, default: Date.now },
    type: { type: String, enum: ['IN', 'OUT'], required: true },
    amount: { type: Number, required: true },
    description: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('PettyCash', pettyCashSchema);

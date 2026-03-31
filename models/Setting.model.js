const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

settingSchema.index({ schoolId: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('Setting', settingSchema);

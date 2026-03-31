const mongoose = require('mongoose');

const classSubjectSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    className: { type: String, required: true },
    subjects: [{ type: String, required: true }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

classSubjectSchema.index({ schoolId: 1, className: 1 }, { unique: true });

module.exports = mongoose.model('ClassSubject', classSubjectSchema);

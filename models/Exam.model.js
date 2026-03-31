const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    name: { type: String, required: true },
    examType: String,
    term: String,
    className: { type: String, required: true },
    subject: { type: String, required: true },
    date: { type: Date, required: true },
    maxMarks: { type: Number, default: 100 },
    theoryMax: { type: Number, default: 80 },
    projectMax: { type: Number, default: 20 },
    status: { type: String, enum: ['DRAFT', 'SCHEDULED', 'COMPLETED'], default: 'SCHEDULED' },
    academicYear: String,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Exam', examSchema);

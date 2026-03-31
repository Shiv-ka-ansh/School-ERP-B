const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    theoryMarks: { type: Number, default: 0 },
    projectMarks: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    absent: { type: Boolean, default: false },
    pass: { type: Boolean, default: true },
    grade: String,
    rank: Number,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

resultSchema.index({ schoolId: 1, examId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Result', resultSchema);

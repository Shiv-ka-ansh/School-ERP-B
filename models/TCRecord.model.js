const mongoose = require('mongoose');

const tcRecordSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    tcNumber: { type: String, required: true, unique: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    issuedAt: { type: Date, default: Date.now },
    feesClearedAt: Date,
    characterCertText: String,
    dateOfLeaving: Date,
    lastExamAppeared: String,
    result: { type: String, enum: ['Pass', 'Fail', 'Promoted', 'N/A'], default: 'Pass' },
    status: { type: String, enum: ['ISSUED', 'CANCELLED'], default: 'ISSUED' },
    remarks: String,
    // SMPS TC Format Fields
    tcFrom: String,
    classAtAdmission: String,
    classLeft: String,
    nationality: { type: String, default: 'Indian' },
    category: String,
    qualifiedForPromotion: { type: String, default: 'Yes' },
    subjectsStudied: String,
    outstandingAchievements: String,
    generalConduct: { type: String, default: 'Good' },
    reasonForLeaving: String,
    udiseCode: String,
    studentPEN: String,
  },
  { timestamps: true }
);

tcRecordSchema.index({ schoolId: 1, studentId: 1, issuedAt: -1 });

module.exports = mongoose.model('TCRecord', tcRecordSchema);

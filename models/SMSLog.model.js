const mongoose = require('mongoose');

const smsLogSchema = new mongoose.Schema(
  {
    schoolId: { type: String, required: true, default: 'smps_jhansi', index: true },
    recipient: { type: String, required: true },
    recipientType: { type: String, enum: ['STUDENT', 'PARENT', 'STAFF'], default: 'PARENT' },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['QUEUED', 'SENT', 'FAILED'], default: 'SENT' },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'SMSTemplate' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('SMSLog', smsLogSchema);

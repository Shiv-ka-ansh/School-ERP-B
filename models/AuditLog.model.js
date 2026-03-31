const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: String,
  role: String,
  action: { type: String, enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT'], required: true },
  module: { type: String, enum: ['STUDENT', 'FEE', 'STUDENT_ATTENDANCE', 'TEACHER_ATTENDANCE', 'EXAM', 'SALARY', 'SMS', 'SETTINGS', 'TC', 'DISCOUNT', 'FINANCE', 'CALENDAR', 'USERS'], required: true },
  
  // What changed
  entityType: String,
  entityId: mongoose.Schema.Types.ObjectId,
  actionDescription: String,
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  
  // Request metadata
  ipAddress: String,
  userAgent: String,
  endpoint: String,
  httpMethod: String,
  
  // Risk Level
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'], default: 'LOW' },
  timestamp: { type: Date, required: true, default: Date.now }
}, { timestamps: { createdAt: true, updatedAt: false } });

auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ module: 1 });
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ riskLevel: 1 });
auditLogSchema.index({ timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

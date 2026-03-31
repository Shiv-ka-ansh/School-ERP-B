const AuditLog = require('../models/AuditLog.model');
const logger = require('../utils/logger');

exports.logAction = async (auditData) => {
  try {
    const logEntry = new AuditLog({
      userId: auditData.userId,
      username: auditData.username,
      role: auditData.userRole,
      module: auditData.module,
      action: auditData.action,
      actionDescription: auditData.actionDescription,
      entityType: auditData.targetCollection,
      entityId: auditData.targetId,
      ipAddress: auditData.ipAddress,
      userAgent: auditData.userAgent,
      riskLevel: auditData.riskLevel || 'LOW',
      
      // Compute changes if old and new values are provided
      ...(auditData.oldValue && auditData.newValue && {
        changes: computeChanges(auditData.oldValue, auditData.newValue)
      })
    });
    
    await logEntry.save();
  } catch (error) {
    logger.error('Failed to save audit log:', error);
  }
};

const computeChanges = (oldObj, newObj) => {
  const changes = [];
  
  // Convert mongoose documents to plain objects if needed
  const oldPlain = oldObj.toObject ? oldObj.toObject() : oldObj;
  const newPlain = newObj.toObject ? newObj.toObject() : newObj;

  const allKeys = new Set([...Object.keys(oldPlain || {}), ...Object.keys(newPlain || {})]);
  
  allKeys.forEach(key => {
    // Ignore mongoose specific fields like _id, __v, timestamps
    if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key)) return;
    
    if (JSON.stringify(oldPlain[key]) !== JSON.stringify(newPlain[key])) {
      changes.push({
        field: key,
        oldValue: oldPlain[key],
        newValue: newPlain[key]
      });
    }
  });
  
  return changes;
};

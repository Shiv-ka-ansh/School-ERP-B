const AuditLog = require('../models/AuditLog.model');
const { sendSuccess } = require('../utils/apiResponse');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.module) filter.module = req.query.module;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.riskLevel) filter.riskLevel = req.query.riskLevel;
    const rows = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(1000);
    return sendSuccess(res, { data: rows });
  } catch (error) {
    return next(error);
  }
};

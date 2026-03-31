const AuditLog = require('../models/AuditLog.model');
const { sendSuccess } = require('../utils/apiResponse');

exports.getAuditLogs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.module) filter.module = req.query.module;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.riskLevel) filter.riskLevel = req.query.riskLevel;
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
    }
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 200);
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
      AuditLog.countDocuments(filter)
    ]);
    return sendSuccess(res, {
      data: rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit) || 1,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    return next(error);
  }
};

exports.exportAuditLogs = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.module) filter.module = req.query.module;
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate);
    }
    const rows = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(5000);
    return sendSuccess(res, { message: 'Audit logs export payload generated', data: rows });
  } catch (error) {
    return next(error);
  }
};

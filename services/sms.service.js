const SMSLog = require('../models/SMSLog.model');
const { sendFlowSms } = require('./msg91.service');
const logger = require('../utils/logger');

exports.dispatchSms = async ({ schoolId, recipient, message, templateId, createdBy, variables = {} }) => {
  const log = await SMSLog.create({
    schoolId,
    recipient,
    message,
    templateId,
    status: 'QUEUED',
    createdBy
  });

  try {
    await sendFlowSms({
      mobiles: `91${recipient}`,
      templateId,
      variables
    });
    log.status = 'SENT';
    log.sentAt = new Date();
    await log.save();
  } catch (error) {
    log.status = 'FAILED';
    await log.save();
    logger.error({ message: 'SMS dispatch failed', error: error.message, recipient });
  }

  return log;
};

exports.retryQueuedSms = async () => {
  const queuedLogs = await SMSLog.find({ status: { $in: ['QUEUED', 'FAILED'] } }).limit(100);
  for (const log of queuedLogs) {
    try {
      await sendFlowSms({ mobiles: `91${log.recipient}`, templateId: log.templateId });
      log.status = 'SENT';
      log.sentAt = new Date();
      await log.save();
    } catch (error) {
      log.status = 'FAILED';
      await log.save();
    }
  }
};

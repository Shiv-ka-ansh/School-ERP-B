const SMSTemplate = require('../models/SMSTemplate.model');
const SMSLog = require('../models/SMSLog.model');
const CalendarEvent = require('../models/CalendarEvent.model');
const { createCrudController } = require('./crud.controller');
const { sendSuccess } = require('../utils/apiResponse');
const { dispatchSms } = require('../services/sms.service');

const templateCrud = createCrudController({ Model: SMSTemplate, moduleName: 'SMS', searchable: ['title', 'content'] });
const calendarCrud = createCrudController({ Model: CalendarEvent, moduleName: 'CALENDAR', searchable: ['title', 'category'] });

exports.createSmsTemplate = templateCrud.create;
exports.getSmsTemplates = templateCrud.list;
exports.updateSmsTemplate = templateCrud.update;
exports.deleteSmsTemplate = templateCrud.remove;

exports.createCalendarEvent = calendarCrud.create;
exports.getCalendarEvents = calendarCrud.list;
exports.updateCalendarEvent = calendarCrud.update;
exports.deleteCalendarEvent = calendarCrud.remove;

exports.sendSms = async (req, res, next) => {
  try {
    const { recipient, message, templateId, variables = {} } = req.body;
    const log = await dispatchSms({
      schoolId: req.schoolId,
      recipient,
      message,
      templateId,
      variables,
      createdBy: req.user._id
    });
    return sendSuccess(res, { statusCode: 201, message: 'SMS dispatch attempted', data: log });
  } catch (error) {
    return next(error);
  }
};

exports.getSmsHistory = async (req, res, next) => {
  try {
    const logs = await SMSLog.find({ schoolId: req.schoolId }).sort({ sentAt: -1 }).limit(500);
    return sendSuccess(res, { data: logs });
  } catch (error) {
    return next(error);
  }
};

const express = require('express');
const {
  createSmsTemplate,
  getSmsTemplates,
  updateSmsTemplate,
  deleteSmsTemplate,
  createCalendarEvent,
  getCalendarEvents,
  deleteCalendarEvent,
  sendSms,
  getSmsHistory
} = require('../controllers/communication.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.route('/sms/templates').get(getSmsTemplates).post(authorize('ADMIN', 'PRINCIPAL'), createSmsTemplate);
router.route('/sms/templates/:id').put(authorize('ADMIN', 'PRINCIPAL'), updateSmsTemplate).delete(authorize('ADMIN', 'PRINCIPAL'), deleteSmsTemplate);
router.post('/sms/send', authorize('ADMIN', 'PRINCIPAL', 'TEACHER', 'ACCOUNTANT'), sendSms);
router.get('/sms/history', getSmsHistory);
router.route('/calendar').get(getCalendarEvents).post(authorize('ADMIN', 'PRINCIPAL'), createCalendarEvent);
router.delete('/calendar/:id', authorize('ADMIN', 'PRINCIPAL'), deleteCalendarEvent);

module.exports = router;

const express = require('express');
const {
  bulkUpsertAttendance,
  getAttendance,
  getAttendanceReport
} = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getAttendance);
router.post('/bulk', authorize('ADMIN', 'PRINCIPAL', 'TEACHER'), bulkUpsertAttendance);
router.get('/report', getAttendanceReport);

module.exports = router;

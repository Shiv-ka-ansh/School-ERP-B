const express = require('express');
const {
  bulkUpsertAttendance,
  getAttendance,
  getAttendanceReport,
  getMyAttendance,
  createLeaveRequest,
  approveLeaveRequest,
  getLeaveRequests,
  getLopSummary
} = require('../controllers/attendance.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getAttendance);
router.post('/bulk', authorize('ADMIN', 'PRINCIPAL', 'TEACHER'), bulkUpsertAttendance);
router.get('/my', getMyAttendance);
router.get('/report', getAttendanceReport);
router.get('/leave-requests', getLeaveRequests);
router.post('/leave-requests', authorize('ADMIN', 'PRINCIPAL', 'TEACHER'), createLeaveRequest);
router.put('/leave-requests/:id', authorize('ADMIN', 'PRINCIPAL'), approveLeaveRequest);
router.get('/lop-summary', authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), getLopSummary);

module.exports = router;

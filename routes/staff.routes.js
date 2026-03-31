const express = require('express');
const {
  createStaff,
  getStaff,
  getStaffById,
  updateStaff,
  deleteStaff
} = require('../controllers/staff.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.route('/').get(getStaff).post(authorize('ADMIN', 'PRINCIPAL'), createStaff);
router.route('/:id').get(getStaffById).put(authorize('ADMIN', 'PRINCIPAL'), updateStaff).delete(authorize('PRINCIPAL'), deleteStaff);

module.exports = router;

const express = require('express');
const {
  createSalaryPayment,
  getSalaryPayments,
  getSalaryPaymentById,
  updateSalaryPayment,
  deleteSalaryPayment
} = require('../controllers/payroll.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.route('/').get(getSalaryPayments).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createSalaryPayment);
router
  .route('/:id')
  .get(getSalaryPaymentById)
  .put(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), updateSalaryPayment)
  .delete(authorize('ADMIN', 'PRINCIPAL'), deleteSalaryPayment);

module.exports = router;

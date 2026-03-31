const express = require('express');
const {
  createIncome,
  getIncome,
  getIncomeById,
  updateIncome,
  deleteIncome
} = require('../controllers/income.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.route('/').get(getIncome).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createIncome);
router
  .route('/:id')
  .get(getIncomeById)
  .put(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), updateIncome)
  .delete(authorize('ADMIN', 'PRINCIPAL'), deleteIncome);

module.exports = router;

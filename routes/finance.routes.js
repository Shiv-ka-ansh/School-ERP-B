const express = require('express');
const {
  createFeeStructure,
  getFeeStructures,
  updateFeeStructure,
  deleteFeeStructure,
  createDiscount,
  getDiscounts,
  deleteDiscount,
  createExpense,
  getExpenses,
  deleteExpense,
  collectFee,
  getFeeCollections,
  getFeeDefaulters,
  getPnL
} = require('../controllers/finance.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.route('/fee-structures').get(getFeeStructures).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createFeeStructure);
router.route('/fee-structures/:id').put(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), updateFeeStructure).delete(authorize('ADMIN', 'PRINCIPAL'), deleteFeeStructure);
router.post('/collect', authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), collectFee);
router.get('/collections', getFeeCollections);
router.get('/defaulters', getFeeDefaulters);
router.route('/discounts').get(getDiscounts).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createDiscount);
router.delete('/discounts/:id', authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), deleteDiscount);
router.route('/expenses').get(getExpenses).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createExpense);
router.delete('/expenses/:id', authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), deleteExpense);
router.get('/pnl', getPnL);

module.exports = router;

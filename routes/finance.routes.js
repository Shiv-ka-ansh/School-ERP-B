const express = require('express');
const {
  createFeeStructure,
  getFeeStructures,
  updateFeeStructure,
  deleteFeeStructure,
  createDiscount,
  getDiscounts,
  updateDiscount,
  deleteDiscount,
  createExpense,
  getExpenses,
  deleteExpense,
  collectFee,
  getFeeCollections,
  getFeeReceipt,
  printReceipt,
  getCollectionSummary,
  getFeeDefaulters,
  getPnL,
  getFinanceSummary,
  getVendorLedger,
  approveDiscount,
  rejectDiscount,
  revokeDiscount,
  updateFeeCollection,
  deleteFeeCollection,
  getStudentFeeSummary
} = require('../controllers/finance.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validateFeeCollection } = require('../validators/finance.validator');

const router = express.Router();
router.use(protect);

router.route('/fee-structures').get(getFeeStructures).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createFeeStructure);
router.route('/fee-structures/:id').put(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), updateFeeStructure).delete(authorize('ADMIN', 'PRINCIPAL'), deleteFeeStructure);
router.post('/collect', authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), validateFeeCollection, collectFee);
router.get('/collections', getFeeCollections);
router.get('/collections/summary', getCollectionSummary);
router.put('/collections/:id', authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), updateFeeCollection);
router.delete('/collections/:id', authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), deleteFeeCollection);
router.get('/receipts/:id', getFeeReceipt);
router.get('/receipts/:id/print', printReceipt);
router.get('/defaulters', getFeeDefaulters);
router.get('/student-summary/:studentId', getStudentFeeSummary);
router.route('/discounts').get(getDiscounts).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createDiscount);
router.route('/discounts/:id')
  .put(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), updateDiscount)
  .delete(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), deleteDiscount);
router.post('/discounts/:id/approve', authorize('PRINCIPAL'), approveDiscount);
router.post('/discounts/:id/reject', authorize('PRINCIPAL'), rejectDiscount);
router.post('/discounts/:id/revoke', authorize('PRINCIPAL'), revokeDiscount);
router.route('/expenses').get(getExpenses).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createExpense);
router.delete('/expenses/:id', authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), deleteExpense);
router.get('/pnl', getPnL);
router.get('/summary', getFinanceSummary);
router.get('/vendor-ledger', getVendorLedger);

module.exports = router;

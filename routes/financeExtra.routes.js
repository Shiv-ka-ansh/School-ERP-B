const express = require('express');
const {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
  createPettyCash,
  getPettyCash,
  updatePettyCash,
  deletePettyCash
} = require('../controllers/financeExtra.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.route('/budget').get(getBudgets).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createBudget);
router.route('/budget/:id').put(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), updateBudget).delete(authorize('ADMIN', 'PRINCIPAL'), deleteBudget);

router.route('/petty-cash').get(getPettyCash).post(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), createPettyCash);
router.route('/petty-cash/:id').put(authorize('ADMIN', 'PRINCIPAL', 'ACCOUNTANT'), updatePettyCash).delete(authorize('ADMIN', 'PRINCIPAL'), deletePettyCash);

module.exports = router;

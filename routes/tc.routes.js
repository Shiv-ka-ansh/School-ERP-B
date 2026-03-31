const express = require('express');
const { generateTC, getTCRegister, reprintTC } = require('../controllers/tc.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.get('/', authorize('ADMIN', 'PRINCIPAL'), getTCRegister);
router.post('/', authorize('ADMIN', 'PRINCIPAL'), generateTC);
router.get('/:id/reprint', authorize('ADMIN', 'PRINCIPAL'), reprintTC);

module.exports = router;

const express = require('express');
const { getAuditLogs } = require('../controllers/audit.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);
router.get('/', authorize('ADMIN', 'PRINCIPAL'), getAuditLogs);

module.exports = router;

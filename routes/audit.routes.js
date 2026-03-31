const express = require('express');
const { getAuditLogs, exportAuditLogs } = require('../controllers/audit.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);
router.get('/', authorize('ADMIN', 'PRINCIPAL'), getAuditLogs);
router.get('/export', authorize('ADMIN', 'PRINCIPAL'), exportAuditLogs);

module.exports = router;

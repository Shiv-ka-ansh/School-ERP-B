const express = require('express');
const { getSchoolSettings, upsertSetting, rolloverSession } = require('../controllers/settings.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.get('/', getSchoolSettings);
router.put('/', authorize('ADMIN', 'PRINCIPAL'), upsertSetting);
router.post('/rollover', authorize('PRINCIPAL'), rolloverSession);

module.exports = router;

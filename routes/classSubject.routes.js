const express = require('express');
const {
  createClassSubject,
  getClassSubjects,
  getClassSubjectById,
  updateClassSubject,
  deleteClassSubject
} = require('../controllers/classSubject.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.route('/').get(getClassSubjects).post(authorize('ADMIN', 'PRINCIPAL'), createClassSubject);
router
  .route('/:id')
  .get(getClassSubjectById)
  .put(authorize('ADMIN', 'PRINCIPAL'), updateClassSubject)
  .delete(authorize('ADMIN', 'PRINCIPAL'), deleteClassSubject);

module.exports = router;

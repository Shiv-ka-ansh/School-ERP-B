const express = require('express');
const {
  createExam,
  getExams,
  updateExam,
  deleteExam,
  createSyllabus,
  getSyllabus,
  updateSyllabus,
  deleteSyllabus,
  bulkUpsertResults,
  getResultsByExam,
  getMeritList,
  getReportCard
} = require('../controllers/exam.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validateBulkResults } = require('../validators/exam.validator');

const router = express.Router();
router.use(protect);

router.route('/').get(getExams).post(authorize('ADMIN', 'PRINCIPAL', 'TEACHER'), createExam);
router.route('/:id').put(authorize('ADMIN', 'PRINCIPAL', 'TEACHER'), updateExam).delete(authorize('ADMIN', 'PRINCIPAL'), deleteExam);
router.post('/results/bulk', authorize('ADMIN', 'PRINCIPAL', 'TEACHER'), validateBulkResults, bulkUpsertResults);
router.get('/results/:examId', getResultsByExam);
router.get('/merit-list', getMeritList);
router.get('/report-card/:studentId', getReportCard);

router.route('/syllabus').get(getSyllabus).post(authorize('ADMIN', 'PRINCIPAL', 'TEACHER'), createSyllabus);
router
  .route('/syllabus/:id')
  .put(authorize('ADMIN', 'PRINCIPAL', 'TEACHER'), updateSyllabus)
  .delete(authorize('ADMIN', 'PRINCIPAL'), deleteSyllabus);

module.exports = router;

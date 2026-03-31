const express = require('express');
const { 
  createStudent, 
  getStudents, 
  getStudentById, 
  updateStudent, 
  deleteStudent,
  uploadPhoto,
  promoteStudentsBulk,
  getStudentDocuments
} = require('../controllers/student.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validateStudent } = require('../validators/student.validator');
const multer = require('multer');

// Configure multer for local temporary storage before Cloudinary upload
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image uploads are allowed'));
    }
    cb(null, true);
  }
});

const router = express.Router();

// Apply auth middleware to all student routes
router.use(protect);

router.route('/')
  .post(authorize('ADMIN', 'PRINCIPAL'), validateStudent, createStudent)
  .get(getStudents);

router.route('/:id')
  .get(getStudentById)
  .put(authorize('ADMIN', 'PRINCIPAL'), updateStudent)
  .delete(authorize('PRINCIPAL'), deleteStudent);

router.post('/:id/photo', authorize('ADMIN', 'PRINCIPAL'), upload.single('photo'), uploadPhoto);
router.post('/promote-bulk', authorize('ADMIN', 'PRINCIPAL'), promoteStudentsBulk);
router.get('/:id/documents', getStudentDocuments);

module.exports = router;

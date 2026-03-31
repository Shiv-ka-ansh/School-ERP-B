const express = require('express');
const {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getRoles,
  updatePermissions
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');

const router = express.Router();
router.use(protect);

router.get('/roles', authorize('ADMIN', 'PRINCIPAL'), getRoles);
router.put('/permissions', authorize('ADMIN', 'PRINCIPAL'), updatePermissions);
router.route('/').get(authorize('ADMIN', 'PRINCIPAL'), getUsers).post(authorize('ADMIN', 'PRINCIPAL'), createUser);
router
  .route('/:id')
  .get(authorize('ADMIN', 'PRINCIPAL'), getUserById)
  .put(authorize('ADMIN', 'PRINCIPAL'), updateUser)
  .delete(authorize('PRINCIPAL'), deleteUser);

module.exports = router;

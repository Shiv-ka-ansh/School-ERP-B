const User = require('../models/User.model');
const { createCrudController } = require('./crud.controller');
const AppError = require('../utils/appError');
const { sendSuccess } = require('../utils/apiResponse');

const crud = createCrudController({ Model: User, moduleName: 'USERS', searchable: ['username', 'fullName', 'email'] });

exports.createUser = crud.create;
exports.getUsers = crud.list;
exports.getUserById = crud.getById;
exports.updateUser = crud.update;
exports.deleteUser = crud.remove;

exports.getRoles = async (req, res, next) => {
  try {
    return sendSuccess(res, {
      data: ['PRINCIPAL', 'ADMIN', 'TEACHER', 'ACCOUNTANT', 'STAFF']
    });
  } catch (error) {
    return next(error);
  }
};

exports.updatePermissions = async (req, res, next) => {
  try {
    const { userId, permissions = [] } = req.body;
    if (!userId) {
      return next(new AppError('userId is required', 400, 'VALIDATION_ERROR'));
    }
    const user = await User.findOneAndUpdate(
      { _id: userId, schoolId: req.schoolId },
      { permissions },
      { new: true }
    );
    if (!user) {
      return next(new AppError('User not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, { message: 'Permissions updated successfully', data: user });
  } catch (error) {
    return next(error);
  }
};

exports.resetUserPassword = async (req, res, next) => {
  try {
    const { userId, newPassword } = req.body;
    if (!userId || !newPassword) {
      return next(new AppError('userId and newPassword are required', 400, 'VALIDATION_ERROR'));
    }
    const user = await User.findOne({ _id: userId, schoolId: req.schoolId }).select('+password');
    if (!user) return next(new AppError('User not found', 404, 'NOT_FOUND'));
    user.password = newPassword;
    await user.save();
    return sendSuccess(res, { message: 'Password reset successfully' });
  } catch (error) {
    return next(error);
  }
};

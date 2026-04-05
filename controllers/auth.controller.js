const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');
const auditService = require('../services/audit.service');

const generateToken = (userId, role, schoolId = 'smps_jhansi') => {
  return jwt.sign(
    { userId, role, schoolId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '8h' }
  );
};

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(new AppError('Please provide username and password', 400, 'VALIDATION_ERROR'));
    }

    // Include the password field in the query result
    const user = await User.findOne({ $or: [{ username }, { email: username }] }).select('+password');

    if (!user) {
      await auditService.logAction({
        userId: null,
        username: username || 'unknown',
        userRole: 'UNKNOWN',
        module: 'USERS',
        action: 'LOGIN',
        actionDescription: 'Username not found',
        targetCollection: 'User',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.originalUrl,
        httpMethod: req.method,
        riskLevel: 'HIGH'
      });
      return next(new AppError('Account not found with this Username / Email', 404, 'AUTH_INVALID'));
    }

    if (!(await user.comparePassword(password))) {
      await auditService.logAction({
        userId: user._id,
        username: user.username,
        userRole: user.role,
        module: 'USERS',
        action: 'LOGIN',
        actionDescription: 'Incorrect password',
        targetCollection: 'User',
        targetId: user._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        endpoint: req.originalUrl,
        httpMethod: req.method,
        riskLevel: 'HIGH'
      });
      return next(new AppError('Incorrect password', 401, 'AUTH_INVALID'));
    }

    if (!user.isActive) {
      return next(new AppError('User account is inactive', 401, 'AUTH_INVALID'));
    }

    const token = generateToken(user._id, user.role, user.schoolId);
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });
    await auditService.logAction({
      userId: user._id,
      username: user.username,
      userRole: user.role,
      module: 'USERS',
      action: 'LOGIN',
      actionDescription: 'Login successful',
      targetCollection: 'User',
      targetId: user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      endpoint: req.originalUrl,
      httpMethod: req.method
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          userId: user._id, 
          username: user.username,
          fullName: user.fullName,
          role: user.role,
          email: user.email,
          schoolId: user.schoolId,
          permissions: user.permissions
        },
        expiresIn: process.env.JWT_EXPIRY || '8h'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Current user profile fetched successfully',
      data: {
        userId: req.user._id,
        username: req.user.username,
        fullName: req.user.fullName,
        email: req.user.email,
        role: req.user.role,
        schoolId: req.user.schoolId,
        assignedClasses: req.user.assignedClasses,
        permissions: req.user.permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    await auditService.logAction({
      userId: req.user._id,
      username: req.user.username,
      userRole: req.user.role,
      module: 'USERS',
      action: 'LOGOUT',
      actionDescription: 'Logout successful',
      targetCollection: 'User',
      targetId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      endpoint: req.originalUrl,
      httpMethod: req.method
    });
    // Stateless JWTs mean logout is primarily client-side (discarding token)
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(new AppError('Please provide current and new password', 400, 'VALIDATION_ERROR'));
    }

    // Need to explicitly select password
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return next(new AppError('Incorrect current password', 401, 'AUTH_INVALID'));
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

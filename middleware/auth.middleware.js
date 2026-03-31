const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AppError = require('../utils/appError');

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 1. Check if token exists in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return next(new AppError('Not authorized to access this route', 401, 'AUTH_REQUIRED'));
    }
    
    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Check if user still exists
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return next(new AppError('User no longer exists or is inactive', 401, 'AUTH_INVALID'));
    }
    
    // 4. Attach user to request
    req.user = user;
    req.schoolId = decoded.schoolId || user.schoolId || 'smps_jhansi';
    next();
    
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid token', 401, 'AUTH_INVALID'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expired. Please login again.', 401, 'AUTH_INVALID'));
    }
    next(error);
  }
};

exports.requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Not authorized to access this route', 401, 'AUTH_REQUIRED'));
    }

    if (req.user.role === 'PRINCIPAL' || req.user.role === 'ADMIN') {
      return next();
    }

    const currentPermissions = req.user.permissions || [];
    const hasPermission = permissions.some((p) => currentPermissions.includes(p));

    if (!hasPermission) {
      return next(new AppError('Missing required permission', 403, 'AUTH_FORBIDDEN'));
    }

    return next();
  };
};

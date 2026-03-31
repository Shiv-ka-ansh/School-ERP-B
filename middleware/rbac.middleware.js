const AppError = require('../utils/appError');

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(
        new AppError('User role is not authorized to access this route', 403, 'AUTH_FORBIDDEN')
      );
    }
    next();
  };
};

const { sendError } = require('../utils/apiResponse');

exports.notFoundHandler = (req, res) => {
  return sendError(res, {
    statusCode: 404,
    message: 'API endpoint not found',
    code: 'NOT_FOUND'
  });
};

const Setting = require('../models/Setting.model');
const { sendSuccess } = require('../utils/apiResponse');

const getOrDefault = async (schoolId, key, defaultValue) => {
  const row = await Setting.findOne({ schoolId, key });
  return row ? row.value : defaultValue;
};

exports.getSchoolSettings = async (req, res, next) => {
  try {
    const schoolProfile = await getOrDefault(req.schoolId, 'schoolProfile', {});
    const academicYear = await getOrDefault(req.schoolId, 'academicYear', '');
    const printFormats = await getOrDefault(req.schoolId, 'printFormats', {});
    return sendSuccess(res, { data: { schoolProfile, academicYear, printFormats } });
  } catch (error) {
    return next(error);
  }
};

exports.upsertSetting = async (req, res, next) => {
  try {
    const { key, value } = req.body;
    const row = await Setting.findOneAndUpdate(
      { schoolId: req.schoolId, key },
      { value, updatedBy: req.user._id },
      { new: true, upsert: true }
    );
    return sendSuccess(res, { message: 'Setting saved successfully', data: row });
  } catch (error) {
    return next(error);
  }
};

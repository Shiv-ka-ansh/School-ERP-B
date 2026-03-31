const Exam = require('../models/Exam.model');
const Result = require('../models/Result.model');
const Syllabus = require('../models/Syllabus.model');
const { createCrudController } = require('./crud.controller');
const { sendSuccess } = require('../utils/apiResponse');

const examCrud = createCrudController({ Model: Exam, moduleName: 'EXAM', searchable: ['name', 'term', 'className', 'subject'] });
const syllabusCrud = createCrudController({ Model: Syllabus, moduleName: 'EXAM', searchable: ['className', 'subject', 'chapterName'] });

exports.createExam = examCrud.create;
exports.getExams = examCrud.list;
exports.updateExam = examCrud.update;
exports.deleteExam = examCrud.remove;

exports.createSyllabus = syllabusCrud.create;
exports.getSyllabus = syllabusCrud.list;
exports.updateSyllabus = syllabusCrud.update;
exports.deleteSyllabus = syllabusCrud.remove;

exports.bulkUpsertResults = async (req, res, next) => {
  try {
    const { examId, results = [] } = req.body;
    const ops = results.map((r) => {
      const totalMarks = (r.theoryMarks || 0) + (r.projectMarks || 0);
      return {
        updateOne: {
          filter: { schoolId: req.schoolId, examId, studentId: r.studentId },
          update: {
            $set: {
              ...r,
              schoolId: req.schoolId,
              examId,
              totalMarks,
              updatedBy: req.user._id
            },
            $setOnInsert: { createdBy: req.user._id }
          },
          upsert: true
        }
      };
    });
    const result = await Result.bulkWrite(ops, { ordered: false });
    return sendSuccess(res, { message: 'Results saved successfully', data: result });
  } catch (error) {
    return next(error);
  }
};

exports.getResultsByExam = async (req, res, next) => {
  try {
    const rows = await Result.find({ schoolId: req.schoolId, examId: req.params.examId });
    return sendSuccess(res, { data: rows });
  } catch (error) {
    return next(error);
  }
};

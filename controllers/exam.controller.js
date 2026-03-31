const Exam = require('../models/Exam.model');
const Result = require('../models/Result.model');
const Syllabus = require('../models/Syllabus.model');
const Student = require('../models/Student.model');
const { createCrudController } = require('./crud.controller');
const { sendSuccess } = require('../utils/apiResponse');
const AppError = require('../utils/appError');

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
    const exam = await Exam.findOne({ _id: examId, schoolId: req.schoolId });
    if (!exam) return next(new AppError('Exam not found', 404, 'NOT_FOUND'));
    const minPassMarks = Number(req.body.minPassMarks || 33);

    const gradeFor = (percentage) => {
      if (percentage >= 90) return 'A+';
      if (percentage >= 80) return 'A';
      if (percentage >= 70) return 'B+';
      if (percentage >= 60) return 'B';
      if (percentage >= 50) return 'C';
      if (percentage >= 40) return 'D';
      return 'F';
    };

    const ops = results.map((r) => {
      const totalMarks = (r.theoryMarks || 0) + (r.projectMarks || 0);
      const percentage = Number(((totalMarks / (exam.maxMarks || 100)) * 100).toFixed(2));
      const grade = gradeFor(percentage);
      const pass = totalMarks >= minPassMarks && !r.absent;
      return {
        updateOne: {
          filter: { schoolId: req.schoolId, examId, studentId: r.studentId },
          update: {
            $set: {
              ...r,
              schoolId: req.schoolId,
              examId,
              totalMarks,
              percentage,
              grade,
              pass,
              updatedBy: req.user._id
            },
            $setOnInsert: { createdBy: req.user._id }
          },
          upsert: true
        }
      };
    });
    const result = await Result.bulkWrite(ops, { ordered: false });
    const scoreRows = await Result.find({ schoolId: req.schoolId, examId }).sort({ totalMarks: -1, updatedAt: 1 });
    let rank = 0;
    let lastMarks = null;
    for (let i = 0; i < scoreRows.length; i += 1) {
      const row = scoreRows[i];
      if (lastMarks === null || row.totalMarks < lastMarks) {
        rank = i + 1;
      }
      lastMarks = row.totalMarks;
      row.rank = rank;
      await row.save();
    }
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

exports.getMeritList = async (req, res, next) => {
  try {
    const { examId } = req.query;
    const rows = await Result.find({ schoolId: req.schoolId, examId })
      .populate('studentId', 'firstName lastName currentClass section')
      .sort({ rank: 1, totalMarks: -1 });
    return sendSuccess(res, { data: rows.slice(0, Number(req.query.limit || 20)) });
  } catch (error) {
    return next(error);
  }
};

exports.getReportCard = async (req, res, next) => {
  try {
    const student = await Student.findOne({ _id: req.params.studentId, schoolId: req.schoolId, isDeleted: false });
    if (!student) return next(new AppError('Student not found', 404, 'NOT_FOUND'));
    const results = await Result.find({ schoolId: req.schoolId, studentId: req.params.studentId }).populate(
      'examId',
      'name term subject date maxMarks'
    );
    return sendSuccess(res, {
      data: {
        student,
        results,
        summary: {
          totalSubjects: results.length,
          averagePercentage: results.length
            ? Number((results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length).toFixed(2))
            : 0
        }
      }
    });
  } catch (error) {
    return next(error);
  }
};

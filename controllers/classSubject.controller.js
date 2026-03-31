const ClassSubject = require('../models/ClassSubject.model');
const { createCrudController } = require('./crud.controller');

const crud = createCrudController({
  Model: ClassSubject,
  moduleName: 'SETTINGS',
  searchable: ['className', 'subjects']
});

exports.createClassSubject = crud.create;
exports.getClassSubjects = crud.list;
exports.getClassSubjectById = crud.getById;
exports.updateClassSubject = crud.update;
exports.deleteClassSubject = crud.remove;

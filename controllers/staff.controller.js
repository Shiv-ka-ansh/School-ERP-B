const Staff = require('../models/Staff.model');
const { createCrudController } = require('./crud.controller');

const crud = createCrudController({ Model: Staff, moduleName: 'USERS', searchable: ['name', 'subject', 'department'] });

exports.createStaff = crud.create;
exports.getStaff = crud.list;
exports.getStaffById = crud.getById;
exports.updateStaff = crud.update;
exports.deleteStaff = crud.remove;

const Income = require('../models/Income.model');
const { createCrudController } = require('./crud.controller');

const crud = createCrudController({ Model: Income, moduleName: 'FINANCE', searchable: ['source', 'description'] });

exports.createIncome = crud.create;
exports.getIncome = crud.list;
exports.getIncomeById = crud.getById;
exports.updateIncome = crud.update;
exports.deleteIncome = crud.remove;

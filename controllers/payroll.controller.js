const SalaryPayment = require('../models/SalaryPayment.model');
const { createCrudController } = require('./crud.controller');

const crud = createCrudController({ Model: SalaryPayment, moduleName: 'SALARY' });

exports.createSalaryPayment = crud.create;
exports.getSalaryPayments = crud.list;
exports.getSalaryPaymentById = crud.getById;
exports.updateSalaryPayment = crud.update;
exports.deleteSalaryPayment = crud.remove;

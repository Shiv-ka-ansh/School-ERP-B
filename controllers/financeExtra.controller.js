const Budget = require('../models/Budget.model');
const PettyCash = require('../models/PettyCash.model');
const { createCrudController } = require('./crud.controller');

const budgetCrud = createCrudController({ Model: Budget, moduleName: 'FINANCE', searchable: ['category'] });
const pettyCashCrud = createCrudController({ Model: PettyCash, moduleName: 'FINANCE', searchable: ['description'] });

exports.createBudget = budgetCrud.create;
exports.getBudgets = budgetCrud.list;
exports.updateBudget = budgetCrud.update;
exports.deleteBudget = budgetCrud.remove;

exports.createPettyCash = pettyCashCrud.create;
exports.getPettyCash = pettyCashCrud.list;
exports.updatePettyCash = pettyCashCrud.update;
exports.deletePettyCash = pettyCashCrud.remove;

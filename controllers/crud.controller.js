const AppError = require('../utils/appError');
const auditService = require('../services/audit.service');
const { getPagination, getSort } = require('../utils/queryBuilder');
const { sendSuccess } = require('../utils/apiResponse');

exports.createCrudController = ({ Model, moduleName, searchable = [] }) => {
  const schoolFilter = (req) => ({ schoolId: req.schoolId || req.user.schoolId });

  return {
    create: async (req, res, next) => {
      try {
        const payload = { ...req.body, schoolId: req.schoolId || req.user.schoolId, createdBy: req.user._id };
        const doc = await Model.create(payload);
        await auditService.logAction({
          userId: req.user._id,
          username: req.user.username,
          userRole: req.user.role,
          module: moduleName,
          action: 'CREATE',
          actionDescription: `Created ${moduleName} record`,
          targetCollection: Model.modelName,
          targetId: doc._id,
          newValue: doc,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
        return sendSuccess(res, { statusCode: 201, message: 'Created successfully', data: doc });
      } catch (error) {
        return next(error);
      }
    },
    list: async (req, res, next) => {
      try {
        const { page, limit, skip } = getPagination(req.query);
        const filter = schoolFilter(req);
        if (req.query.search && searchable.length) {
          filter.$or = searchable.map((f) => ({ [f]: { $regex: req.query.search, $options: 'i' } }));
        }
        const rows = await Model.find(filter).sort(getSort(req.query)).skip(skip).limit(limit);
        const totalItems = await Model.countDocuments(filter);
        return sendSuccess(res, {
          message: 'Data fetched successfully',
          data: rows,
          pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit) || 1,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page * limit < totalItems,
            hasPrevPage: page > 1
          }
        });
      } catch (error) {
        return next(error);
      }
    },
    getById: async (req, res, next) => {
      try {
        const doc = await Model.findOne({ _id: req.params.id, ...schoolFilter(req) });
        if (!doc) {
          return next(new AppError('Resource not found', 404, 'NOT_FOUND'));
        }
        return sendSuccess(res, { data: doc });
      } catch (error) {
        return next(error);
      }
    },
    update: async (req, res, next) => {
      try {
        const doc = await Model.findOne({ _id: req.params.id, ...schoolFilter(req) });
        if (!doc) {
          return next(new AppError('Resource not found', 404, 'NOT_FOUND'));
        }
        const oldDoc = doc.toObject();
        Object.assign(doc, req.body, { updatedBy: req.user._id });
        await doc.save();
        await auditService.logAction({
          userId: req.user._id,
          username: req.user.username,
          userRole: req.user.role,
          module: moduleName,
          action: 'UPDATE',
          actionDescription: `Updated ${moduleName} record`,
          targetCollection: Model.modelName,
          targetId: doc._id,
          oldValue: oldDoc,
          newValue: doc,
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        });
        return sendSuccess(res, { message: 'Updated successfully', data: doc });
      } catch (error) {
        return next(error);
      }
    },
    remove: async (req, res, next) => {
      try {
        const doc = await Model.findOneAndDelete({ _id: req.params.id, ...schoolFilter(req) });
        if (!doc) {
          return next(new AppError('Resource not found', 404, 'NOT_FOUND'));
        }
        await auditService.logAction({
          userId: req.user._id,
          username: req.user.username,
          userRole: req.user.role,
          module: moduleName,
          action: 'DELETE',
          actionDescription: `Deleted ${moduleName} record`,
          targetCollection: Model.modelName,
          targetId: doc._id,
          oldValue: doc,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          riskLevel: 'MEDIUM'
        });
        return sendSuccess(res, { message: 'Deleted successfully', data: doc });
      } catch (error) {
        return next(error);
      }
    }
  };
};

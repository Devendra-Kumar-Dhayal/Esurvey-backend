const express = require('express');
const { body, param, query } = require('express-validator');
const {
  adminLogin,
  getAdminProfile,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  resetUserPassword,
  deleteUser,
  getDashboardStats,
  createAdmin,
  createDropdownOption,
  getAllDropdownOptions,
  getDropdownOptionById,
  updateDropdownOption,
  deleteDropdownOption,
  reorderDropdownOptions,
} = require('../controllers/admin.controller');
const {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  getAvailablePermissions,
  getDefaultRole,
  getUsersByRole,
} = require('../controllers/role.controller');
const { protectAdmin, requireSuperAdmin } = require('../middleware/admin.middleware');
const { handleValidationErrors } = require('../middleware/validation.middleware');

const router = express.Router();

// Validation rules
const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

const createUserValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  handleValidationErrors,
];

const updateUserValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('email').optional().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  handleValidationErrors,
];

const resetPasswordValidation = [
  param('id').isMongoId().withMessage('Invalid user ID'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors,
];

const createAdminValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isMongoId().withMessage('Invalid role ID'),
  handleValidationErrors,
];

const createRoleValidation = [
  body('name').trim().notEmpty().withMessage('Role name is required'),
  body('description').optional().trim(),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be boolean'),
  handleValidationErrors,
];

const updateRoleValidation = [
  param('id').isMongoId().withMessage('Invalid role ID'),
  body('name').optional().trim().notEmpty().withMessage('Role name cannot be empty'),
  body('description').optional().trim(),
  body('permissions').optional().isArray().withMessage('Permissions must be an array'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be boolean'),
  handleValidationErrors,
];

const createDropdownOptionValidation = [
  body('type')
    .isIn(['project', 'way_bridge', 'loading_point', 'unloading_point'])
    .withMessage('Type must be project, way_bridge, loading_point, or unloading_point'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('code').optional().trim(),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  handleValidationErrors,
];

const updateDropdownOptionValidation = [
  param('id').isMongoId().withMessage('Invalid option ID'),
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('code').optional().trim(),
  body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  handleValidationErrors,
];

const reorderDropdownOptionsValidation = [
  body('options').isArray({ min: 1 }).withMessage('Options array is required'),
  body('options.*.id').isMongoId().withMessage('Each option must have a valid ID'),
  body('options.*.order').isInt({ min: 0 }).withMessage('Each option must have a valid order'),
  handleValidationErrors,
];

// Public routes
router.post('/login', loginValidation, adminLogin);

// Protected routes
router.use(protectAdmin);

router.get('/profile', getAdminProfile);
router.get('/dashboard', getDashboardStats);

// User management
router.post('/users', createUserValidation, createUser);
router.get('/users', getAllUsers);
router.get('/users/:id', param('id').isMongoId(), handleValidationErrors, getUserById);
router.put('/users/:id', updateUserValidation, updateUser);
router.post('/users/:id/reset-password', resetPasswordValidation, resetUserPassword);
router.delete('/users/:id', param('id').isMongoId(), handleValidationErrors, deleteUser);

// Role management
router.get('/roles/permissions', getAvailablePermissions);
router.get('/roles/default', getDefaultRole);
router.post('/roles', createRoleValidation, createRole);
router.get('/roles', getAllRoles);
router.get('/roles/:id', param('id').isMongoId(), handleValidationErrors, getRoleById);
router.put('/roles/:id', updateRoleValidation, updateRole);
router.delete('/roles/:id', param('id').isMongoId(), handleValidationErrors, deleteRole);
router.get('/roles/:id/users', param('id').isMongoId(), handleValidationErrors, getUsersByRole);

// Dropdown options management
router.post('/dropdown-options', createDropdownOptionValidation, createDropdownOption);
router.get('/dropdown-options', getAllDropdownOptions);
router.get('/dropdown-options/:id', param('id').isMongoId(), handleValidationErrors, getDropdownOptionById);
router.put('/dropdown-options/:id', updateDropdownOptionValidation, updateDropdownOption);
router.delete('/dropdown-options/:id', param('id').isMongoId(), handleValidationErrors, deleteDropdownOption);
router.post('/dropdown-options/reorder', reorderDropdownOptionsValidation, reorderDropdownOptions);

// Superadmin only
router.post('/admins', requireSuperAdmin, createAdminValidation, createAdmin);

module.exports = router;

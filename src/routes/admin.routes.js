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
} = require('../controllers/admin.controller');
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
  body('role').optional().isIn(['admin', 'superadmin']).withMessage('Invalid role'),
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

// Superadmin only
router.post('/admins', requireSuperAdmin, createAdminValidation, createAdmin);

module.exports = router;

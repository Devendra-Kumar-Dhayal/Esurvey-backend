const express = require('express');
const { body, param } = require('express-validator');
const {
  saveSelection,
  getActiveSelection,
  getSelectionHistory,
  deactivateSelection,
  getDropdownOptions,
} = require('../controllers/selection.controller');
const { protect } = require('../middleware/auth.middleware');
const { handleValidationErrors } = require('../middleware/validation.middleware');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Validation
const saveSelectionValidation = [
  body('projectId').isMongoId().withMessage('Valid project ID is required'),
  body('selectionType')
    .isIn(['way_bridge', 'loading_point', 'unloading_point'])
    .withMessage('Selection type must be way_bridge, loading_point, or unloading_point'),
  body('selectionId').isMongoId().withMessage('Valid selection ID is required'),
  handleValidationErrors,
];

// Routes
router.get('/options', getDropdownOptions);
router.post('/', saveSelectionValidation, saveSelection);
router.get('/active', getActiveSelection);
router.get('/history', getSelectionHistory);
router.put('/:id/deactivate', param('id').isMongoId(), handleValidationErrors, deactivateSelection);

module.exports = router;

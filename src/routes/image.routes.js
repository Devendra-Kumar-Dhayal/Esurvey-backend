const express = require('express');
const { param } = require('express-validator');
const {
  upload,
  uploadUnloadingPointImage,
  getImage,
  getImageByUnloadingPointDataId,
  deleteImage,
} = require('../controllers/image.controller');
const { protect } = require('../middleware/auth.middleware');
const { protectAdmin } = require('../middleware/admin.middleware');
const { handleValidationErrors } = require('../middleware/validation.middleware');
const { sendError } = require('../utils/response');

const router = express.Router();

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return sendError(res, 'File too large. Maximum size is 10MB.', 400);
    }
    if (err.message) {
      return sendError(res, err.message, 400);
    }
    return sendError(res, 'Error uploading file', 400);
  }
  next();
};

// Public route - get image by filename (for viewing in admin panel)
router.get(
  '/unloading-point/:filename',
  getImage
);

// Protected routes (require user authentication)
router.post(
  '/unloading-point/:unloadingPointDataId',
  protect,
  param('unloadingPointDataId').isMongoId().withMessage('Invalid unloading point data ID'),
  handleValidationErrors,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        return handleMulterError(err, req, res, next);
      }
      next();
    });
  },
  uploadUnloadingPointImage
);

// Get image by unloading point data ID (admin only)
router.get(
  '/unloading-point/by-id/:unloadingPointDataId',
  protectAdmin,
  param('unloadingPointDataId').isMongoId().withMessage('Invalid unloading point data ID'),
  handleValidationErrors,
  getImageByUnloadingPointDataId
);

// Delete image (admin only)
router.delete(
  '/unloading-point/:unloadingPointDataId',
  protectAdmin,
  param('unloadingPointDataId').isMongoId().withMessage('Invalid unloading point data ID'),
  handleValidationErrors,
  deleteImage
);

module.exports = router;

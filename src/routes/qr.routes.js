const express = require('express');
const { body, param, query } = require('express-validator');
const {
  checkQR,
  associateVehicle,
  startTrip,
  getActiveTrip,
  endTrip,
  cancelTrip,
  getTripHistory,
} = require('../controllers/qr.controller');
const { protect } = require('../middleware/auth.middleware');
const { handleValidationErrors } = require('../middleware/validation.middleware');

const router = express.Router();

// Validation rules
const checkQRValidation = [
  body('qrCode').trim().notEmpty().withMessage('QR code is required'),
  handleValidationErrors,
];

const associateVehicleValidation = [
  body('qrCode').trim().notEmpty().withMessage('QR code is required'),
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  handleValidationErrors,
];

const startTripValidation = [
  body('qrCode').trim().notEmpty().withMessage('QR code is required'),
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('projectId').isMongoId().withMessage('Valid project ID is required'),
  body('selectionType')
    .isIn(['way_bridge', 'loading_point', 'unloading_point'])
    .withMessage('Valid selection type is required'),
  body('selectionId').isMongoId().withMessage('Valid selection ID is required'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  handleValidationErrors,
];

const endTripValidation = [
  body('tripId').isMongoId().withMessage('Valid trip ID is required'),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('notes').optional().trim(),
  handleValidationErrors,
];

const cancelTripValidation = [
  body('tripId').isMongoId().withMessage('Valid trip ID is required'),
  handleValidationErrors,
];

// All routes require authentication
router.use(protect);

// QR and Vehicle routes
router.post('/check', checkQRValidation, checkQR);
router.post('/associate', associateVehicleValidation, associateVehicle);

// Trip routes
router.post('/start-trip', startTripValidation, startTrip);
router.get('/active-trip', getActiveTrip);
router.post('/end-trip', endTripValidation, endTrip);
router.post('/cancel-trip', cancelTripValidation, cancelTrip);
router.get('/trips', getTripHistory);

module.exports = router;

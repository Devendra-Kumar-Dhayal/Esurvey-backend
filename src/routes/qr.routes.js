const express = require('express');
const { body, param, query } = require('express-validator');
const {
  checkQR,
  checkVehicle,
  associateQRToVehicle,
  assignTransporter,
  associateVehicle,
  startTrip,
  getActiveTrip,
  endTrip,
  cancelTrip,
  getTripHistory,
  getTransporters,
  getLoadingPoints,
  getWBLoadingPoints,
  getProjects,
  saveWayBridgeData,
  getWayBridgeDataHistory,
  saveLoadingPointData,
  getLoadingPointDataHistory,
  checkVehicleActiveTrip,
  getActiveTripByVehicle,
  getUnloadingPoints,
  saveUnloadingPointData,
  getUnloadingPointDataHistory,
  logMissingLoadingPoint,
  getMissingLoadingPointEntries,
} = require('../controllers/qr.controller');
const { protect } = require('../middleware/auth.middleware');
const { handleValidationErrors } = require('../middleware/validation.middleware');

const router = express.Router();

// Validation rules
const checkQRValidation = [
  body('qrCode').trim().notEmpty().withMessage('QR code is required'),
  handleValidationErrors,
];

const associateQRToVehicleValidation = [
  body('qrCode').trim().notEmpty().withMessage('QR code is required'),
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  handleValidationErrors,
];

const assignTransporterValidation = [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('transporterId').isMongoId().withMessage('Valid transporter is required'),
  body('qrCode').optional().trim(),
  handleValidationErrors,
];

const associateVehicleValidation = [
  body('qrCode').trim().notEmpty().withMessage('QR code is required'),
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('transporterId').isMongoId().withMessage('Valid transporter is required'),
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

const wayBridgeDataValidation = [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('wayBridgeId').isMongoId().withMessage('Valid way bridge is required'),
  body('projectId').isMongoId().withMessage('Valid project is required'),
  body('transporterId').isMongoId().withMessage('Valid transporter is required'),
  body('loadingPointId').isMongoId().withMessage('Valid loading point is required'),
  body('grossWeight').isFloat({ min: 0 }).withMessage('Gross weight must be a positive number'),
  body('tareWeight').isFloat({ min: 0 }).withMessage('Tare weight must be a positive number'),
  body('qrCode').optional().trim(),
  body('weighBridgeSlipNo').optional().trim(),
  body('previousTripReason').optional().trim(),
  handleValidationErrors,
];

const loadingPointDataValidation = [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('loadingPointId').isMongoId().withMessage('Valid loading point is required'),
  body('projectId').isMongoId().withMessage('Valid project is required'),
  body('transporterId').isMongoId().withMessage('Valid transporter is required'),
  body('qrCode').optional().trim(),
  body('notes').optional().trim(),
  body('latitude').optional().isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').optional().isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('previousTripReason').optional().trim(),
  handleValidationErrors,
];

const unloadingPointDataValidation = [
  body('tripId').optional().isMongoId().withMessage('Valid trip ID is required if provided'),
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('unloadingPointId').isMongoId().withMessage('Valid unloading point is required'),
  body('projectId').isMongoId().withMessage('Valid project is required'),
  body('qrCode').optional().trim(),
  body('wayBridgeSlipNo').optional().trim(),
  body('loadingPointSlipNo').optional().trim(),
  body('loadingPointName').optional().trim(),
  body('wayBridgeName').optional().trim(),
  body('grossWeight').optional().isFloat({ min: 0 }),
  body('tareWeight').optional().isFloat({ min: 0 }),
  body('netWeight').optional().isFloat({ min: 0 }),
  body('notes').optional().trim(),
  handleValidationErrors,
];

// All routes require authentication
router.use(protect);

// QR and Vehicle routes
router.post('/check', checkQRValidation, checkQR);
router.get('/check-vehicle/:vehicleNumber', checkVehicle);
router.post('/associate-vehicle', associateQRToVehicleValidation, associateQRToVehicle);
router.post('/assign-transporter', assignTransporterValidation, assignTransporter);
router.post('/associate', associateVehicleValidation, associateVehicle);
router.get('/transporters', getTransporters);
router.get('/loading-points', getLoadingPoints);
router.get('/wb-loading-points', getWBLoadingPoints);
router.get('/projects', getProjects);

// Trip routes
router.post('/start-trip', startTripValidation, startTrip);
router.get('/active-trip', getActiveTrip);
router.post('/end-trip', endTripValidation, endTrip);
router.post('/cancel-trip', cancelTripValidation, cancelTrip);
router.get('/trips', getTripHistory);

// Way bridge data routes
router.post('/way-bridge-data', wayBridgeDataValidation, saveWayBridgeData);
router.get('/way-bridge-data', getWayBridgeDataHistory);

// Loading point data routes
router.post('/loading-point-data', loadingPointDataValidation, saveLoadingPointData);
router.get('/loading-point-data', getLoadingPointDataHistory);

// Check vehicle active trip (for way bridge / loading point screens)
router.get('/check-vehicle-trip/:vehicleNumber', checkVehicleActiveTrip);

// Unloading point routes
router.get('/active-trip-by-vehicle/:vehicleNumber', getActiveTripByVehicle);
router.get('/unloading-points', getUnloadingPoints);
router.post('/unloading-point-data', unloadingPointDataValidation, saveUnloadingPointData);
router.get('/unloading-point-data', getUnloadingPointDataHistory);

// Missing loading point entries
router.post('/missing-loading-point', [
  body('vehicleNumber').trim().notEmpty().withMessage('Vehicle number is required'),
  body('qrCode').optional().trim(),
  body('unloadingPointId').optional().isMongoId(),
  body('unloadingPointName').optional().trim(),
  body('projectId').optional().isMongoId(),
  body('projectName').optional().trim(),
  body('reason').optional().trim(),
  handleValidationErrors,
], logMissingLoadingPoint);
router.get('/missing-loading-point', getMissingLoadingPointEntries);

module.exports = router;

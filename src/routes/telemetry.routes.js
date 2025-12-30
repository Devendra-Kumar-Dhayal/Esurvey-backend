const express = require('express');
const {
  submitTelemetry,
  submitBatchTelemetry,
  getTelemetry,
  getLatestLocation,
} = require('../controllers/telemetry.controller');
const { protect } = require('../middleware/auth.middleware');
const {
  validateTelemetry,
  validateTelemetryQuery,
} = require('../middleware/validation.middleware');

const router = express.Router();

router.use(protect);

router.post('/', validateTelemetry, submitTelemetry);
router.post('/batch', submitBatchTelemetry);
router.get('/', validateTelemetryQuery, getTelemetry);
router.get('/latest', getLatestLocation);

module.exports = router;

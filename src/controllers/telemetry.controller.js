const Location = require('../models/Location');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const submitTelemetry = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      batteryLevel,
      batteryCharging,
      timestamp,
      activity,
    } = req.body;

    const location = await Location.create({
      userId: req.user._id,
      latitude,
      longitude,
      accuracy,
      altitude,
      speed,
      heading,
      batteryLevel,
      batteryCharging,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      activity,
    });

    sendSuccess(res, { location }, 'Telemetry submitted successfully', 201);
  } catch (error) {
    console.error('Submit telemetry error:', error);
    sendError(res, 'Failed to submit telemetry', 500);
  }
};

const submitBatchTelemetry = async (req, res) => {
  try {
    const { locations } = req.body;

    if (!Array.isArray(locations) || locations.length === 0) {
      return sendError(res, 'Locations array is required', 400);
    }

    if (locations.length > 100) {
      return sendError(res, 'Maximum 100 locations per batch', 400);
    }

    const locationsWithUser = locations.map((loc) => ({
      ...loc,
      userId: req.user._id,
      timestamp: loc.timestamp ? new Date(loc.timestamp) : new Date(),
    }));

    const savedLocations = await Location.insertMany(locationsWithUser, {
      ordered: false,
    });

    sendSuccess(
      res,
      { count: savedLocations.length },
      `${savedLocations.length} locations saved successfully`,
      201
    );
  } catch (error) {
    console.error('Batch telemetry error:', error);
    sendError(res, 'Failed to submit batch telemetry', 500);
  }
};

const getTelemetry = async (req, res) => {
  try {
    const { limit = 100, skip = 0, startDate, endDate } = req.query;

    const locations = await Location.findByUserId(req.user._id, {
      limit: parseInt(limit, 10),
      skip: parseInt(skip, 10),
      startDate,
      endDate,
    });

    const total = await Location.countDocuments({ userId: req.user._id });

    sendPaginated(
      res,
      { locations },
      {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        hasMore: parseInt(skip, 10) + locations.length < total,
      },
      'Telemetry retrieved successfully'
    );
  } catch (error) {
    console.error('Get telemetry error:', error);
    sendError(res, 'Failed to retrieve telemetry', 500);
  }
};

const getLatestLocation = async (req, res) => {
  try {
    const location = await Location.findOne({ userId: req.user._id })
      .sort({ timestamp: -1 })
      .lean();

    if (!location) {
      return sendError(res, 'No location data found', 404);
    }

    sendSuccess(res, { location }, 'Latest location retrieved successfully');
  } catch (error) {
    console.error('Get latest location error:', error);
    sendError(res, 'Failed to retrieve latest location', 500);
  }
};

module.exports = {
  submitTelemetry,
  submitBatchTelemetry,
  getTelemetry,
  getLatestLocation,
};

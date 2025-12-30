const QRVehicle = require('../models/QRVehicle');
const Trip = require('../models/Trip');
const DropdownOption = require('../models/DropdownOption');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Check if a QR code has an associated vehicle number
 * POST /api/qr/check
 */
const checkQR = async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return sendError(res, 'QR code is required', 400);
    }

    const qrVehicle = await QRVehicle.findOne({ qrCode, isActive: true });

    if (qrVehicle && qrVehicle.vehicleNumber) {
      // QR has associated vehicle number
      return sendSuccess(res, {
        hasVehicle: true,
        vehicleNumber: qrVehicle.vehicleNumber,
        qrCode: qrVehicle.qrCode,
      }, 'Vehicle found for QR code');
    }

    // QR doesn't have associated vehicle or doesn't exist
    return sendSuccess(res, {
      hasVehicle: false,
      vehicleNumber: null,
      qrCode,
    }, 'No vehicle associated with this QR code');
  } catch (error) {
    console.error('Check QR error:', error);
    sendError(res, 'Failed to check QR code', 500);
  }
};

/**
 * Associate a vehicle number with a QR code
 * POST /api/qr/associate
 */
const associateVehicle = async (req, res) => {
  try {
    const { qrCode, vehicleNumber } = req.body;
    const userId = req.user._id;

    if (!qrCode) {
      return sendError(res, 'QR code is required', 400);
    }

    if (!vehicleNumber) {
      return sendError(res, 'Vehicle number is required', 400);
    }

    let qrVehicle = await QRVehicle.findOne({ qrCode });

    if (qrVehicle) {
      // Update existing QR with new vehicle number
      qrVehicle.vehicleNumber = vehicleNumber.toUpperCase();
      qrVehicle.lastUsedBy = userId;
      qrVehicle.lastUsedAt = new Date();
      await qrVehicle.save();
    } else {
      // Create new QR-Vehicle association
      qrVehicle = await QRVehicle.create({
        qrCode,
        vehicleNumber: vehicleNumber.toUpperCase(),
        createdBy: userId,
        lastUsedBy: userId,
        lastUsedAt: new Date(),
      });
    }

    sendSuccess(res, {
      qrCode: qrVehicle.qrCode,
      vehicleNumber: qrVehicle.vehicleNumber,
    }, 'Vehicle associated successfully');
  } catch (error) {
    console.error('Associate vehicle error:', error);
    sendError(res, 'Failed to associate vehicle', 500);
  }
};

/**
 * Start a new trip with all selection data
 * POST /api/qr/start-trip
 */
const startTrip = async (req, res) => {
  try {
    const {
      qrCode,
      vehicleNumber,
      projectId,
      selectionType,
      selectionId,
      latitude,
      longitude,
    } = req.body;
    const userId = req.user._id;

    // Validate required fields
    if (!qrCode || !vehicleNumber || !projectId || !selectionType || !selectionId) {
      return sendError(res, 'Missing required fields', 400);
    }

    // Get project details
    const project = await DropdownOption.findById(projectId);
    if (!project) {
      return sendError(res, 'Invalid project', 400);
    }

    // Get selection details
    const selection = await DropdownOption.findById(selectionId);
    if (!selection) {
      return sendError(res, 'Invalid selection', 400);
    }

    // Check if user has an active trip
    const activeTrip = await Trip.findOne({ userId, status: 'active' });
    if (activeTrip) {
      return sendError(res, 'You already have an active trip. Please complete or cancel it first.', 400);
    }

    // Update or create QR-Vehicle association
    let qrVehicle = await QRVehicle.findOne({ qrCode });
    if (!qrVehicle) {
      qrVehicle = await QRVehicle.create({
        qrCode,
        vehicleNumber: vehicleNumber.toUpperCase(),
        createdBy: userId,
        lastUsedBy: userId,
        lastUsedAt: new Date(),
      });
    } else {
      qrVehicle.vehicleNumber = vehicleNumber.toUpperCase();
      qrVehicle.lastUsedBy = userId;
      qrVehicle.lastUsedAt = new Date();
      await qrVehicle.save();
    }

    // Create the trip
    const trip = await Trip.create({
      userId,
      qrCode,
      vehicleNumber: vehicleNumber.toUpperCase(),
      projectId,
      projectName: project.name,
      selectionType,
      selectionId,
      selectionName: selection.name,
      startTime: new Date(),
      status: 'active',
      startLocation: {
        type: 'Point',
        coordinates: [longitude || 0, latitude || 0],
      },
    });

    await trip.populate('projectId selectionId');

    sendSuccess(res, { trip }, 'Trip started successfully', 201);
  } catch (error) {
    console.error('Start trip error:', error);
    sendError(res, 'Failed to start trip', 500);
  }
};

/**
 * Get active trip for current user
 * GET /api/qr/active-trip
 */
const getActiveTrip = async (req, res) => {
  try {
    const userId = req.user._id;

    const trip = await Trip.findOne({ userId, status: 'active' })
      .populate('projectId selectionId');

    sendSuccess(res, { trip }, trip ? 'Active trip found' : 'No active trip');
  } catch (error) {
    console.error('Get active trip error:', error);
    sendError(res, 'Failed to get active trip', 500);
  }
};

/**
 * End/Complete current trip
 * POST /api/qr/end-trip
 */
const endTrip = async (req, res) => {
  try {
    const { tripId, latitude, longitude, notes } = req.body;
    const userId = req.user._id;

    const trip = await Trip.findOne({ _id: tripId, userId, status: 'active' });
    if (!trip) {
      return sendError(res, 'Active trip not found', 404);
    }

    trip.status = 'completed';
    trip.endTime = new Date();
    trip.endLocation = {
      type: 'Point',
      coordinates: [longitude || 0, latitude || 0],
    };
    if (notes) {
      trip.notes = notes;
    }

    await trip.save();
    await trip.populate('projectId selectionId');

    sendSuccess(res, { trip }, 'Trip completed successfully');
  } catch (error) {
    console.error('End trip error:', error);
    sendError(res, 'Failed to end trip', 500);
  }
};

/**
 * Cancel current trip
 * POST /api/qr/cancel-trip
 */
const cancelTrip = async (req, res) => {
  try {
    const { tripId } = req.body;
    const userId = req.user._id;

    const trip = await Trip.findOne({ _id: tripId, userId, status: 'active' });
    if (!trip) {
      return sendError(res, 'Active trip not found', 404);
    }

    trip.status = 'cancelled';
    trip.endTime = new Date();
    await trip.save();

    sendSuccess(res, { trip }, 'Trip cancelled successfully');
  } catch (error) {
    console.error('Cancel trip error:', error);
    sendError(res, 'Failed to cancel trip', 500);
  }
};

/**
 * Get trip history for current user
 * GET /api/qr/trips
 */
const getTripHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0, status } = req.query;

    const query = { userId };
    if (status) {
      query.status = status;
    }

    const trips = await Trip.find(query)
      .populate('projectId selectionId')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10));

    const total = await Trip.countDocuments(query);

    sendSuccess(res, {
      trips,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        hasMore: parseInt(skip, 10) + trips.length < total,
      },
    }, 'Trip history retrieved');
  } catch (error) {
    console.error('Get trip history error:', error);
    sendError(res, 'Failed to get trip history', 500);
  }
};

module.exports = {
  checkQR,
  associateVehicle,
  startTrip,
  getActiveTrip,
  endTrip,
  cancelTrip,
  getTripHistory,
};

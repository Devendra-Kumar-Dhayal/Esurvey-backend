const QRVehicle = require('../models/QRVehicle');
const Trip = require('../models/Trip');
const DropdownOption = require('../models/DropdownOption');
const WayBridgeData = require('../models/WayBridgeData');
const LoadingPointData = require('../models/LoadingPointData');
const UnloadingPointData = require('../models/UnloadingPointData');
const MissingLoadingPointEntry = require('../models/MissingLoadingPointEntry');
const MissingUnloadingPointEntry = require('../models/MissingUnloadingPointEntry');
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
        transporterId: qrVehicle.transporterId,
        transporterName: qrVehicle.transporterName,
      }, 'Vehicle found for QR code');
    }

    // QR doesn't have associated vehicle or doesn't exist
    return sendSuccess(res, {
      hasVehicle: false,
      vehicleNumber: null,
      qrCode,
      transporterId: null,
      transporterName: null,
    }, 'No vehicle associated with this QR code');
  } catch (error) {
    console.error('Check QR error:', error);
    sendError(res, 'Failed to check QR code', 500);
  }
};

/**
 * Check if a vehicle number has transporter associated
 * GET /api/qr/check-vehicle/:vehicleNumber
 */
const checkVehicle = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    if (!vehicleNumber) {
      return sendError(res, 'Vehicle number is required', 400);
    }

    const qrVehicle = await QRVehicle.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      isActive: true
    });

    if (qrVehicle && qrVehicle.transporterId) {
      return sendSuccess(res, {
        hasTransporter: true,
        vehicleNumber: qrVehicle.vehicleNumber,
        transporterId: qrVehicle.transporterId,
        transporterName: qrVehicle.transporterName,
        qrCode: qrVehicle.qrCode,
      }, 'Vehicle has transporter');
    }

    return sendSuccess(res, {
      hasTransporter: false,
      vehicleNumber: vehicleNumber.toUpperCase(),
      transporterId: null,
      transporterName: null,
      qrCode: qrVehicle?.qrCode || null,
    }, 'Vehicle does not have transporter');
  } catch (error) {
    console.error('Check vehicle error:', error);
    sendError(res, 'Failed to check vehicle', 500);
  }
};

/**
 * Associate a vehicle number with a QR code (QR → Vehicle only)
 * POST /api/qr/associate-vehicle
 */
const associateQRToVehicle = async (req, res) => {
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
      transporterId: qrVehicle.transporterId || null,
      transporterName: qrVehicle.transporterName || null,
    }, 'QR code associated with vehicle successfully');
  } catch (error) {
    console.error('Associate QR to vehicle error:', error);
    sendError(res, 'Failed to associate QR code with vehicle', 500);
  }
};

/**
 * Assign transporter to a vehicle (Vehicle → Transporter)
 * POST /api/qr/assign-transporter
 */
const assignTransporter = async (req, res) => {
  try {
    const { vehicleNumber, transporterId, qrCode } = req.body;
    const userId = req.user._id;

    if (!vehicleNumber) {
      return sendError(res, 'Vehicle number is required', 400);
    }

    if (!transporterId) {
      return sendError(res, 'Transporter is required', 400);
    }

    // Validate transporter
    const transporter = await DropdownOption.findOne({
      _id: transporterId,
      type: 'transporter',
      isActive: true
    });
    if (!transporter) {
      return sendError(res, 'Invalid transporter', 400);
    }

    // Find QR-Vehicle record by vehicle number or qrCode
    let qrVehicle = null;
    if (qrCode) {
      qrVehicle = await QRVehicle.findOne({ qrCode });
    }
    if (!qrVehicle) {
      qrVehicle = await QRVehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
    }

    if (qrVehicle) {
      // Update existing record with transporter
      qrVehicle.transporterId = transporterId;
      qrVehicle.transporterName = transporter.name;
      qrVehicle.lastUsedBy = userId;
      qrVehicle.lastUsedAt = new Date();
      await qrVehicle.save();
    } else {
      // Create new record (vehicle without QR, but with transporter)
      qrVehicle = await QRVehicle.create({
        qrCode: qrCode || `VEHICLE_${vehicleNumber.toUpperCase()}`,
        vehicleNumber: vehicleNumber.toUpperCase(),
        transporterId,
        transporterName: transporter.name,
        createdBy: userId,
        lastUsedBy: userId,
        lastUsedAt: new Date(),
      });
    }

    sendSuccess(res, {
      qrCode: qrVehicle.qrCode,
      vehicleNumber: qrVehicle.vehicleNumber,
      transporterId: qrVehicle.transporterId,
      transporterName: qrVehicle.transporterName,
    }, 'Transporter assigned to vehicle successfully');
  } catch (error) {
    console.error('Assign transporter error:', error);
    sendError(res, 'Failed to assign transporter', 500);
  }
};

/**
 * Associate a vehicle number with a QR code (legacy - with transporter)
 * POST /api/qr/associate
 */
const associateVehicle = async (req, res) => {
  try {
    const { qrCode, vehicleNumber, transporterId } = req.body;
    const userId = req.user._id;

    if (!qrCode) {
      return sendError(res, 'QR code is required', 400);
    }

    if (!vehicleNumber) {
      return sendError(res, 'Vehicle number is required', 400);
    }

    if (!transporterId) {
      return sendError(res, 'Transporter is required', 400);
    }

    // Validate transporter
    const transporter = await DropdownOption.findOne({
      _id: transporterId,
      type: 'transporter',
      isActive: true
    });
    if (!transporter) {
      return sendError(res, 'Invalid transporter', 400);
    }

    let qrVehicle = await QRVehicle.findOne({ qrCode });

    if (qrVehicle) {
      // Update existing QR with new vehicle number and transporter
      qrVehicle.vehicleNumber = vehicleNumber.toUpperCase();
      qrVehicle.transporterId = transporterId;
      qrVehicle.transporterName = transporter.name;
      qrVehicle.lastUsedBy = userId;
      qrVehicle.lastUsedAt = new Date();
      await qrVehicle.save();
    } else {
      // Create new QR-Vehicle association
      qrVehicle = await QRVehicle.create({
        qrCode,
        vehicleNumber: vehicleNumber.toUpperCase(),
        transporterId,
        transporterName: transporter.name,
        createdBy: userId,
        lastUsedBy: userId,
        lastUsedAt: new Date(),
      });
    }

    sendSuccess(res, {
      qrCode: qrVehicle.qrCode,
      vehicleNumber: qrVehicle.vehicleNumber,
      transporterId: qrVehicle.transporterId,
      transporterName: qrVehicle.transporterName,
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

/**
 * Get list of transporters for dropdown
 * GET /api/qr/transporters
 */
const getTransporters = async (req, res) => {
  try {
    const transporters = await DropdownOption.find({
      type: 'transporter',
      isActive: true
    }).sort({ order: 1, name: 1 });

    sendSuccess(res, { transporters }, 'Transporters retrieved');
  } catch (error) {
    console.error('Get transporters error:', error);
    sendError(res, 'Failed to get transporters', 500);
  }
};

/**
 * Get loading points for dropdown
 * GET /api/qr/loading-points
 */
const getLoadingPoints = async (req, res) => {
  try {
    const loadingPoints = await DropdownOption.find({
      type: 'loading_point',
      isActive: true
    }).sort({ order: 1, name: 1 });

    sendSuccess(res, { loadingPoints }, 'Loading points retrieved');
  } catch (error) {
    console.error('Get loading points error:', error);
    sendError(res, 'Failed to get loading points', 500);
  }
};

/**
 * Get projects for dropdown
 * GET /api/qr/projects
 */
const getProjects = async (req, res) => {
  try {
    const projects = await DropdownOption.find({
      type: 'project',
      isActive: true
    }).sort({ order: 1, name: 1 });

    sendSuccess(res, { projects }, 'Projects retrieved');
  } catch (error) {
    console.error('Get projects error:', error);
    sendError(res, 'Failed to get projects', 500);
  }
};

/**
 * Save way bridge data
 * POST /api/qr/way-bridge-data
 */
const saveWayBridgeData = async (req, res) => {
  try {
    const {
      qrCode,
      vehicleNumber,
      wayBridgeId,
      projectId,
      transporterId,
      loadingPointId,
      weighBridgeSlipNo,
      grossWeight,
      tareWeight,
      previousTripReason,
    } = req.body;
    const userId = req.user._id;

    // Check for active trip and end it if exists
    const existingTrip = await Trip.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'active',
    });

    let endedPreviousTrip = null;
    if (existingTrip) {
      if (!previousTripReason || previousTripReason.trim() === '') {
        return sendError(res, 'Reason for ending previous trip is required', 400);
      }

      // Log as missing unloading point entry
      await MissingUnloadingPointEntry.create({
        userId,
        tripId: existingTrip._id,
        vehicleNumber: vehicleNumber.toUpperCase(),
        qrCode: existingTrip.qrCode,
        previousProjectId: existingTrip.projectId,
        previousProjectName: existingTrip.projectName,
        previousSelectionType: existingTrip.selectionType,
        previousSelectionName: existingTrip.selectionName,
        tripStartTime: existingTrip.startTime,
        tripEndTime: new Date(),
        reason: previousTripReason,
      });

      // End the previous trip
      existingTrip.status = 'cancelled';
      existingTrip.endTime = new Date();
      existingTrip.notes = `Trip ended due to new trip start. Reason: ${previousTripReason}`;
      await existingTrip.save();
      endedPreviousTrip = existingTrip;
    }

    // Validate way bridge
    const wayBridge = await DropdownOption.findOne({
      _id: wayBridgeId,
      type: 'way_bridge',
      isActive: true
    });
    if (!wayBridge) {
      return sendError(res, 'Invalid way bridge', 400);
    }

    // Validate project
    const project = await DropdownOption.findOne({
      _id: projectId,
      type: 'project',
      isActive: true
    });
    if (!project) {
      return sendError(res, 'Invalid project', 400);
    }

    // Validate transporter
    const transporter = await DropdownOption.findOne({
      _id: transporterId,
      type: 'transporter',
      isActive: true
    });
    if (!transporter) {
      return sendError(res, 'Invalid transporter', 400);
    }

    // Validate loading point
    const loadingPoint = await DropdownOption.findOne({
      _id: loadingPointId,
      type: 'loading_point',
      isActive: true
    });
    if (!loadingPoint) {
      return sendError(res, 'Invalid loading point', 400);
    }

    // Update QRVehicle with transporter if provided and QR exists
    if (qrCode) {
      const qrVehicle = await QRVehicle.findOne({ qrCode });
      if (qrVehicle && !qrVehicle.transporterId) {
        qrVehicle.transporterId = transporterId;
        qrVehicle.transporterName = transporter.name;
        qrVehicle.lastUsedBy = userId;
        qrVehicle.lastUsedAt = new Date();
        await qrVehicle.save();
      }
    }

    // Create the trip with status 'active'
    const trip = await Trip.create({
      userId,
      qrCode,
      vehicleNumber: vehicleNumber.toUpperCase(),
      projectId,
      projectName: project.name,
      selectionType: 'way_bridge',
      selectionId: wayBridgeId,
      selectionName: wayBridge.name,
      startTime: new Date(),
      status: 'active',
    });

    // Create way bridge data entry with trip reference
    const wayBridgeData = await WayBridgeData.create({
      userId,
      tripId: trip._id,
      qrCode,
      vehicleNumber: vehicleNumber.toUpperCase(),
      wayBridgeId,
      wayBridgeName: wayBridge.name,
      projectId,
      projectName: project.name,
      transporterId,
      transporterName: transporter.name,
      loadingPointId,
      loadingPointName: loadingPoint.name,
      weighBridgeSlipNo,
      grossWeight,
      tareWeight,
    });

    sendSuccess(
      res,
      { wayBridgeData, trip, endedPreviousTrip },
      endedPreviousTrip
        ? 'Previous trip ended and new way bridge data saved successfully'
        : 'Way bridge data saved and trip started successfully',
      201
    );
  } catch (error) {
    console.error('Save way bridge data error:', error);
    sendError(res, 'Failed to save way bridge data', 500);
  }
};

/**
 * Get way bridge data history
 * GET /api/qr/way-bridge-data
 */
const getWayBridgeDataHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    const data = await WayBridgeData.find({ userId })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10));

    const total = await WayBridgeData.countDocuments({ userId });

    sendSuccess(res, {
      data,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        hasMore: parseInt(skip, 10) + data.length < total,
      },
    }, 'Way bridge data history retrieved');
  } catch (error) {
    console.error('Get way bridge data history error:', error);
    sendError(res, 'Failed to get way bridge data history', 500);
  }
};

/**
 * Save loading point data and create trip
 * POST /api/qr/loading-point-data
 */
const saveLoadingPointData = async (req, res) => {
  try {
    const {
      qrCode,
      vehicleNumber,
      loadingPointId,
      projectId,
      transporterId,
      notes,
      latitude,
      longitude,
      previousTripReason,
    } = req.body;
    const userId = req.user._id;

    // Check for active trip and end it if exists
    const existingTrip = await Trip.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'active',
    });

    let endedPreviousTrip = null;
    if (existingTrip) {
      if (!previousTripReason || previousTripReason.trim() === '') {
        return sendError(res, 'Reason for ending previous trip is required', 400);
      }

      // Log as missing unloading point entry
      await MissingUnloadingPointEntry.create({
        userId,
        tripId: existingTrip._id,
        vehicleNumber: vehicleNumber.toUpperCase(),
        qrCode: existingTrip.qrCode,
        previousProjectId: existingTrip.projectId,
        previousProjectName: existingTrip.projectName,
        previousSelectionType: existingTrip.selectionType,
        previousSelectionName: existingTrip.selectionName,
        tripStartTime: existingTrip.startTime,
        tripEndTime: new Date(),
        reason: previousTripReason,
      });

      // End the previous trip
      existingTrip.status = 'cancelled';
      existingTrip.endTime = new Date();
      existingTrip.notes = `Trip ended due to new trip start. Reason: ${previousTripReason}`;
      await existingTrip.save();
      endedPreviousTrip = existingTrip;
    }

    // Validate loading point
    const loadingPoint = await DropdownOption.findOne({
      _id: loadingPointId,
      type: 'loading_point',
      isActive: true,
    });
    if (!loadingPoint) {
      return sendError(res, 'Invalid loading point', 400);
    }

    // Validate project
    const project = await DropdownOption.findOne({
      _id: projectId,
      type: 'project',
      isActive: true,
    });
    if (!project) {
      return sendError(res, 'Invalid project', 400);
    }

    // Validate transporter
    const transporter = await DropdownOption.findOne({
      _id: transporterId,
      type: 'transporter',
      isActive: true,
    });
    if (!transporter) {
      return sendError(res, 'Invalid transporter', 400);
    }

    // Update QRVehicle with transporter if not linked
    if (qrCode) {
      const qrVehicle = await QRVehicle.findOne({ qrCode });
      if (qrVehicle && !qrVehicle.transporterId) {
        qrVehicle.transporterId = transporterId;
        qrVehicle.transporterName = transporter.name;
        qrVehicle.lastUsedBy = userId;
        qrVehicle.lastUsedAt = new Date();
        await qrVehicle.save();
      }
    }

    // Create the trip with status 'started'
    const trip = await Trip.create({
      userId,
      qrCode,
      vehicleNumber: vehicleNumber.toUpperCase(),
      projectId,
      projectName: project.name,
      selectionType: 'loading_point',
      selectionId: loadingPointId,
      selectionName: loadingPoint.name,
      startTime: new Date(),
      status: 'active',
      notes,
      startLocation: {
        type: 'Point',
        coordinates: [longitude || 0, latitude || 0],
      },
    });

    // Create loading point data entry
    const loadingPointData = await LoadingPointData.create({
      userId,
      tripId: trip._id,
      qrCode,
      vehicleNumber: vehicleNumber.toUpperCase(),
      loadingPointId,
      loadingPointName: loadingPoint.name,
      projectId,
      projectName: project.name,
      transporterId,
      transporterName: transporter.name,
      notes,
      status: 'started',
    });

    sendSuccess(
      res,
      { loadingPointData, trip, endedPreviousTrip },
      endedPreviousTrip
        ? 'Previous trip ended and new loading point data saved successfully'
        : 'Loading point data saved and trip started successfully',
      201
    );
  } catch (error) {
    console.error('Save loading point data error:', error);
    sendError(res, 'Failed to save loading point data', 500);
  }
};

/**
 * Get loading point data history
 * GET /api/qr/loading-point-data
 */
const getLoadingPointDataHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    const data = await LoadingPointData.find({ userId })
      .populate('tripId')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10));

    const total = await LoadingPointData.countDocuments({ userId });

    sendSuccess(
      res,
      {
        data,
        pagination: {
          total,
          limit: parseInt(limit, 10),
          skip: parseInt(skip, 10),
          hasMore: parseInt(skip, 10) + data.length < total,
        },
      },
      'Loading point data history retrieved'
    );
  } catch (error) {
    console.error('Get loading point data history error:', error);
    sendError(res, 'Failed to get loading point data history', 500);
  }
};

/**
 * Check if vehicle has active trip (for way bridge / loading point screens)
 * GET /api/qr/check-vehicle-trip/:vehicleNumber
 */
const checkVehicleActiveTrip = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    const activeTrip = await Trip.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'active',
    })
      .populate('projectId', 'name code')
      .populate('selectionId', 'name code')
      .lean();

    if (!activeTrip) {
      return sendSuccess(res, { hasActiveTrip: false, trip: null }, 'No active trip found');
    }

    sendSuccess(
      res,
      {
        hasActiveTrip: true,
        trip: {
          id: activeTrip._id,
          vehicleNumber: activeTrip.vehicleNumber,
          projectName: activeTrip.projectName,
          selectionType: activeTrip.selectionType,
          selectionName: activeTrip.selectionName,
          startTime: activeTrip.startTime,
        },
      },
      'Active trip found for vehicle'
    );
  } catch (error) {
    console.error('Check vehicle active trip error:', error);
    sendError(res, 'Failed to check vehicle trip', 500);
  }
};

/**
 * Get active trip by vehicle number for unloading
 * GET /api/qr/active-trip-by-vehicle/:vehicleNumber
 */
const getActiveTripByVehicle = async (req, res) => {
  try {
    const { vehicleNumber } = req.params;

    // Find active trip for this vehicle
    const trip = await Trip.findOne({
      vehicleNumber: vehicleNumber.toUpperCase(),
      status: 'active',
    }).sort({ startTime: -1 });

    if (!trip) {
      return sendError(res, 'No active trip found for this vehicle', 404);
    }

    // Try to get way bridge data for this trip (if exists)
    let wayBridgeData = null;
    if (trip.tripId || trip._id) {
      wayBridgeData = await WayBridgeData.findOne({ tripId: trip._id });
    }

    // If no way bridge data, try to find by vehicle number
    if (!wayBridgeData) {
      wayBridgeData = await WayBridgeData.findOne({
        vehicleNumber: vehicleNumber.toUpperCase(),
      }).sort({ createdAt: -1 });
    }

    sendSuccess(res, {
      trip,
      wayBridgeData,
    }, 'Active trip found');
  } catch (error) {
    console.error('Get active trip by vehicle error:', error);
    sendError(res, 'Failed to get active trip', 500);
  }
};

/**
 * Get unloading points
 * GET /api/qr/unloading-points
 */
const getUnloadingPoints = async (req, res) => {
  try {
    const unloadingPoints = await DropdownOption.find({
      type: 'unloading_point',
      isActive: true,
    }).sort({ name: 1 });

    sendSuccess(res, { unloadingPoints }, 'Unloading points retrieved');
  } catch (error) {
    console.error('Get unloading points error:', error);
    sendError(res, 'Failed to get unloading points', 500);
  }
};

/**
 * Save unloading point data and close trip
 * POST /api/qr/unloading-point-data
 */
const saveUnloadingPointData = async (req, res) => {
  try {
    const {
      tripId,
      qrCode,
      vehicleNumber,
      wayBridgeSlipNo,
      loadingPointSlipNo,
      loadingPointName,
      wayBridgeName,
      grossWeight,
      tareWeight,
      netWeight,
      unloadingPointId,
      projectId,
      notes,
    } = req.body;
    const userId = req.user._id;

    // Validate trip exists and is active
    const trip = await Trip.findOne({
      _id: tripId,
      status: 'active',
    });
    if (!trip) {
      return sendError(res, 'Trip not found or already closed', 400);
    }

    // Validate unloading point
    const unloadingPoint = await DropdownOption.findOne({
      _id: unloadingPointId,
      type: 'unloading_point',
      isActive: true,
    });
    if (!unloadingPoint) {
      return sendError(res, 'Invalid unloading point', 400);
    }

    // Validate project
    const project = await DropdownOption.findOne({
      _id: projectId,
      type: 'project',
      isActive: true,
    });
    if (!project) {
      return sendError(res, 'Invalid project', 400);
    }

    // Create unloading point data entry
    const unloadingPointData = await UnloadingPointData.create({
      userId,
      tripId,
      qrCode,
      vehicleNumber: vehicleNumber.toUpperCase(),
      wayBridgeSlipNo,
      loadingPointSlipNo,
      loadingPointName,
      wayBridgeName,
      grossWeight,
      tareWeight,
      netWeight,
      unloadingPointId,
      unloadingPointName: unloadingPoint.name,
      projectId,
      projectName: project.name,
      notes,
    });

    // Close the trip
    trip.status = 'completed';
    trip.endTime = new Date();
    await trip.save();

    sendSuccess(
      res,
      { unloadingPointData, trip },
      'Unloading point data saved and trip completed successfully',
      201
    );
  } catch (error) {
    console.error('Save unloading point data error:', error);
    sendError(res, 'Failed to save unloading point data', 500);
  }
};

/**
 * Get unloading point data history
 * GET /api/qr/unloading-point-data
 */
const getUnloadingPointDataHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    const data = await UnloadingPointData.find({ userId })
      .populate('tripId')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10));

    const total = await UnloadingPointData.countDocuments({ userId });

    sendSuccess(
      res,
      {
        data,
        pagination: {
          total,
          limit: parseInt(limit, 10),
          skip: parseInt(skip, 10),
          hasMore: parseInt(skip, 10) + data.length < total,
        },
      },
      'Unloading point data history retrieved'
    );
  } catch (error) {
    console.error('Get unloading point data history error:', error);
    sendError(res, 'Failed to get unloading point data history', 500);
  }
};

/**
 * Log missing loading point entry
 * POST /api/qr/missing-loading-point
 */
const logMissingLoadingPoint = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      vehicleNumber,
      qrCode,
      unloadingPointId,
      unloadingPointName,
      projectId,
      projectName,
      reason,
    } = req.body;

    if (!vehicleNumber) {
      return sendError(res, 'Vehicle number is required', 400);
    }

    const entry = await MissingLoadingPointEntry.create({
      userId,
      vehicleNumber: vehicleNumber.toUpperCase(),
      qrCode,
      unloadingPointId,
      unloadingPointName,
      projectId,
      projectName,
      reason: reason || 'Loading point entry missing',
    });

    sendSuccess(res, { entry }, 'Missing loading point entry logged', 201);
  } catch (error) {
    console.error('Log missing loading point error:', error);
    sendError(res, 'Failed to log missing loading point entry', 500);
  }
};

/**
 * Get missing loading point entries (for admin)
 * GET /api/qr/missing-loading-point
 */
const getMissingLoadingPointEntries = async (req, res) => {
  try {
    const { limit = 50, skip = 0 } = req.query;

    const entries = await MissingLoadingPointEntry.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10));

    const total = await MissingLoadingPointEntry.countDocuments();

    sendSuccess(
      res,
      {
        entries,
        pagination: {
          total,
          limit: parseInt(limit, 10),
          skip: parseInt(skip, 10),
          hasMore: parseInt(skip, 10) + entries.length < total,
        },
      },
      'Missing loading point entries retrieved'
    );
  } catch (error) {
    console.error('Get missing loading point entries error:', error);
    sendError(res, 'Failed to get missing loading point entries', 500);
  }
};

module.exports = {
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
};

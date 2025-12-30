const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90'],
    },
    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180'],
    },
    accuracy: {
      type: Number,
      min: [0, 'Accuracy cannot be negative'],
    },
    altitude: {
      type: Number,
    },
    speed: {
      type: Number,
      min: [0, 'Speed cannot be negative'],
    },
    heading: {
      type: Number,
      min: [0, 'Heading must be between 0 and 360'],
      max: [360, 'Heading must be between 0 and 360'],
    },
    batteryLevel: {
      type: Number,
      min: [0, 'Battery level must be between 0 and 100'],
      max: [100, 'Battery level must be between 0 and 100'],
    },
    batteryCharging: {
      type: Boolean,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    activity: {
      type: String,
      enum: ['still', 'walking', 'running', 'cycling', 'driving', 'unknown'],
      default: 'unknown',
    },
  },
  {
    timestamps: true,
  }
);

locationSchema.index({ userId: 1, timestamp: -1 });
locationSchema.index({ userId: 1, createdAt: -1 });

locationSchema.statics.findByUserId = function (userId, options = {}) {
  const { limit = 100, skip = 0, startDate, endDate } = options;
  const query = { userId };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  return this.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('Location', locationSchema);

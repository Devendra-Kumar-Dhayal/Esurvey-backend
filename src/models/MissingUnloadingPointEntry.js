const mongoose = require('mongoose');

const missingUnloadingPointEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    qrCode: {
      type: String,
      trim: true,
    },
    // Previous trip details
    previousProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
    },
    previousProjectName: {
      type: String,
    },
    previousSelectionType: {
      type: String,
    },
    previousSelectionName: {
      type: String,
    },
    tripStartTime: {
      type: Date,
    },
    tripEndTime: {
      type: Date,
    },
    // Reason why trip was not properly ended
    reason: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for quick lookups
missingUnloadingPointEntrySchema.index({ vehicleNumber: 1, createdAt: -1 });
missingUnloadingPointEntrySchema.index({ tripId: 1 });
missingUnloadingPointEntrySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MissingUnloadingPointEntry', missingUnloadingPointEntrySchema);

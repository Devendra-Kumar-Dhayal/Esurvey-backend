const mongoose = require('mongoose');

const missingLoadingPointEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
    unloadingPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
    },
    unloadingPointName: {
      type: String,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
    },
    projectName: {
      type: String,
    },
    reason: {
      type: String,
      default: 'Loading point entry missing',
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
missingLoadingPointEntrySchema.index({ vehicleNumber: 1, createdAt: -1 });
missingLoadingPointEntrySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('MissingLoadingPointEntry', missingLoadingPointEntrySchema);

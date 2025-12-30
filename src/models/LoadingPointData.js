const mongoose = require('mongoose');

const loadingPointDataSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
    },
    qrCode: {
      type: String,
      trim: true,
    },
    vehicleNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    loadingPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      required: true,
    },
    loadingPointName: {
      type: String,
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      required: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      required: true,
    },
    transporterName: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['started', 'in_progress', 'completed'],
      default: 'started',
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

loadingPointDataSchema.index({ vehicleNumber: 1 });
loadingPointDataSchema.index({ timestamp: -1 });
loadingPointDataSchema.index({ projectId: 1 });
loadingPointDataSchema.index({ tripId: 1 });
loadingPointDataSchema.index({ status: 1 });

module.exports = mongoose.model('LoadingPointData', loadingPointDataSchema);

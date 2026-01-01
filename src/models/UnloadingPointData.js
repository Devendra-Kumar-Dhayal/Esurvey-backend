const mongoose = require('mongoose');

const unloadingPointDataSchema = new mongoose.Schema(
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
      required: true,
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
    // Data from the original trip/way bridge
    wayBridgeSlipNo: {
      type: String,
      trim: true,
    },
    loadingPointSlipNo: {
      type: String,
      trim: true,
    },
    loadingPointName: {
      type: String,
    },
    wayBridgeName: {
      type: String,
    },
    grossWeight: {
      type: Number,
      min: 0,
    },
    tareWeight: {
      type: Number,
      min: 0,
    },
    netWeight: {
      type: Number,
      min: 0,
    },
    // Unloading point data
    unloadingPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      required: true,
    },
    unloadingPointName: {
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
    notes: {
      type: String,
      trim: true,
    },
    imagePath: {
      type: String,
      trim: true,
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

unloadingPointDataSchema.index({ vehicleNumber: 1 });
unloadingPointDataSchema.index({ timestamp: -1 });
unloadingPointDataSchema.index({ tripId: 1 });
unloadingPointDataSchema.index({ projectId: 1 });

module.exports = mongoose.model('UnloadingPointData', unloadingPointDataSchema);

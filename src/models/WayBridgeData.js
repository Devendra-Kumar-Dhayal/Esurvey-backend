const mongoose = require('mongoose');

const wayBridgeDataSchema = new mongoose.Schema(
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
    wayBridgeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      required: true,
    },
    wayBridgeName: {
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
    loadingPointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      required: true,
    },
    loadingPointName: {
      type: String,
      required: true,
    },
    weighBridgeSlipNo: {
      type: String,
      trim: true,
    },
    loadingPointSlipNo: {
      type: String,
      trim: true,
    },
    grossWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    tareWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    netWeight: {
      type: Number,
      min: 0,
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

// Calculate net weight before saving
wayBridgeDataSchema.pre('save', function (next) {
  this.netWeight = this.grossWeight - this.tareWeight;
  next();
});

wayBridgeDataSchema.index({ vehicleNumber: 1 });
wayBridgeDataSchema.index({ timestamp: -1 });
wayBridgeDataSchema.index({ projectId: 1 });
wayBridgeDataSchema.index({ tripId: 1 });

module.exports = mongoose.model('WayBridgeData', wayBridgeDataSchema);

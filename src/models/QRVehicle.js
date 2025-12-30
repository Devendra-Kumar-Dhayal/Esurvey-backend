const mongoose = require('mongoose');

const qrVehicleSchema = new mongoose.Schema(
  {
    qrCode: {
      type: String,
      required: [true, 'QR code is required'],
      unique: true,
      trim: true,
      index: true,
    },
    vehicleNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: null,
    },
    transporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      default: null,
    },
    transporterName: {
      type: String,
      trim: true,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastUsedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastUsedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
qrVehicleSchema.index({ vehicleNumber: 1, isActive: 1 });
qrVehicleSchema.index({ qrCode: 1, isActive: 1 });
qrVehicleSchema.index({ transporterId: 1 });
qrVehicleSchema.index({ createdBy: 1 });
qrVehicleSchema.index({ isActive: 1 });

module.exports = mongoose.model('QRVehicle', qrVehicleSchema);

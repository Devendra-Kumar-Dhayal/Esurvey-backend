const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
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
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      required: true,
    },
    projectName: {
      type: String,
      required: true,
    },
    selectionType: {
      type: String,
      enum: ['way_bridge', 'loading_point', 'unloading_point'],
      required: true,
    },
    selectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
      required: true,
    },
    selectionName: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
    },
    startLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    endLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

tripSchema.index({ userId: 1, status: 1 });
tripSchema.index({ userId: 1, createdAt: -1 });
tripSchema.index({ qrCode: 1 });
tripSchema.index({ vehicleNumber: 1 });
tripSchema.index({ startTime: -1 });

tripSchema.index({ startLocation: '2dsphere' });
tripSchema.index({ endLocation: '2dsphere' });

module.exports = mongoose.model('Trip', tripSchema);

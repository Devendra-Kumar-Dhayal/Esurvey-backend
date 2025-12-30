const mongoose = require('mongoose');

const userSelectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DropdownOption',
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
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

userSelectionSchema.index({ userId: 1, isActive: 1 });
userSelectionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('UserSelection', userSelectionSchema);

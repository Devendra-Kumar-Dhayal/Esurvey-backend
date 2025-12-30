const mongoose = require('mongoose');

const dropdownOptionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['project', 'way_bridge', 'loading_point', 'unloading_point', 'transporter', 'wb_loading_point'],
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for common queries
dropdownOptionSchema.index({ type: 1, isActive: 1, order: 1 });
dropdownOptionSchema.index({ type: 1, isActive: 1, name: 1 });

dropdownOptionSchema.statics.getOptionsByType = function (type) {
  return this.find({ type, isActive: true }).sort({ order: 1, name: 1 }).lean();
};

dropdownOptionSchema.statics.getAllOptions = async function () {
  const [projects, wayBridges, loadingPoints, unloadingPoints, transporters, wbLoadingPoints] = await Promise.all([
    this.getOptionsByType('project'),
    this.getOptionsByType('way_bridge'),
    this.getOptionsByType('loading_point'),
    this.getOptionsByType('unloading_point'),
    this.getOptionsByType('transporter'),
    this.getOptionsByType('wb_loading_point'),
  ]);

  return {
    projects,
    wayBridges,
    loadingPoints,
    unloadingPoints,
    transporters,
    wbLoadingPoints,
  };
};

module.exports = mongoose.model('DropdownOption', dropdownOptionSchema);

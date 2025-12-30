const mongoose = require('mongoose');

const AVAILABLE_PERMISSIONS = [
  'users:read',
  'users:create',
  'users:update',
  'users:delete',
  'locations:read',
  'locations:create',
  'locations:update',
  'locations:delete',
  'reports:read',
  'reports:create',
  'reports:export',
  'settings:read',
  'settings:update',
];

const roleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Role name is required'],
      unique: true,
      trim: true,
      maxlength: [50, 'Role name cannot exceed 50 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
    },
    permissions: {
      type: [String],
      default: [],
      validate: {
        validator: function (permissions) {
          return permissions.every((p) => AVAILABLE_PERMISSIONS.includes(p));
        },
        message: 'Invalid permission specified',
      },
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.statics.getAvailablePermissions = function () {
  return AVAILABLE_PERMISSIONS;
};

roleSchema.methods.hasPermission = function (permission) {
  return this.permissions.includes(permission);
};

roleSchema.methods.hasAnyPermission = function (permissions) {
  return permissions.some((p) => this.permissions.includes(p));
};

roleSchema.methods.hasAllPermissions = function (permissions) {
  return permissions.every((p) => this.permissions.includes(p));
};

module.exports = mongoose.model('Role', roleSchema);
module.exports.AVAILABLE_PERMISSIONS = AVAILABLE_PERMISSIONS;

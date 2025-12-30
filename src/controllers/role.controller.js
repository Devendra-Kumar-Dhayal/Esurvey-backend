const Role = require('../models/Role');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/response');

const createRole = async (req, res) => {
  try {
    const { name, description, permissions, isDefault } = req.body;

    const existingRole = await Role.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingRole) {
      return sendError(res, 'Role with this name already exists', 400);
    }

    if (isDefault) {
      await Role.updateMany({ isDefault: true }, { isDefault: false });
    }

    const role = await Role.create({
      name,
      description,
      permissions: permissions || [],
      isDefault: isDefault || false,
    });

    sendSuccess(res, { role }, 'Role created successfully', 201);
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ name: 1 });

    sendSuccess(res, { roles });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    sendSuccess(res, { role });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const updateRole = async (req, res) => {
  try {
    const { name, description, permissions, isDefault } = req.body;

    const role = await Role.findById(req.params.id);
    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    if (role.isSystem) {
      return sendError(res, 'Cannot modify system role', 403);
    }

    if (name && name !== role.name) {
      const existingRole = await Role.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: role._id },
      });
      if (existingRole) {
        return sendError(res, 'Role with this name already exists', 400);
      }
      role.name = name;
    }

    if (description !== undefined) role.description = description;
    if (permissions !== undefined) role.permissions = permissions;

    if (isDefault !== undefined) {
      if (isDefault) {
        await Role.updateMany({ isDefault: true, _id: { $ne: role._id } }, { isDefault: false });
      }
      role.isDefault = isDefault;
    }

    await role.save();

    sendSuccess(res, { role }, 'Role updated successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    if (role.isSystem) {
      return sendError(res, 'Cannot delete system role', 403);
    }

    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return sendError(
        res,
        `Cannot delete role. ${usersWithRole} user(s) are assigned to this role.`,
        400
      );
    }

    await Role.deleteOne({ _id: role._id });

    sendSuccess(res, null, 'Role deleted successfully');
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getAvailablePermissions = async (req, res) => {
  try {
    const permissions = Role.getAvailablePermissions();

    const groupedPermissions = permissions.reduce((acc, permission) => {
      const [category] = permission.split(':');
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(permission);
      return acc;
    }, {});

    sendSuccess(res, { permissions, grouped: groupedPermissions });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getDefaultRole = async (req, res) => {
  try {
    const role = await Role.findOne({ isDefault: true });

    sendSuccess(res, { role });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);

    if (!role) {
      return sendError(res, 'Role not found', 404);
    }

    const users = await User.find({ role: role._id }).select('-password');

    sendSuccess(res, { role, users, count: users.length });
  } catch (error) {
    sendError(res, error.message, 500);
  }
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  getAvailablePermissions,
  getDefaultRole,
  getUsersByRole,
};

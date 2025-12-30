const User = require('../models/User');
const Location = require('../models/Location');
const Role = require('../models/Role');
const DropdownOption = require('../models/DropdownOption');
const Trip = require('../models/Trip');
const MissingLoadingPointEntry = require('../models/MissingLoadingPointEntry');
const MissingUnloadingPointEntry = require('../models/MissingUnloadingPointEntry');
const { generateAdminToken } = require('../middleware/admin.middleware');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// Admin Authentication
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password').populate('role');
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
    }

    if (!user.isAdmin) {
      return sendError(res, 'Admin access required', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is deactivated', 401);
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateAdminToken(user._id);

    sendSuccess(res, {
      admin: user.toJSON(),
      token,
    }, 'Login successful');
  } catch (error) {
    console.error('Admin login error:', error);
    sendError(res, 'Login failed', 500);
  }
};

const getAdminProfile = async (req, res) => {
  try {
    sendSuccess(res, { admin: req.admin.toJSON() }, 'Profile retrieved successfully');
  } catch (error) {
    console.error('Get admin profile error:', error);
    sendError(res, 'Failed to get profile', 500);
  }
};

// User Management
const createUser = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'User with this email already exists', 400);
    }

    let roleId = null;
    if (role) {
      const roleDoc = await Role.findById(role);
      if (!roleDoc) {
        return sendError(res, 'Invalid role specified', 400);
      }
      roleId = roleDoc._id;
    } else {
      const defaultRole = await Role.findOne({ isDefault: true });
      if (defaultRole) {
        roleId = defaultRole._id;
      }
    }

    const user = await User.create({ email, password, name, role: roleId });
    await user.populate('role');

    sendSuccess(res, { user: user.toJSON() }, 'User created successfully', 201);
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, 'Failed to create user', 500);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { limit = 20, skip = 0, search, isActive, role } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (role) {
      query.role = role;
    }

    const users = await User.find(query)
      .populate('role', 'name permissions')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10))
      .lean();

    const total = await User.countDocuments(query);

    sendPaginated(
      res,
      { users },
      {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        hasMore: parseInt(skip, 10) + users.length < total,
      },
      'Users retrieved successfully'
    );
  } catch (error) {
    console.error('Get users error:', error);
    sendError(res, 'Failed to get users', 500);
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).populate('role').lean();
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    const locationCount = await Location.countDocuments({ userId: id });
    const lastLocation = await Location.findOne({ userId: id })
      .sort({ timestamp: -1 })
      .lean();

    sendSuccess(res, {
      user,
      stats: {
        locationCount,
        lastLocation,
      },
    }, 'User retrieved successfully');
  } catch (error) {
    console.error('Get user error:', error);
    sendError(res, 'Failed to get user', 500);
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, isActive, role } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return sendError(res, 'Email already in use', 400);
      }
      user.email = email;
    }

    if (name) user.name = name;
    if (isActive !== undefined) user.isActive = isActive;

    if (role !== undefined) {
      if (role === null || role === '') {
        user.role = null;
      } else {
        const roleDoc = await Role.findById(role);
        if (!roleDoc) {
          return sendError(res, 'Invalid role specified', 400);
        }
        user.role = roleDoc._id;
      }
    }

    await user.save();
    await user.populate('role');

    sendSuccess(res, { user: user.toJSON() }, 'User updated successfully');
  } catch (error) {
    console.error('Update user error:', error);
    sendError(res, 'Failed to update user', 500);
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    user.password = password;
    await user.save();

    sendSuccess(res, { message: 'Password reset successfully' }, 'Password reset successfully');
  } catch (error) {
    console.error('Reset password error:', error);
    sendError(res, 'Failed to reset password', 500);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return sendError(res, 'User not found', 404);
    }

    await Location.deleteMany({ userId: id });
    await User.findByIdAndDelete(id);

    sendSuccess(res, { message: 'User deleted successfully' }, 'User deleted successfully');
  } catch (error) {
    console.error('Delete user error:', error);
    sendError(res, 'Failed to delete user', 500);
  }
};

// Dashboard Stats
const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalLocations = await Location.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const locationsToday = await Location.countDocuments({
      timestamp: { $gte: today },
    });

    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    sendSuccess(res, {
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers: totalUsers - activeUsers,
        totalLocations,
        locationsToday,
      },
      recentUsers,
    }, 'Dashboard stats retrieved successfully');
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    sendError(res, 'Failed to get dashboard stats', 500);
  }
};

// Admin Management (Superadmin only)
const createAdmin = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'User with this email already exists', 400);
    }

    let roleId = null;
    if (role) {
      const roleDoc = await Role.findById(role);
      if (!roleDoc) {
        return sendError(res, 'Invalid role specified', 400);
      }
      roleId = roleDoc._id;
    } else {
      // Default to Admin role if not specified
      const adminRole = await Role.findOne({ name: { $regex: /^admin$/i } });
      if (adminRole) {
        roleId = adminRole._id;
      }
    }

    const admin = await User.create({
      email,
      password,
      name,
      role: roleId,
      isAdmin: true,
    });
    await admin.populate('role');

    sendSuccess(res, { admin: admin.toJSON() }, 'Admin created successfully', 201);
  } catch (error) {
    console.error('Create admin error:', error);
    sendError(res, 'Failed to create admin', 500);
  }
};

// Dropdown Options Management
const createDropdownOption = async (req, res) => {
  try {
    const { type, name, code, order } = req.body;

    const option = await DropdownOption.create({ type, name, code, order });

    sendSuccess(res, { option }, 'Dropdown option created successfully', 201);
  } catch (error) {
    console.error('Create dropdown option error:', error);
    sendError(res, 'Failed to create dropdown option', 500);
  }
};

const getAllDropdownOptions = async (req, res) => {
  try {
    const { type, isActive } = req.query;

    const query = {};
    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const options = await DropdownOption.find(query)
      .sort({ type: 1, order: 1, name: 1 })
      .lean();

    const grouped = {
      projects: options.filter((o) => o.type === 'project'),
      wayBridges: options.filter((o) => o.type === 'way_bridge'),
      loadingPoints: options.filter((o) => o.type === 'loading_point'),
      unloadingPoints: options.filter((o) => o.type === 'unloading_point'),
      transporters: options.filter((o) => o.type === 'transporter'),
      wbLoadingPoints: options.filter((o) => o.type === 'wb_loading_point'),
    };

    sendSuccess(res, { options, grouped }, 'Dropdown options retrieved successfully');
  } catch (error) {
    console.error('Get dropdown options error:', error);
    sendError(res, 'Failed to get dropdown options', 500);
  }
};

const getDropdownOptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const option = await DropdownOption.findById(id).lean();
    if (!option) {
      return sendError(res, 'Dropdown option not found', 404);
    }

    sendSuccess(res, { option }, 'Dropdown option retrieved successfully');
  } catch (error) {
    console.error('Get dropdown option error:', error);
    sendError(res, 'Failed to get dropdown option', 500);
  }
};

const updateDropdownOption = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, order, isActive } = req.body;

    const option = await DropdownOption.findById(id);
    if (!option) {
      return sendError(res, 'Dropdown option not found', 404);
    }

    if (name !== undefined) option.name = name;
    if (code !== undefined) option.code = code;
    if (order !== undefined) option.order = order;
    if (isActive !== undefined) option.isActive = isActive;

    await option.save();

    sendSuccess(res, { option }, 'Dropdown option updated successfully');
  } catch (error) {
    console.error('Update dropdown option error:', error);
    sendError(res, 'Failed to update dropdown option', 500);
  }
};

const deleteDropdownOption = async (req, res) => {
  try {
    const { id } = req.params;

    const option = await DropdownOption.findById(id);
    if (!option) {
      return sendError(res, 'Dropdown option not found', 404);
    }

    await DropdownOption.findByIdAndDelete(id);

    sendSuccess(res, { message: 'Dropdown option deleted successfully' }, 'Dropdown option deleted successfully');
  } catch (error) {
    console.error('Delete dropdown option error:', error);
    sendError(res, 'Failed to delete dropdown option', 500);
  }
};

const reorderDropdownOptions = async (req, res) => {
  try {
    const { options } = req.body;

    const bulkOps = options.map((item) => ({
      updateOne: {
        filter: { _id: item.id },
        update: { $set: { order: item.order } },
      },
    }));

    await DropdownOption.bulkWrite(bulkOps);

    sendSuccess(res, { message: 'Options reordered successfully' }, 'Options reordered successfully');
  } catch (error) {
    console.error('Reorder dropdown options error:', error);
    sendError(res, 'Failed to reorder options', 500);
  }
};

// Suspicious Entries (Missing Loading/Unloading Point Entries)
const getSuspiciousEntries = async (req, res) => {
  try {
    const { limit = 50, skip = 0, type = 'all' } = req.query;

    let missingLoadingEntries = [];
    let missingUnloadingEntries = [];

    if (type === 'all' || type === 'loading') {
      missingLoadingEntries = await MissingLoadingPointEntry.find()
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .skip(type === 'loading' ? parseInt(skip, 10) : 0)
        .limit(type === 'loading' ? parseInt(limit, 10) : 25)
        .lean();
    }

    if (type === 'all' || type === 'unloading') {
      missingUnloadingEntries = await MissingUnloadingPointEntry.find()
        .populate('userId', 'name email')
        .populate('tripId', 'vehicleNumber projectName selectionName')
        .sort({ createdAt: -1 })
        .skip(type === 'unloading' ? parseInt(skip, 10) : 0)
        .limit(type === 'unloading' ? parseInt(limit, 10) : 25)
        .lean();
    }

    // Add type identifier to each entry
    const loadingWithType = missingLoadingEntries.map(entry => ({
      ...entry,
      entryType: 'missing_loading',
      description: 'Loading point entry was missing when unloading attempted',
    }));

    const unloadingWithType = missingUnloadingEntries.map(entry => ({
      ...entry,
      entryType: 'missing_unloading',
      description: 'Previous trip was not properly ended',
    }));

    // Combine and sort by date
    let allEntries = [...loadingWithType, ...unloadingWithType];
    allEntries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply pagination for 'all' type
    if (type === 'all') {
      allEntries = allEntries.slice(parseInt(skip, 10), parseInt(skip, 10) + parseInt(limit, 10));
    }

    const totalLoading = await MissingLoadingPointEntry.countDocuments();
    const totalUnloading = await MissingUnloadingPointEntry.countDocuments();
    const total = type === 'loading' ? totalLoading : type === 'unloading' ? totalUnloading : totalLoading + totalUnloading;

    sendPaginated(
      res,
      {
        entries: allEntries,
        counts: {
          loading: totalLoading,
          unloading: totalUnloading,
          total: totalLoading + totalUnloading,
        },
      },
      {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        hasMore: parseInt(skip, 10) + allEntries.length < total,
      },
      'Suspicious entries retrieved successfully'
    );
  } catch (error) {
    console.error('Get suspicious entries error:', error);
    sendError(res, 'Failed to get suspicious entries', 500);
  }
};

// Trip Management
const getActiveTrips = async (req, res) => {
  try {
    const { limit = 50, skip = 0, status = 'active' } = req.query;

    const query = {};
    if (status && status !== 'all') {
      query.status = status;
    }

    const trips = await Trip.find(query)
      .populate('userId', 'name email')
      .populate('projectId', 'name code')
      .populate('selectionId', 'name code')
      .sort({ startTime: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10))
      .lean();

    const total = await Trip.countDocuments(query);
    const activeCount = await Trip.countDocuments({ status: 'active' });

    sendPaginated(
      res,
      { trips, activeCount },
      {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
        hasMore: parseInt(skip, 10) + trips.length < total,
      },
      'Trips retrieved successfully'
    );
  } catch (error) {
    console.error('Get active trips error:', error);
    sendError(res, 'Failed to get trips', 500);
  }
};

module.exports = {
  adminLogin,
  getAdminProfile,
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  resetUserPassword,
  deleteUser,
  getDashboardStats,
  createAdmin,
  createDropdownOption,
  getAllDropdownOptions,
  getDropdownOptionById,
  updateDropdownOption,
  deleteDropdownOption,
  reorderDropdownOptions,
  getSuspiciousEntries,
  getActiveTrips,
};

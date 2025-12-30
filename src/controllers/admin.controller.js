const Admin = require('../models/Admin');
const User = require('../models/User');
const Location = require('../models/Location');
const { generateAdminToken } = require('../middleware/admin.middleware');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

// Admin Authentication
const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email }).select('+password');
    if (!admin) {
      return sendError(res, 'Invalid credentials', 401);
    }

    if (!admin.isActive) {
      return sendError(res, 'Account is deactivated', 401);
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid credentials', 401);
    }

    admin.lastLogin = new Date();
    await admin.save();

    const token = generateAdminToken(admin._id);

    sendSuccess(res, {
      admin: admin.toJSON(),
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
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'User with this email already exists', 400);
    }

    const user = await User.create({ email, password, name });

    sendSuccess(res, { user: user.toJSON() }, 'User created successfully', 201);
  } catch (error) {
    console.error('Create user error:', error);
    sendError(res, 'Failed to create user', 500);
  }
};

const getAllUsers = async (req, res) => {
  try {
    const { limit = 20, skip = 0, search, isActive } = req.query;

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

    const users = await User.find(query)
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

    const user = await User.findById(id).lean();
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
    const { name, email, isActive } = req.body;

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

    await user.save();

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
    const { email, password, name, role = 'admin' } = req.body;

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return sendError(res, 'Admin with this email already exists', 400);
    }

    const admin = await Admin.create({ email, password, name, role });

    sendSuccess(res, { admin: admin.toJSON() }, 'Admin created successfully', 201);
  } catch (error) {
    console.error('Create admin error:', error);
    sendError(res, 'Failed to create admin', 500);
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
};

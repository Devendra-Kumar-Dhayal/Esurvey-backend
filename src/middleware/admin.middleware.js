const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendError } = require('../utils/response');

const protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return sendError(res, 'Not authorized, no token provided', 401);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== 'admin') {
      return sendError(res, 'Not authorized as admin', 401);
    }

    const user = await User.findById(decoded.id).populate('role');
    if (!user) {
      return sendError(res, 'User not found', 401);
    }

    if (!user.isAdmin) {
      return sendError(res, 'Admin access required', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'Account is deactivated', 401);
    }

    req.admin = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, 'Invalid token', 401);
    }
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Token expired', 401);
    }
    return sendError(res, 'Not authorized', 401);
  }
};

const requireSuperAdmin = (req, res, next) => {
  const roleName = req.admin.role?.name?.toLowerCase();
  if (roleName !== 'super admin' && roleName !== 'superadmin') {
    return sendError(res, 'Superadmin access required', 403);
  }
  next();
};

const generateAdminToken = (userId) => {
  return jwt.sign({ id: userId, type: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = { protectAdmin, requireSuperAdmin, generateAdminToken };

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
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

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return sendError(res, 'Admin not found', 401);
    }

    if (!admin.isActive) {
      return sendError(res, 'Admin account is deactivated', 401);
    }

    req.admin = admin;
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
  if (req.admin.role !== 'superadmin') {
    return sendError(res, 'Superadmin access required', 403);
  }
  next();
};

const generateAdminToken = (adminId) => {
  return jwt.sign({ id: adminId, type: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

module.exports = { protectAdmin, requireSuperAdmin, generateAdminToken };

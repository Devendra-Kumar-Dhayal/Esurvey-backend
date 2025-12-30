const User = require('../models/User');
const { generateToken } = require('../middleware/auth.middleware');
const { sendSuccess, sendError } = require('../utils/response');

const register = async (req, res) => {
  try {
    const { email, password, name } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'User with this email already exists', 400);
    }

    const user = await User.create({ email, password, name });
    const token = generateToken(user._id);

    sendSuccess(
      res,
      {
        user: user.toJSON(),
        token,
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, 'Registration failed', 500);
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid credentials', 401);
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

    const token = generateToken(user._id);

    sendSuccess(res, {
      user: user.toJSON(),
      token,
    }, 'Login successful');
  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Login failed', 500);
  }
};

const getMe = async (req, res) => {
  try {
    sendSuccess(res, { user: req.user.toJSON() }, 'User retrieved successfully');
  } catch (error) {
    console.error('Get user error:', error);
    sendError(res, 'Failed to get user', 500);
  }
};

module.exports = { register, login, getMe };

const UserSelection = require('../models/UserSelection');
const DropdownOption = require('../models/DropdownOption');
const { sendSuccess, sendError } = require('../utils/response');

const saveSelection = async (req, res) => {
  try {
    const { projectId, selectionType, selectionId } = req.body;
    const userId = req.user._id;

    // Validate project exists
    const project = await DropdownOption.findOne({
      _id: projectId,
      type: 'project',
      isActive: true,
    });
    if (!project) {
      return sendError(res, 'Invalid project', 400);
    }

    // Validate selection exists and matches type
    const selection = await DropdownOption.findOne({
      _id: selectionId,
      type: selectionType,
      isActive: true,
    });
    if (!selection) {
      return sendError(res, 'Invalid selection', 400);
    }

    // Create user selection
    const userSelection = await UserSelection.create({
      userId,
      projectId,
      selectionType,
      selectionId,
    });

    // Populate the response
    const populatedSelection = await UserSelection.findById(userSelection._id)
      .populate('projectId', 'name code')
      .populate('selectionId', 'name code')
      .lean();

    sendSuccess(res, { selection: populatedSelection }, 'Selection saved successfully', 201);
  } catch (error) {
    console.error('Save selection error:', error);
    sendError(res, 'Failed to save selection', 500);
  }
};

const getActiveSelection = async (req, res) => {
  try {
    const userId = req.user._id;

    const selection = await UserSelection.findOne({
      userId,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .populate('projectId', 'name code')
      .populate('selectionId', 'name code')
      .lean();

    sendSuccess(res, { selection }, 'Active selection retrieved');
  } catch (error) {
    console.error('Get selection error:', error);
    sendError(res, 'Failed to get selection', 500);
  }
};

const getSelectionHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20, skip = 0 } = req.query;

    const selections = await UserSelection.find({ userId })
      .sort({ createdAt: -1 })
      .skip(parseInt(skip, 10))
      .limit(parseInt(limit, 10))
      .populate('projectId', 'name code')
      .populate('selectionId', 'name code')
      .lean();

    const total = await UserSelection.countDocuments({ userId });

    sendSuccess(res, {
      selections,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        skip: parseInt(skip, 10),
      },
    }, 'Selection history retrieved');
  } catch (error) {
    console.error('Get history error:', error);
    sendError(res, 'Failed to get history', 500);
  }
};

const deactivateSelection = async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const selection = await UserSelection.findOneAndUpdate(
      { _id: id, userId },
      { isActive: false },
      { new: true }
    );

    if (!selection) {
      return sendError(res, 'Selection not found', 404);
    }

    sendSuccess(res, { selection }, 'Selection deactivated');
  } catch (error) {
    console.error('Deactivate selection error:', error);
    sendError(res, 'Failed to deactivate selection', 500);
  }
};

const getDropdownOptions = async (req, res) => {
  try {
    const options = await DropdownOption.getAllOptions();
    sendSuccess(res, { options }, 'Dropdown options retrieved');
  } catch (error) {
    console.error('Get options error:', error);
    sendError(res, 'Failed to get options', 500);
  }
};

module.exports = {
  saveSelection,
  getActiveSelection,
  getSelectionHistory,
  deactivateSelection,
  getDropdownOptions,
};

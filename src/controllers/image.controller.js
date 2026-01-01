const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const UnloadingPointData = require('../models/UnloadingPointData');
const { sendSuccess, sendError } = require('../utils/response');

const IMAGES_BASE_DIR = path.join(__dirname, '../../images');
const UNLOADING_POINT_DIR = path.join(IMAGES_BASE_DIR, 'unloading_point');

// Ensure directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

ensureDirectoryExists(UNLOADING_POINT_DIR);

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureDirectoryExists(UNLOADING_POINT_DIR);
    cb(null, UNLOADING_POINT_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter for images
const fileFilter = (req, file, cb) => {
  // Accept common image mimetypes including those from mobile devices
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/octet-stream', // Sometimes sent by mobile devices
  ];

  // Also check file extension as fallback
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif'];

  if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, GIF, and WebP images are allowed.`), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Upload image for unloading point data
const uploadUnloadingPointImage = async (req, res) => {
  try {
    const { unloadingPointDataId } = req.params;

    if (!req.file) {
      return sendError(res, 'No image file provided', 400);
    }

    // Find the unloading point data entry
    const unloadingPointData = await UnloadingPointData.findById(unloadingPointDataId);
    if (!unloadingPointData) {
      // Delete the uploaded file since the entry doesn't exist
      fs.unlinkSync(req.file.path);
      return sendError(res, 'Unloading point data entry not found', 404);
    }

    // Delete old image if exists
    if (unloadingPointData.imagePath) {
      const oldImagePath = path.join(__dirname, '../..', unloadingPointData.imagePath);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }

    // Store relative path in database
    const relativePath = `images/unloading_point/${req.file.filename}`;
    unloadingPointData.imagePath = relativePath;
    await unloadingPointData.save();

    sendSuccess(res, {
      imagePath: relativePath,
      unloadingPointDataId,
    }, 'Image uploaded successfully');
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Upload image error:', error);
    sendError(res, 'Failed to upload image', 500);
  }
};

// Get image by filename
const getImage = async (req, res) => {
  try {
    const { filename } = req.params;

    // Sanitize filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    const imagePath = path.join(UNLOADING_POINT_DIR, sanitizedFilename);

    if (!fs.existsSync(imagePath)) {
      return sendError(res, 'Image not found', 404);
    }

    // Determine content type
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Get image error:', error);
    sendError(res, 'Failed to retrieve image', 500);
  }
};

// Get image by unloading point data ID
const getImageByUnloadingPointDataId = async (req, res) => {
  try {
    const { unloadingPointDataId } = req.params;

    const unloadingPointData = await UnloadingPointData.findById(unloadingPointDataId);
    if (!unloadingPointData) {
      return sendError(res, 'Unloading point data entry not found', 404);
    }

    if (!unloadingPointData.imagePath) {
      return sendError(res, 'No image available for this entry', 404);
    }

    const imagePath = path.join(__dirname, '../..', unloadingPointData.imagePath);
    if (!fs.existsSync(imagePath)) {
      return sendError(res, 'Image file not found', 404);
    }

    // Determine content type
    const ext = path.extname(imagePath).toLowerCase();
    const contentTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.sendFile(imagePath);
  } catch (error) {
    console.error('Get image by ID error:', error);
    sendError(res, 'Failed to retrieve image', 500);
  }
};

// Delete image
const deleteImage = async (req, res) => {
  try {
    const { unloadingPointDataId } = req.params;

    const unloadingPointData = await UnloadingPointData.findById(unloadingPointDataId);
    if (!unloadingPointData) {
      return sendError(res, 'Unloading point data entry not found', 404);
    }

    if (!unloadingPointData.imagePath) {
      return sendError(res, 'No image to delete', 400);
    }

    const imagePath = path.join(__dirname, '../..', unloadingPointData.imagePath);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    unloadingPointData.imagePath = null;
    await unloadingPointData.save();

    sendSuccess(res, { message: 'Image deleted successfully' }, 'Image deleted successfully');
  } catch (error) {
    console.error('Delete image error:', error);
    sendError(res, 'Failed to delete image', 500);
  }
};

module.exports = {
  upload,
  uploadUnloadingPointImage,
  getImage,
  getImageByUnloadingPointDataId,
  deleteImage,
};

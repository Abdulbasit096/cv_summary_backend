const multer = require('multer');

/**
 * Error handler for multer upload errors
 */
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum file size is 10MB.',
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 10 files allowed.',
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Use "files" field name.',
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error',
    });
  }

  if (err) {
    // Handle file filter errors
    if (err.message.includes('Invalid file type')) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    return res.status(500).json({
      success: false,
      message: err.message || 'File upload failed',
    });
  }

  next();
};

module.exports = uploadErrorHandler;

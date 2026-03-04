const express = require("express");
const {
  getCVBank,
  uploadCvs,
  getCVById,
  deleteCV,
  deleteBulkCVs,
  getPositions,
  downloadCV,
  updateHrReview,
} = require("../controllers/cvBank.controller");
const { uploadMultiple } = require("../middleware/upload.middleware");
const uploadErrorHandler = require("../middleware/uploadErrorHandler");
const protectedRoute = require("../middleware/auth.middleware");
const router = express.Router();

// All CV Bank routes require authentication
router.use(protectedRoute);

// Upload multiple CV files
// Note: uploadErrorHandler must come before uploadCvs to catch multer errors
router.post(
  "/upload",
  (req, res, next) => {
    uploadMultiple(req, res, (err) => {
      if (err) {
        return uploadErrorHandler(err, req, res, next);
      }
      next();
    });
  },
  uploadCvs,
);

// Get all CVs for authenticated user
router.get("/", getCVBank);

// Get all unique positions for filtering (must come before /:id route)
router.get("/positions", getPositions);

// Bulk delete route must come before /:id route to avoid route conflicts
// Delete multiple CVs (bulk delete)
router.delete("/bulk", deleteBulkCVs);

// Download CV file by ID (must come before /:id route to avoid conflicts)
router.get("/:id/download", downloadCV);

// Get single CV by ID
router.get("/:id", getCVById);

// Delete CV by ID
router.delete("/:id", deleteCV);

// Update HR review status
router.patch("/:cvId/review", updateHrReview);

module.exports = router;

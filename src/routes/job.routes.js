const express = require("express");
const {
  getJobs,
  createJob,
  deleteJob,
  uploadCvsToJob,
  getJobCVs,
} = require("../controllers/job.controller");
const { uploadMultiple } = require("../middleware/upload.middleware");
const uploadErrorHandler = require("../middleware/uploadErrorHandler");
const protectedRoute = require("../middleware/auth.middleware");
const adminOnly = require("../middleware/role.middleware");

const router = express.Router();

// All job routes require authentication
router.use(protectedRoute);

// GET /api/jobs - any authenticated user
router.get("/", getJobs);

// POST /api/jobs - admin only
router.post("/", adminOnly, createJob);

// DELETE /api/jobs/:jobId - admin only
router.delete("/:jobId", adminOnly, deleteJob);

// POST /api/jobs/:jobId/cvs/upload - admin only
router.post(
  "/:jobId/cvs/upload",
  adminOnly,
  (req, res, next) => {
    uploadMultiple(req, res, (err) => {
      if (err) return uploadErrorHandler(err, req, res, next);
      next();
    });
  },
  uploadCvsToJob,
);

// GET /api/jobs/:jobId/cvs - any authenticated user
router.get("/:jobId/cvs", getJobCVs);

module.exports = router;

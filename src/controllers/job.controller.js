const path = require("path");
const fs = require("fs");
const Job = require("../models/job.model");
const CVBank = require("../models/cvBank.model");
const CustomError = require("../utils/customError");
const errorHandler = require("../utils/errorHandler");
const { extractText } = require("../utils/textExtractor");
const { extractPositionAndSummary } = require("../services/aiService");

/**
 * Get all jobs with their CVs populated
 * GET /api/jobs
 */
exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 }).lean();

    // Populate CVs for each job
    const jobsWithCVs = await Promise.all(
      jobs.map(async (job) => {
        const cvs = await CVBank.find({ jobId: job._id, isActive: true })
          .sort({ createdAt: -1 })
          .select(
            "_id originalName fileSize mimeType status hr_review reviewedBy candidateName candidateEmail summary position createdAt updatedAt",
          )
          .lean();
        return { ...job, cvs };
      }),
    );

    res.status(200).json({
      success: true,
      data: jobsWithCVs,
    });
  } catch (error) {
    errorHandler(res, error, "getJobs");
  }
};

/**
 * Create a new job
 * POST /api/jobs
 */
exports.createJob = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || title.trim() === "") {
      throw new CustomError(400, "Job title is required");
    }

    const job = await Job.create({
      title: title.trim(),
      description: description ? description.trim() : "",
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Job created successfully",
      data: job,
    });
  } catch (error) {
    errorHandler(res, error, "createJob");
  }
};

/**
 * Delete a job and all its CVs (DB + disk)
 * DELETE /api/jobs/:jobId
 */
exports.deleteJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      throw new CustomError(404, "Job not found");
    }

    // Find all CVs belonging to this job
    const cvs = await CVBank.find({ jobId });

    // Delete physical files
    for (const cv of cvs) {
      let filePath = cv.path;
      if (filePath.startsWith("file:///")) {
        filePath = filePath.substring(8);
      } else if (filePath.startsWith("file://")) {
        filePath = filePath.substring(7);
      }
      filePath = path.normalize(filePath);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error(`Error deleting file ${filePath}:`, err);
      }
    }

    // Delete all CV records from DB
    await CVBank.deleteMany({ jobId });

    // Delete the job
    await Job.findByIdAndDelete(jobId);

    res.status(200).json({
      success: true,
      message: "Job and all associated CVs deleted successfully",
    });
  } catch (error) {
    errorHandler(res, error, "deleteJob");
  }
};

/**
 * Upload CVs to a specific job
 * POST /api/jobs/:jobId/cvs/upload
 */
exports.uploadCvsToJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    // Verify job exists
    const job = await Job.findById(jobId);
    if (!job) {
      throw new CustomError(404, "Job not found");
    }

    // Handle both 'cvs' and 'files' field names
    let files = [];
    if (req.files) {
      if (req.files.cvs && Array.isArray(req.files.cvs)) {
        files = [...files, ...req.files.cvs];
      }
      if (req.files.files && Array.isArray(req.files.files)) {
        files = [...files, ...req.files.files];
      }
      if (Array.isArray(req.files)) {
        files = req.files;
      }
    }

    if (!files || files.length === 0) {
      throw new CustomError(
        400,
        'No files uploaded. Please use field name "cvs" or "files" in your form-data.',
      );
    }

    if (!req.user || !req.user._id) {
      throw new CustomError(401, "User not authenticated");
    }

    const userId = req.user._id;
    const uploads = [];
    const cvsToProcess = [];

    for (const file of files) {
      let fullPath = path.resolve(file.path);
      fullPath = fullPath.replace(/\\/g, "/");
      const fileUrl = `file:///${fullPath}`;

      const existingCV = await CVBank.findOne({ userId, path: fileUrl });
      if (existingCV) continue;

      const cvRecord = await CVBank.create({
        userId,
        jobId,
        path: fileUrl,
        summary: "Processing summary...",
        position: "Processing...",
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        isActive: true,
      });

      uploads.push({
        _id: cvRecord._id,
        originalName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        jobId,
        position: cvRecord.position,
        summary: cvRecord.summary,
      });

      cvsToProcess.push({
        cvId: cvRecord._id,
        filePath: file.path,
        fileName: file.originalname,
        mimetype: file.mimetype,
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${uploads.length} CV file(s)`,
      data: uploads,
    });

    // Background AI processing
    if (cvsToProcess.length > 0) {
      setImmediate(async () => {
        console.log(
          `[Background] Starting AI processing for ${cvsToProcess.length} CV(s) under job ${jobId}...`,
        );
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        for (let i = 0; i < cvsToProcess.length; i++) {
          const { cvId, filePath, fileName, mimetype } = cvsToProcess[i];
          const cvIndex = i + 1;

          try {
            const extractedText = await extractText(filePath, mimetype);

            if (!extractedText || extractedText.trim().length < 50) {
              await CVBank.findByIdAndUpdate(cvId, {
                summary:
                  "Unable to extract sufficient text from CV for summary generation.",
                position: "Not Specified",
                status: "done",
              });
              console.log(
                `[Background] [${cvIndex}/${cvsToProcess.length}] ${fileName}: Insufficient text extracted`,
              );
              continue;
            }

            console.log(
              `[Background] [${cvIndex}/${cvsToProcess.length}] Processing ${fileName}...`,
            );
            const cvStartTime = Date.now();

            const result = await extractPositionAndSummary(extractedText);
            const position = result.position || "Not Specified";
            const summary = result.summary || "";

            const processingTime = ((Date.now() - cvStartTime) / 1000).toFixed(
              2,
            );

            await CVBank.findByIdAndUpdate(cvId, {
              summary,
              position,
              status: "done",
            });

            console.log(
              `[Background] [${cvIndex}/${cvsToProcess.length}] ${fileName}: Completed in ${processingTime}s - Position: ${position}`,
            );
          } catch (summaryError) {
            console.error(
              `[Background] [${cvIndex}/${cvsToProcess.length}] Error processing ${fileName}:`,
              summaryError.message,
            );

            let position = "Not Specified";
            let summary = "";

            try {
              const extractedText = await extractText(filePath, mimetype);
              if (extractedText && extractedText.trim().length > 50) {
                const {
                  extractPositionFromCV,
                } = require("../services/aiService");
                position = await extractPositionFromCV(extractedText);
                await delay(30000);
              }
            } catch (positionError) {
              console.error(
                `[Background] ${fileName}: Position extraction failed:`,
                positionError.message,
              );
            }

            if (summaryError.status === 401) {
              summary =
                "Summary generation service unavailable. Please check your Groq API key.";
            } else if (summaryError.status === 429) {
              summary =
                "Summary generation rate limit exceeded. Please try again later.";
            } else if (summaryError.status === 503) {
              summary =
                "Summary generation service unavailable. Please try again later.";
            } else if (summaryError.status === 404) {
              summary = `Summary generation model not found. Error: ${summaryError.message}`;
            } else {
              summary = `Summary generation failed: ${summaryError.message}. You can retry later.`;
            }

            await CVBank.findByIdAndUpdate(cvId, {
              summary,
              position,
              status: "done",
            });
          }
        }

        console.log(`[Background] AI processing completed for job ${jobId}`);
      });
    }
  } catch (error) {
    // Clean up uploaded files on failure
    let filesToCleanup = [];
    if (req.files) {
      if (req.files.cvs) filesToCleanup = [...filesToCleanup, ...req.files.cvs];
      if (req.files.files)
        filesToCleanup = [...filesToCleanup, ...req.files.files];
      if (Array.isArray(req.files)) filesToCleanup = req.files;
    }
    filesToCleanup.forEach((file) => {
      try {
        if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
      } catch (err) {
        console.error(`Error deleting file ${file.path}:`, err);
      }
    });
    errorHandler(res, error, "uploadCvsToJob");
  }
};

/**
 * Get all CVs for a specific job
 * GET /api/jobs/:jobId/cvs
 */
exports.getJobCVs = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId);
    if (!job) {
      throw new CustomError(404, "Job not found");
    }

    const cvs = await CVBank.find({ jobId, isActive: true })
      .sort({ createdAt: -1 })
      .select(
        "_id originalName fileSize mimeType status hr_review reviewedBy candidateName candidateEmail summary position createdAt updatedAt",
      );

    res.status(200).json({
      success: true,
      data: cvs,
    });
  } catch (error) {
    errorHandler(res, error, "getJobCVs");
  }
};

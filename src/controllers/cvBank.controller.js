const CVBank = require("../models/cvBank.model");
const CustomError = require("../utils/customError");
const path = require("path");
const fs = require("fs");
const errorHandler = require("../utils/errorHandler");
const { extractText } = require("../utils/textExtractor");
const { extractPositionAndSummary } = require("../services/aiService");

/**
 * Upload multiple CV files
 */
exports.uploadCvs = async (req, res, next) => {
  try {
    // Handle both 'cvs' and 'files' field names
    let files = [];
    if (req.files) {
      // If using upload.fields, files will be an object with arrays
      if (req.files.cvs && Array.isArray(req.files.cvs)) {
        files = [...files, ...req.files.cvs];
      }
      if (req.files.files && Array.isArray(req.files.files)) {
        files = [...files, ...req.files.files];
      }
      // If using upload.array, files will be a direct array
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
    const cvsToProcess = []; // Store CV records that need AI processing

    // Process each uploaded file - save immediately without waiting for AI processing
    for (const file of files) {
      let fullPath = path.resolve(file.path); // Ensure absolute path

      fullPath = fullPath.replace(/\\/g, "/");

      const fileUrl = `file:///${fullPath}`;

      const existingCV = await CVBank.findOne({
        userId: userId,
        path: fileUrl,
      });

      if (existingCV) {
        // File already exists, skip
        continue;
      }

      // Create CV record immediately with placeholder values
      // Summary and position will be generated in background
      const cvRecord = await CVBank.create({
        userId: userId,
        path: fileUrl,
        summary: "Processing summary...", // Placeholder
        position: "Processing...", // Placeholder
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        isActive: true,
      });

      uploads.push({
        id: cvRecord._id,
        path: fileUrl,
        originalName: file.originalname,
        fileSize: file.size,
        position: cvRecord.position,
        summary: cvRecord.summary,
      });

      // Store file info for background processing
      cvsToProcess.push({
        cvId: cvRecord._id,
        filePath: file.path,
        fileName: file.originalname,
        mimetype: file.mimetype,
      });
    }

    // Send fast response to client immediately
    res.status(201).json({
      success: true,
      message: `${uploads.length} CV file(s) uploaded successfully. Summary generation is in progress.`,
      data: {
        uploaded: uploads,
        total: files.length,
        processingStatus: "in_progress", // Indicate that summaries are being processed
      },
    });

    // Process summaries in background using setImmediate
    if (cvsToProcess.length > 0) {
      setImmediate(async () => {
        console.log(
          `[Background] Starting AI processing for ${cvsToProcess.length} CV(s)...`,
        );
        console.log(
          `[Background] Rate limiting: 1 minute delay after each Groq API call`,
        );
        const startTime = Date.now();

        // Helper function to wait for specified milliseconds
        const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        // Process CVs sequentially (one at a time) with delay after each Groq call
        for (let i = 0; i < cvsToProcess.length; i++) {
          const { cvId, filePath, fileName, mimetype } = cvsToProcess[i];
          const cvIndex = i + 1;

          try {
            // Extract text from CV file (no Groq call, no delay needed)
            const extractedText = await extractText(filePath, mimetype);

            if (!extractedText || extractedText.trim().length < 50) {
              // Update with error message
              await CVBank.findByIdAndUpdate(cvId, {
                summary:
                  "Unable to extract sufficient text from CV for summary generation.",
                position: "Not Specified",
              });
              console.log(
                `[Background] [${cvIndex}/${cvsToProcess.length}] ${fileName}: Insufficient text extracted`,
              );
              continue; // Skip to next CV
            }

            // Extract position and generate summary using Groq AI
            console.log(
              `[Background] [${cvIndex}/${cvsToProcess.length}] Processing ${fileName}...`,
            );
            const cvStartTime = Date.now();

            // Make Groq API call (this internally calls Groq twice - position and summary)
            const result = await extractPositionAndSummary(extractedText);
            const position = result.position || "Not Specified";
            const summary = result.summary || "";

            const processingTime = ((Date.now() - cvStartTime) / 1000).toFixed(
              2,
            );

            // Update CV record with generated summary and position
            await CVBank.findByIdAndUpdate(cvId, {
              summary: summary,
              position: position,
            });

            console.log(
              `[Background] [${cvIndex}/${cvsToProcess.length}] ${fileName}: Completed in ${processingTime}s - Position: ${position}`,
            );
            // Delay is already handled inside extractPositionAndSummary after each Groq call
          } catch (summaryError) {
            console.error(
              `[Background] [${cvIndex}/${cvsToProcess.length}] Error processing ${fileName}:`,
              summaryError.message,
            );

            let position = "Not Specified";
            let summary = "";

            // Try to extract position separately if summary generation fails (this is also a Groq call)
            try {
              const extractedText = await extractText(filePath, mimetype);
              if (extractedText && extractedText.trim().length > 50) {
                const {
                  extractPositionFromCV,
                } = require("../services/aiService");
                position = await extractPositionFromCV(extractedText);
                // Wait 1 minute after this Groq API call (position extraction)
                console.log(
                  `[Background] Waiting 60 seconds after position extraction...`,
                );
                await delay(30000);
              }
            } catch (positionError) {
              console.error(
                `[Background] ${fileName}: Position extraction failed:`,
                positionError.message,
              );
            }

            // Set appropriate error message based on error type
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
            } else if (summaryError.message.includes("extract text")) {
              summary = `Failed to extract text from file: ${summaryError.message}`;
            } else {
              summary = `Summary generation failed: ${summaryError.message}. You can retry later.`;
            }

            // Update CV record with error message
            await CVBank.findByIdAndUpdate(cvId, {
              summary: summary,
              position: position,
            });
            // Delay already handled above if position extraction was attempted
          }
        }

        const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(2); // Convert to minutes
        console.log(
          `[Background] AI processing completed for ${cvsToProcess.length} CV(s) in ${totalTime} minutes`,
        );
      });
    }
  } catch (error) {
    // Clean up uploaded files if database save fails
    let filesToCleanup = [];
    if (req.files) {
      if (req.files.cvs) filesToCleanup = [...filesToCleanup, ...req.files.cvs];
      if (req.files.files)
        filesToCleanup = [...filesToCleanup, ...req.files.files];
      if (Array.isArray(req.files)) filesToCleanup = req.files;
    }

    if (filesToCleanup && filesToCleanup.length > 0) {
      filesToCleanup.forEach((file) => {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (err) {
          console.error(`Error deleting file ${file.path}:`, err);
        }
      });
    }
    errorHandler(res, error, "uploadCvs");
  }
};

/**
 * Get all CVs for the authenticated user
 */
exports.getCVBank = async (req, res, next) => {
  try {
    // if (!req.user || !req.user._id) {
    //   throw new CustomError(401, 'User not authenticated');
    // }

    // const userId = req.user._id;

    // Get filter query parameters
    const { position } = req.query;

    // Build query
    // const query = { userId: userId, isActive: true };
    const query = { isActive: true };
    if (position && position.trim() !== "") {
      // Case-insensitive search for position
      query.position = { $regex: position.trim(), $options: "i" };
    }

    const cvs = await CVBank.find(query)
      .sort({ createdAt: -1 })
      .select(
        "_id path summary position originalName mimeType fileSize createdAt updatedAt",
      );

    res.status(200).json({
      success: true,
      message: "CVs retrieved successfully",
      data: cvs,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all unique positions for the authenticated user (for filtering)
 */
exports.getPositions = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, "User not authenticated");
    }

    const userId = req.user._id;

    // Get distinct positions for the user
    const positions = await CVBank.distinct("position", {
      userId: userId,
      isActive: true,
      position: { $nin: ["", "Not Specified"] }, // Exclude empty and default positions
    });

    // Sort positions alphabetically
    const sortedPositions = positions
      .filter((pos) => pos && pos.trim() !== "")
      .sort();

    res.status(200).json({
      success: true,
      message: "Positions retrieved successfully",
      data: sortedPositions,
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadCV = async (req, res, next) => {
  try {
    // Optional: Check authentication if needed
    // if (!req.user || !req.user._id) {
    //   throw new CustomError(401, 'User not authenticated');
    // }

    const { id } = req.params;
    // const userId = req.user._id;

    // Find CV by ID (removed userId check since user commented it out in getCVBank)
    const cv = await CVBank.findOne({ _id: id, isActive: true });

    if (!cv) {
      throw new CustomError(404, "CV not found");
    }

    // Extract file path from file:// URL format
    let filePath = cv.path;

    // Remove file:// protocol if present
    if (filePath.startsWith("file:///")) {
      filePath = filePath.substring(8); // Remove 'file:///'
    } else if (filePath.startsWith("file://")) {
      filePath = filePath.substring(7); // Remove 'file://'
    }

    // Normalize path separators for current OS
    filePath = path.normalize(filePath);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new CustomError(404, "CV file not found on server");
    }

    // Ensure file path is absolute for res.download()
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(filePath);

    // Set the download filename
    const fileName = cv.originalName || `CV-${id}${path.extname(filePath)}`;

    // Download file with proper headers
    res.download(absolutePath, fileName, (err) => {
      if (err) {
        console.error(`Error downloading file ${absolutePath}:`, err);
        if (!res.headersSent) {
          errorHandler(
            res,
            new CustomError(500, "Error downloading file"),
            "downloadCV",
          );
        }
      }
    });
  } catch (error) {
    errorHandler(res, error, "downloadCV");
  }
};

/**
 * Get single CV by ID
 */
exports.getCVById = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, "User not authenticated");
    }

    const { id } = req.params;
    const userId = req.user._id;

    const cv = await CVBank.findOne({
      _id: id,
      userId: userId,
      isActive: true,
    });

    if (!cv) {
      throw new CustomError(404, "CV not found");
    }

    res.status(200).json({
      success: true,
      message: "CV retrieved successfully",
      data: cv,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete CV by ID
 */
exports.deleteCV = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, "User not authenticated");
    }

    const { id } = req.params;
    const userId = req.user._id;

    const cv = await CVBank.findOne({ _id: id, userId: userId });

    if (!cv) {
      throw new CustomError(404, "CV not found");
    }

    // Delete physical file
    // cv.path is stored as file:///E:/MY/... format, so we need to extract the actual path
    let filePath = cv.path;

    // Remove file:// protocol if present
    if (filePath.startsWith("file:///")) {
      filePath = filePath.substring(8); // Remove 'file:///'
    } else if (filePath.startsWith("file://")) {
      filePath = filePath.substring(7); // Remove 'file://'
    }

    // Normalize path separators for current OS
    filePath = path.normalize(filePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Soft delete - set isActive to false
    cv.isActive = false;
    await cv.save();

    res.status(200).json({
      success: true,
      message: "CV deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete multiple CVs by IDs (bulk delete)
 */
exports.deleteBulkCVs = async (req, res, next) => {
  try {
    if (!req.user || !req.user._id) {
      throw new CustomError(401, "User not authenticated");
    }

    const userId = req.user._id;
    const { ids } = req.body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      throw new CustomError(400, "Please provide an array of CV IDs to delete");
    }

    // Validate all IDs are strings/valid MongoDB ObjectIds
    const validIds = ids.filter((id) => {
      if (typeof id !== "string" || id.trim() === "") {
        return false;
      }
      // Basic MongoDB ObjectId format validation (24 hex characters)
      return /^[0-9a-fA-F]{24}$/.test(id.trim());
    });

    if (validIds.length === 0) {
      throw new CustomError(400, "No valid CV IDs provided");
    }

    if (validIds.length !== ids.length) {
      throw new CustomError(
        400,
        "Some CV IDs are invalid. Please provide valid MongoDB ObjectIds.",
      );
    }

    // Find all CVs that belong to the user and match the provided IDs
    const cvs = await CVBank.find({
      _id: { $in: validIds },
      userId: userId,
      isActive: true, // Only delete active CVs
    });

    if (cvs.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No CVs found to delete",
      });
    }

    const deletedIds = [];
    const notFoundIds = [];
    const failedDeletes = [];

    // Delete physical files and soft delete in database
    for (const cv of cvs) {
      try {
        // Delete physical file
        let filePath = cv.path;

        // Remove file:// protocol if present
        if (filePath.startsWith("file:///")) {
          filePath = filePath.substring(8); // Remove 'file:///'
        } else if (filePath.startsWith("file://")) {
          filePath = filePath.substring(7); // Remove 'file://'
        }

        // Normalize path separators for current OS
        filePath = path.normalize(filePath);

        // Delete physical file
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch (fileErr) {
            console.error(`Error deleting physical file ${filePath}:`, fileErr);
            // Continue with database deletion even if file deletion fails
          }
        }

        // Soft delete - set isActive to false
        cv.isActive = false;
        await cv.save();

        deletedIds.push(cv._id.toString());
      } catch (err) {
        console.error(`Error deleting CV ${cv._id}:`, err);
        failedDeletes.push(cv._id.toString());
      }
    }

    // Find IDs that were requested but not found
    const foundIds = cvs.map((cv) => cv._id.toString());
    notFoundIds.push(...validIds.filter((id) => !foundIds.includes(id)));

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${deletedIds.length} CV(s)`,
    });
  } catch (error) {
    errorHandler(res, error, "deleteBulkCVs");
  }
};

/**
 * Update HR review status of a CV
 * PATCH /api/cvBank/:cvId/review
 */
exports.updateHrReview = async (req, res) => {
  try {
    const { cvId } = req.params;
    const { hr_review } = req.body;

    const validValues = ["under_review", "accepted", "rejected"];
    if (!hr_review || !validValues.includes(hr_review)) {
      throw new CustomError(
        400,
        `Invalid hr_review value. Must be one of: ${validValues.join(", ")}`,
      );
    }

    const cv = await CVBank.findByIdAndUpdate(
      cvId,
      { hr_review, reviewedBy: req.user._id },
      { new: true, runValidators: true },
    ).select(
      "_id originalName fileSize mimeType status hr_review reviewedBy summary position createdAt updatedAt",
    );

    if (!cv) {
      throw new CustomError(404, "CV not found");
    }

    res.status(200).json({
      success: true,
      message: "HR review status updated successfully",
      data: cv,
    });
  } catch (error) {
    errorHandler(res, error, "updateHrReview");
  }
};

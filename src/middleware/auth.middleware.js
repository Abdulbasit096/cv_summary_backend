const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config");
const User = require("../models/user.model");
const CustomError = require("../utils/customError");

const protectedRoute = async (req, res, next) => {
  try {
    // Check if cookies exist
    const accessToken = req.cookies?.accessToken;
    const refreshToken = req.cookies?.refreshToken;


    if (!refreshToken) {
      throw new CustomError(401, "Unauthorized");
    }

    // Attempt to verify access token
    let decoded;
    try {
      // If access token is missing, try refresh token directly
      if (!accessToken) {
        throw new Error("No access token");
      }
      decoded = jwt.verify(accessToken, authConfig.accessSecret);
    } catch (err) {
      // If access token expired, invalid, or missing, verify refresh token
      if (
        err.name === "TokenExpiredError" ||
        err.name === "JsonWebTokenError" ||
        err.message === "No access token"
      ) {
        try {
          decoded = jwt.verify(refreshToken, authConfig.refreshSecret);
          // Generate new access token with same payload structure
          const newAccessToken = jwt.sign(
            { 
              userId: decoded.userId,
              email: decoded.email,
              role: decoded.role
            },
            authConfig.accessSecret,
            {
              expiresIn: "15m",
            }
          );
          res.cookie("accessToken", newAccessToken, {
            httpOnly: true,
            // Always mark as Secure to ensure cookie is only sent over HTTPS
            secure: true,
            sameSite: process.env.NODE_ENV === "development" ? "None" : "strict",
            maxAge: 15 * 60 * 1000,
          });
        } catch (refreshErr) {
          throw new CustomError(401, "Unauthorized");
        }
      } else {
        throw err;
      }
    }

    // Find user using userId from token
    const userId = decoded.userId || decoded.id; // Support both for compatibility
    if (!userId) {
      throw new CustomError(401, "Invalid token");
    }

    const user = await User.findById(userId).select('_id firstName lastName email role isActive');

    if (!user) {
      throw new CustomError(401, "User not found");
    }

    if (!user.isActive) {
      throw new CustomError(403, "Your account has been deactivated");
    }



    req.user = user;
    next();
  } catch (error) {
    // Optional: Clear cookies on failure
    // Clear with same attributes to ensure removal in all browsers
    const serverConfig = require("../config/server.config");
    const clearOpts = { 
      httpOnly: true, 
      secure: true, 
      sameSite: serverConfig.nodeEnv === "development" ? "None" : "strict", 
      path: "/" 
    };
    try { res.clearCookie("accessToken", clearOpts); } catch (_) { }
    try { res.clearCookie("refreshToken", clearOpts); } catch (_) { }
    return res.status(error.status || 500).json({
      success: false,
      message: error.status === 401 || error.status === 403 ? error.message : "Internal Server Error",
    });
  }
};

module.exports = protectedRoute;

const jwt = require("jsonwebtoken");
const authConfig = require("../config/auth.config");
const serverConfig = require("../config/server.config");

exports.generateJWT = (payload, res) => {
  try {
    const accessExpiresIn = "15m";
    const refreshExpiresIn = "7d";

    if (!authConfig.accessSecret || !authConfig.refreshSecret) {
      throw new Error("JWT secrets are missing in configuration.");
    }

    console.log(authConfig.accessSecret, authConfig.refreshSecret);

    const accessToken = jwt.sign(payload, authConfig.accessSecret, {
      expiresIn: accessExpiresIn,
    });
    const refreshToken = jwt.sign(payload, authConfig.refreshSecret, {
      expiresIn: refreshExpiresIn,
    });

    // Set access token (30 seconds)
    res.cookie("accessToken", accessToken, {
      httpOnly: true,  // prevents JavaScript access
      secure: true,    // ensures cookie only sent over HTTPS
      sameSite: serverConfig.nodeEnv === "development" ? "None" : "strict", // helps prevent CSRF
      maxAge: 15 * 60 * 1000,
    });

    // Set refresh token (2 minutes)
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,  // prevents JavaScript access
      secure: true,    // ensures cookie only sent over HTTPS
      sameSite: serverConfig.nodeEnv === "development" ? "None" : "strict", // helps prevent CSRF
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return refreshToken;
  } catch (err) {
    console.error("[JWT ERROR] Token generation failed:", err.message);
    throw new Error("Failed to generate authentication tokens.");
  }
};

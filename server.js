const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const userRoutes = require("./src/routes/user.routes");
const cvBankRoutes = require("./src/routes/cvBank.routes");
const userAuthRoutes = require("./src/routes/userAuth.routes");
const jobRoutes = require("./src/routes/job.routes");
const adminRoutes = require("./src/routes/admin.routes");
const serverConfig = require("./src/config/server.config");
const connectDB = require("./src/config/database");

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet()); // Security headers
app.use(
  cors({
    origin: true,
    credentials: true, // Allow cookies to be sent
  }),
); // Enable CORS
app.use(morgan("dev")); // Logging
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(cookieParser()); // Parse cookies

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use("/api/user", userRoutes);
app.use("/api/auth", userAuthRoutes);
app.use("/api/cvBank", cvBankRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/admin", adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Start server
app.listen(serverConfig.port, () => {
  console.log(`Server is running on port ${serverConfig.port}`);
  console.log(`Environment: ${serverConfig.nodeEnv}`);
});

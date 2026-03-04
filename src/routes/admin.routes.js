const express = require("express");
const { getAllUsers } = require("../controllers/user.controller");
const protectedRoute = require("../middleware/auth.middleware");
const adminOnly = require("../middleware/role.middleware");

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protectedRoute, adminOnly);

// GET /api/admin/users
router.get("/users", getAllUsers);

module.exports = router;

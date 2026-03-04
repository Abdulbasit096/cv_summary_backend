const express = require('express');
const { getUser } = require('../controllers/user.controller');
const protectedRoute = require('../middleware/auth.middleware');
const router = express.Router();

// Auth routes

router.get('/getUser', protectedRoute, getUser);

module.exports = router;
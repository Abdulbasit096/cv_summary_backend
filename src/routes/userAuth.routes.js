const express = require('express');
const { getUser } = require('../controllers/user.controller');
const { signup, login, logout } = require('../controllers/userAuth.controller');
const { signupValidation, loginValidation, validate } = require('../utils/validation');
const protectedRoute = require('../middleware/auth.middleware');
const router = express.Router();

// Auth routes
router.post('/signup', signup);
router.post('/login', loginValidation, validate, login);
router.post('/logout', logout);


module.exports = router;
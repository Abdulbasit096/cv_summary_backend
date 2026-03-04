const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const CustomError = require('../utils/customError');
const { splitName } = require('../utils/helper');
const { generateJWT } = require('../services/user.service');
const serverConfig = require('../config/server.config');
const errorHandler = require('../utils/errorHandler');

/**
 * Signup controller
 * Handles user registration
 */
exports.signup = async (req, res, next) => {
  try {
    const { name, email, password,role } = req.body;
    console.log(name, email, password,role);

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new CustomError(409, 'User with this email already exists');
    }

    // Split name into firstName and lastName
    const { firstName, lastName } = splitName(name);

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password: hashedPassword,
      role,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
    });
  } catch (error) {
    errorHandler(res, error, "signup");
  }
};

/**
 * Login controller
 * Handles user authentication
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email (include password field)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    // Check if user exists
    if (!user) {
      throw new CustomError(401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new CustomError(403, 'Your account has been deactivated. Please contact support.');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError(401, 'Invalid email or password');
    }

    // Prepare JWT payload
    const payload = {
      userId: user._id,
      email: user.email,
      role: user.role,
    };

    // Generate JWT tokens and set cookies
    generateJWT(payload, res);

    // Prepare user response (without password)
    const userResponse = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: userResponse,
    });
  } catch (error) {
    errorHandler(res, error, "login");
  }
};

/**
 * Logout controller
 * Clears authentication cookies
 */
exports.logout = async (req, res, next) => {
  try {
    // Clear access token cookie
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: true,
      sameSite: serverConfig.nodeEnv === 'development' ? 'None' : 'strict',
      maxAge: 0, // Immediately expire
    });

    // Clear refresh token cookie
    res.cookie('refreshToken', '', {
      httpOnly: true,
      secure: true,
      sameSite: serverConfig.nodeEnv === 'development' ? 'None' : 'strict',
      maxAge: 0, // Immediately expire
    });

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
   errorHandler(res, error, "logout");
  }
};
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Helper to sign JWT
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role || 'user' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a new colleague account
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    // Check if user already exists
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken. Please choose another.'
      });
    }

    // Hash password securely
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save User
    const newUser = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword
    });

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'Account registered successfully!',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role || 'user'
      }
    });

  } catch (error) {
    console.error('[Auth Register Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again later.'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate colleague & return JWT token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or username

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter your username/email and password.'
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. User not found.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials. Password incorrect.'
      });
    }

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role || 'user'
      }
    });

  } catch (error) {
    console.error('[Auth Login Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again later.'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current authenticated user info
// @access  Private
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('[Auth Me Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user data.'
    });
  }
});

module.exports = router;

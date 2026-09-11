const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');

// @route   GET /api/admin/payments
// @desc    Get all colleague payment transactions
// @access  Private (Admin Only)
router.get('/payments', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('user', 'username email role')
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('[Admin Get Payments Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve all payment records.'
    });
  }
});

// @route   GET /api/admin/stats
// @desc    Get system-wide metrics and summary
// @access  Private (Admin Only)
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find().lean();
    const usersCount = await User.countDocuments();

    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalTransactions = payments.length;
    
    // Unique colleagues who submitted payments
    const uniqueColleagueIds = new Set(payments.map(p => p.user ? p.user.toString() : 'unknown'));
    const activeColleaguesCount = uniqueColleagueIds.size;

    const emailedCount = payments.filter(p => p.emailSentStatus).length;

    res.json({
      success: true,
      stats: {
        totalAmount,
        totalTransactions,
        totalColleagues: usersCount,
        activeColleaguesCount,
        emailedCount
      }
    });
  } catch (error) {
    console.error('[Admin Stats Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to calculate system statistics.'
    });
  }
});

// @route   POST /api/admin/make-admin
// @desc    Promote logged-in user to admin (or self-promote using setup secret / first user rule)
// @access  Private
router.post('/make-admin', authMiddleware, async (req, res) => {
  try {
    const { setupSecret } = req.body;
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || 'ramidos_admin_secret_2026';

    const adminCount = await User.countDocuments({ role: 'admin' });

    // Allow promotion if setupSecret matches OR if no admin exists yet
    if (adminCount > 0 && setupSecret !== expectedSecret) {
      return res.status(400).json({
        success: false,
        message: 'Invalid setup secret. Admin promotion denied.'
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    user.role = 'admin';
    await user.save();

    res.json({
      success: true,
      message: `User ${user.username} has been promoted to Admin successfully!`,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Admin Promotion Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to promote user to Admin.'
    });
  }
});

module.exports = router;

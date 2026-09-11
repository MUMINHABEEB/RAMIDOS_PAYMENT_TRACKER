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

module.exports = router;

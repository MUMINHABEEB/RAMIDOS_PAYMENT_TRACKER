const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User not authenticated.'
      });
    }

    // Always fetch fresh user from database to verify admin role
    const dbUser = await User.findById(req.user.id);

    if (dbUser && dbUser.role === 'admin') {
      req.user.role = 'admin';
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator privileges required.'
      });
    }
  } catch (error) {
    console.error('[Admin Middleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during admin authorization check.'
    });
  }
};

module.exports = adminMiddleware;

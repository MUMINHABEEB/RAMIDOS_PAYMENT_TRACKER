const User = require('../models/User');

const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. User not authenticated.'
      });
    }

    // Always fetch fresh user from database
    const dbUser = await User.findById(req.user.id);

    // EXPLICIT REQUIREMENT: Strictly allow ONLY the 'mumin_admin' account
    const isMuminAdmin = dbUser && 
      dbUser.role === 'admin' && 
      (dbUser.username === 'mumin_admin' || dbUser.email === 'admin@ramidos.com');

    if (isMuminAdmin) {
      req.user.role = 'admin';
      next();
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Administrator panel is restricted exclusively to mumin_admin.'
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

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

let isConnected = false;

// Seed default Admin user if not present
const seedAdminUser = async () => {
  try {
    const User = require('../models/User');
    const adminUsername = 'mumin_admin';
    const adminEmail = 'admin@ramidos.com';
    const adminPlainPassword = '1Muin#23';

    let admin = await User.findOne({ 
      $or: [{ username: adminUsername }, { email: adminEmail }] 
    });

    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminPlainPassword, salt);

      admin = await User.create({
        username: adminUsername,
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log(`[Admin Seed] Default admin account '${adminUsername}' created successfully.`);
    } else {
      if (admin.role !== 'admin') {
        admin.role = 'admin';
        await admin.save();
        console.log(`[Admin Seed] Updated '${adminUsername}' role to admin.`);
      }
    }
  } catch (err) {
    console.error('[Admin Seed Error]:', err.message);
  }
};

const connectDB = async () => {
  if (isConnected && mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    console.warn('[MongoDB Warning] MONGODB_URI missing in environment variables.');
    return;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to: ${conn.connection.host}`);
    
    // Seed default admin account
    await seedAdminUser();
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
  }
};

module.exports = connectDB;

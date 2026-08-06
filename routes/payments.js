const express = require('express');
const router = express.Router();
const multer = require('multer');
const nodemailer = require('nodemailer');
const Payment = require('../models/Payment');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Setup multer memory storage (stores file in memory buffer, never on disk)
const storage = multer.memoryStorage();

// File filter for images & PDFs
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only Image files (JPG, PNG, WEBP) and PDF files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15 MB limit
  },
  fileFilter: fileFilter
});

// Helper function to create Nodemailer Transporter
const createEmailTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn('[Nodemailer Warning] SMTP credentials missing in .env. Email dispatch might fail.');
  }

  return nodemailer.createTransport({
    host: host,
    port: port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user: user,
      pass: pass
    }
  });
};

// @route   POST /api/payments
// @desc    Submit payment record & send receipt via email
// @access  Private
router.post('/', authMiddleware, upload.single('receipt'), async (req, res) => {
  try {
    const { amount, paymentDate, description } = req.body;
    const userId = req.user.id;

    // Validation
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid payment amount.'
      });
    }

    if (!paymentDate) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid payment date.'
      });
    }

    if (!description || description.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a description or purpose for the payment.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Receipt file attachment is required.'
      });
    }

    // Fetch user details for email template
    const colleague = await User.findById(userId);
    const colleagueName = colleague ? colleague.username : req.user.username;
    const colleagueEmail = colleague ? colleague.email : req.user.email;

    // 1. Save ONLY text records in MongoDB
    const paymentRecord = new Payment({
      user: userId,
      paymentDate: new Date(paymentDate),
      amount: parseFloat(amount),
      description: description.trim(),
      receiptOriginalName: req.file.originalname,
      emailSentStatus: false
    });

    await paymentRecord.save();

    // 2. Email payment details & receipt attachment using Nodemailer
    const targetEmail = process.env.TARGET_EMAIL || colleagueEmail;
    let emailSent = false;
    let emailErrorMessage = '';

    try {
      const transporter = createEmailTransporter();

      const formattedDate = new Date(paymentDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const formattedAmount = new Intl.NumberFormat('en-AE', {
        style: 'currency',
        currency: 'AED'
      }).format(parseFloat(amount));

      const mailOptions = {
        from: `"${colleagueName} via Payment Tracker" <${process.env.SMTP_USER || colleagueEmail}>`,
        to: targetEmail,
        subject: `[Payment Receipt Log] ${colleagueName} - ${formattedAmount} - ${formattedDate}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #4F46E5; padding: 20px; text-align: center; color: white;">
              <h2 style="margin: 0; font-size: 22px;">New Payment Record Submitted</h2>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Internal Payment Tracking Notification</p>
            </div>
            
            <div style="padding: 24px; background-color: #ffffff;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666; font-weight: bold;">Submitted By:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #333; text-align: right;">${colleagueName} (${colleagueEmail})</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666; font-weight: bold;">Payment Amount:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #10B981; font-weight: bold; font-size: 18px; text-align: right;">${formattedAmount}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666; font-weight: bold;">Payment Date:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #333; text-align: right;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #666; font-weight: bold;">Receipt Attached:</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; color: #333; text-align: right;">${req.file.originalname}</td>
                </tr>
              </table>

              <div style="margin-top: 20px; background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #4F46E5;">
                <h4 style="margin: 0 0 8px 0; color: #374151;">Payment Purpose / Description:</h4>
                <p style="margin: 0; color: #4B5563; white-space: pre-wrap;">${description.trim()}</p>
              </div>

              <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee; text-align: center; color: #9CA3AF; font-size: 12px;">
                Note: The receipt file was processed directly from server memory and attached to this email. It has not been stored in the database.
              </div>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: req.file.originalname,
            content: req.file.buffer
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      emailSent = true;
      paymentRecord.emailSentStatus = true;
      await paymentRecord.save();
    } catch (mailErr) {
      console.error('[Nodemailer Error]:', mailErr);
      emailErrorMessage = mailErr.message;
    }

    res.status(201).json({
      success: true,
      message: emailSent
        ? 'Payment record submitted and receipt emailed successfully!'
        : 'Payment record saved to database, but receipt email dispatch failed (Check SMTP settings).',
      emailSent: emailSent,
      emailError: emailErrorMessage || null,
      payment: {
        id: paymentRecord._id,
        amount: paymentRecord.amount,
        paymentDate: paymentRecord.paymentDate,
        description: paymentRecord.description,
        receiptOriginalName: paymentRecord.receiptOriginalName
      }
    });

  } catch (error) {
    console.error('[Submit Payment Error]:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while submitting payment record.'
    });
  }
});

// @route   GET /api/payments/history
// @desc    Get user's previous payment submissions
// @access  Private
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user.id })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      count: payments.length,
      payments
    });
  } catch (error) {
    console.error('[Payment History Error]:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve payment history.'
    });
  }
});

module.exports = router;

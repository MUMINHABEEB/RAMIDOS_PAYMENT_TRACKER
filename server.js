const app = require('./app');
const express = require('express');
const path = require('path');

// Serve static frontend files from 'public' directory when running locally
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route for HTML navigation
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Payment Tracker Server running on port ${PORT}`);
  console.log(`👉 Access website at: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const patientRoutes = require('./routes/patientRoutes');
const searchRoutes = require('./routes/searchRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const historyRoutes = require('./routes/historyRoutes');
const mobileUserRoutes = require('./routes/mobileUserRoutes');
const reportRoutes = require('./routes/reportRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const billingRoutes = require('./routes/billingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const inventoryRoutes = require('./routes/inventoryRoutes');

const cors = require('cors');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Updated CORS configuration with cache-control headers
// Allow all origins for development (restrict in production if needed)
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'https://drwaiting-30f56.web.app',
      'https://drwaiting-30f56.firebaseapp.com',
      'https://dashboard-web-app-c25d1324e042.herokuapp.com',  // Heroku frontend
      'http://localhost:3000',  // Common React default port
      'http://localhost:3001',  // Your current frontend port
      'http://localhost:3006',  // Frontend port
      'http://localhost:7000',  // Your backend port
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3006',
    ];

    // Allow all localhost origins for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Log for debugging
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow for now - restrict in production
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Origin',
    'X-Requested-With',
    'Accept',
    'Cache-Control',   // Added for cache-busting
    'Pragma',          // Added for cache-busting
    'Expires'          // Added for cache-busting
  ],
  credentials: true,
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Body parser for JSON and URL-encoded (but NOT multipart/form-data - multer handles that)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Register routes
app.use('/api', patientRoutes);
app.use('/api', searchRoutes);
app.use('/api', doctorRoutes);
app.use('/api', historyRoutes);
app.use('/api', mobileUserRoutes);
app.use('/api', reportRoutes);
app.use('/api', serviceRoutes);
app.use('/api', billingRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', inventoryRoutes);

// Error handling middleware - must be after routes
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  console.error('Error stack:', err.stack);
  console.error('Request URL:', req.url);
  console.error('Request method:', req.method);

  // Handle multer errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 10MB.'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`
    });
  }

  // Handle other errors
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start the server
const PORT = process.env.PORT || 6000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
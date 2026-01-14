const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const patientRoutes = require('./routes/patientRoutes');
const searchRoutes = require('./routes/searchRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const historyRoutes = require('./routes/historyRoutes');

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

app.use(bodyParser.json());

// Register routes
app.use('/api', patientRoutes);
app.use('/api', searchRoutes);
app.use('/api', doctorRoutes);
app.use('/api', historyRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 6000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});
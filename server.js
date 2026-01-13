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
app.use(cors({
  origin: [
    'https://drwaiting-30f56.web.app',
    'https://drwaiting-30f56.firebaseapp.com',
    'http://localhost:3000',  // Common React default port
    'http://localhost:3001',  // Your current frontend port
    'http://localhost:3006',  // Frontend port
    'http://localhost:7000',  // Your backend port
    // true  // Allow dynamic origins (use cautiously)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
  credentials: true
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
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
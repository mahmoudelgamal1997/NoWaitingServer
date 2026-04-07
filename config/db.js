const mongoose = require('mongoose');

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

const connectDB = async () => {
    try {
        if (!mongoUri) {
            console.error('❌ MONGO_URI or MONGODB_URI environment variable is not set');
            return;
        }
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error.message);
        // Don't exit - let the server continue running
        // The server can still start even if DB connection fails
    }
};

module.exports = connectDB;

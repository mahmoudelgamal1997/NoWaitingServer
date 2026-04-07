const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        if (!process.env.MONGO_URI) {
            console.error('❌ MONGO_URI environment variable is not set');
            return;
        }
        await mongoose.connect(process.env.MONGO_URI, {
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

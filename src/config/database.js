// Database configuration
const mongoose = require('mongoose');
const serverConfig = require('./server.config');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(serverConfig.mongodbUri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

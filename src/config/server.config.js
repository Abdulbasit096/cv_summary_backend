require('dotenv').config();

if (!process.env.GROQ_API_KEY) {
    console.warn('⚠️  WARNING: GROQ_API_KEY is not set in environment variables. CV summary generation will fail.');
}

module.exports = {
    port: process.env.PORT || 8000,
    nodeEnv: process.env.NODE_ENV || 'development',
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cv-summary',
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
}
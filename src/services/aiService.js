const Groq = require('groq-sdk');
const CustomError = require('../utils/customError');
const serverConfig = require('../config/server.config');

// Initialize Groq client
if (!serverConfig.groqApiKey) {
  console.error('❌ ERROR: GROQ_API_KEY is not set in environment variables.');
  console.error('Please create a .env file with: GROQ_API_KEY=your_api_key_here');
}

const groq = new Groq({
  apiKey: serverConfig.groqApiKey,
});

/**
 * Extract position/job title from CV text
 * @param {string} cvText - Extracted text from CV
 * @returns {Promise<string>} Extracted position/job title
 */
const extractPositionFromCV = async (cvText) => {
  try {
    // Use first 2000 characters for position extraction (usually position is at the top)
    const textForPosition = cvText.substring(0, 2000);

    const prompt = `You are a CV analyzer. Extract the current or most recent job title/position from the following CV/resume text.

Look for:
- Current position or job title
- Most recent role if multiple positions are listed
- Professional title (e.g., "Software Engineer", "Marketing Manager", "Data Scientist")
- If no clear position is found, return "Not Specified"

Respond with ONLY the job title/position in 2-5 words maximum. Do not include company name, dates, or any other information.

CV Content:
${textForPosition}

Position/Job Title:`;

    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: model,
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 50, // Short response for position only
    });

    let position = completion.choices[0]?.message?.content?.trim() || 'Not Specified';
    
    // Clean up the position string
    position = position.replace(/^Position[:\s]*/i, '').replace(/^Job Title[:\s]*/i, '').trim();
    
    // If position is too long or contains unwanted text, try to extract just the title
    if (position.length > 100 || position.includes('\n')) {
      const lines = position.split('\n');
      position = lines[0].trim();
    }

    // Default if empty or too short
    if (!position || position.length < 2) {
      position = 'Not Specified';
    }

    return position;
  } catch (error) {
    console.error('[Groq] Error extracting position:', error.message);
    // Return default on error instead of throwing
    return 'Not Specified';
  }
};

/**
 * Generate CV summary using Groq
 * @param {string} cvText - Extracted text from CV
 * @returns {Promise<string>} Generated summary
 */
const generateSummaryWithGroq = async (cvText) => {
  try {
    // Limit text length to avoid token limits (Groq models typically support up to 32k tokens)
    const maxTextLength = 12000; // Increased for Groq's larger context window
    const truncatedText = cvText.length > maxTextLength 
      ? cvText.substring(0, maxTextLength) + '...' 
      : cvText;

    const prompt = `You are a professional CV analyzer. Analyze the following CV/resume and create a concise, well-structured summary in 150-200 words.

The summary should include:
1. Professional background and experience level
2. Key technical and soft skills
3. Education highlights
4. Notable achievements or accomplishments
5. Career focus or specialization

Write in a clear, professional tone. Use bullet points or short paragraphs.

CV Content:
${truncatedText}

Please provide the summary now:`;

    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      model: model,
      temperature: 0.7, // Balance between creativity and consistency
      max_tokens: 400, // Limit response to ~400 tokens (roughly 300 words)
    });

    const summary = completion.choices[0]?.message?.content?.trim() || 'Summary generation completed but no content returned.';

    // Validate summary length
    if (summary.length < 50) {
      throw new Error('Generated summary is too short. Please try again.');
    }

    return summary;
  } catch (error) {
    // Check for API key errors
    if (error.status === 401 || error.message.includes('api key') || error.message.includes('authentication')) {
      throw new CustomError(401, 'Invalid Groq API key. Please check your GROQ_API_KEY environment variable.');
    }
    
    // Check for rate limiting
    if (error.status === 429 || error.message.includes('rate limit')) {
      throw new CustomError(429, 'Groq API rate limit exceeded. Please try again later.');
    }
    
    // Check if model is not found or invalid
    if (error.status === 404 || error.message.includes('model') && error.message.includes('not found')) {
      throw new CustomError(404, `Groq model "${process.env.GROQ_MODEL || 'llama-3.1-8b-instant'}" not found or invalid.`);
    }

    throw new CustomError(500, `Failed to generate summary: ${error.message}`);
  }
};

// Helper function to wait for specified milliseconds
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract both position and summary from CV text
 * @param {string} cvText - Extracted text from CV
 * @returns {Promise<{position: string, summary: string}>} Object containing position and summary
 */
const extractPositionAndSummary = async (cvText) => {
  let position = 'Not Specified';
  let summary = '';
  
  try {
    // Extract position first (sequential processing with delay between calls)
    console.log('[Groq] Extracting position...');
    try {
      position = await extractPositionFromCV(cvText);
      // Wait 1 minute after position extraction Groq call
      console.log('[Groq] Position extracted. Waiting 60 seconds before next API call...');
      await delay(30000); // 30 seconds delay
      console.log('[Groq] Resuming...');
    } catch (positionError) {
      console.error('[Groq] Position extraction failed:', positionError.message);
      position = 'Not Specified';
    }

    // Generate summary after delay
    console.log('[Groq] Generating summary...');
    try {
      summary = await generateSummaryWithGroq(cvText);
      // Wait 1 minute after summary generation Groq call
      console.log('[Groq] Summary generated. Waiting 60 seconds after API call...');
      await delay(30000); // 30 seconds delay
      console.log('[Groq] Completed.');
    } catch (summaryError) {
      // If summary fails, throw error but keep position
      if (summaryError.status === 503) {
        throw new CustomError(503, summaryError.message);
      } else if (summaryError.status === 404) {
        throw new CustomError(404, summaryError.message);
      } else if (summaryError.status === 401) {
        throw new CustomError(401, summaryError.message);
      } else if (summaryError.status === 429) {
        throw new CustomError(429, summaryError.message);
      } else {
        throw new CustomError(500, `Failed to generate summary: ${summaryError.message}`);
      }
    }

    return { position, summary };
  } catch (error) {
    // If it's a CustomError, re-throw it with position included
    if (error instanceof CustomError) {
      throw error;
    }
    // For other errors, position should already be set
    throw error;
  }
};

/**
 * Test Groq connection
 * @returns {Promise<boolean>} True if connection successful
 */
const testGroqConnection = async () => {
  try {
    const model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';
    await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: 'test',
        },
      ],
      model: model,
      max_tokens: 5,
    });
    return true;
  } catch (error) {
    console.error('[Groq] Connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  generateSummaryWithGroq,
  extractPositionFromCV,
  extractPositionAndSummary,
  testGroqConnection,
};

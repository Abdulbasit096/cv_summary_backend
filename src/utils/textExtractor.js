const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const fs = require('fs');

/**
 * Extract text from PDF file
 * @param {string} filePath - Full path to PDF file
 * @returns {Promise<string>} Extracted text content
 */
const extractPDFText = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text.trim();
  } catch (error) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
};

/**
 * Extract text from DOCX file
 * @param {string} filePath - Full path to DOCX file
 * @returns {Promise<string>} Extracted text content
 */
const extractDOCXText = async (filePath) => {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  } catch (error) {
    throw new Error(`Failed to extract text from DOCX: ${error.message}`);
  }
};

/**
 * Extract text from DOC file (older format)
 * Note: .doc files require additional system dependencies
 * @param {string} filePath - Full path to DOC file
 * @returns {Promise<string>} Extracted text content
 */
const extractDOCText = async (filePath) => {
  // For .doc files (old format), we can try using mammoth or suggest conversion
  // mammoth might work for some .doc files that are actually .docx
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value.trim();
  } catch (error) {
    throw new Error(`Failed to extract text from DOC file. Please convert to PDF or DOCX format. Error: ${error.message}`);
  }
};

/**
 * Extract text based on file MIME type
 * @param {string} filePath - Full path to file
 * @param {string} mimeType - MIME type of the file
 * @returns {Promise<string>} Extracted text content
 */
const extractText = async (filePath, mimeType) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  if (mimeType === 'application/pdf') {
    return await extractPDFText(filePath);
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return await extractDOCXText(filePath);
  } else if (mimeType === 'application/msword') {
    return await extractDOCText(filePath);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
};

module.exports = {
  extractText,
  extractPDFText,
  extractDOCXText,
  extractDOCText,
};

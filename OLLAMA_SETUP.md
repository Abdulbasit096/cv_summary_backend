# Ollama Setup Guide for CV Summary Generation

## Overview
This application uses Ollama (local AI) to generate CV summaries automatically when CVs are uploaded.

## Quick Setup Options

### Option 1: Docker (Recommended) 🐳

**Easiest method - No installation needed!**

1. Start Ollama with Docker:
```bash
docker-compose up -d ollama
```

2. Download model:
```bash
docker exec -it cv-summary-ollama ollama pull llama3
```

3. Configure `.env`:
```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
```

**See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for detailed Docker instructions.**

---

### Option 2: Native Installation

### 1. Install Ollama

#### Windows
1. Download from: https://ollama.ai/download
2. Run the installer
3. Ollama will start automatically as a service

#### macOS
```bash
brew install ollama
```

#### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### 2. Start Ollama Service

Ollama should start automatically after installation. If not:

**Windows**: 
- Check if Ollama service is running in Services
- Or run: `ollama serve`

**macOS/Linux**:
```bash
ollama serve
```

This starts the Ollama server on `http://localhost:11434`

### 3. Download AI Model

Download a model (choose one based on your system):

```bash
# Recommended for most systems (7B parameters)
ollama pull llama3

# Or lighter option (7B parameters, faster)
ollama pull mistral

# Or smaller for low-resource systems (3B parameters)
ollama pull llama3:8b
```

**Note**: 
- `llama3` requires ~4GB RAM
- `mistral` requires ~4GB RAM
- `llama3:8b` requires ~5GB RAM
- Larger models = better quality but slower

### 4. Test Installation

```bash
ollama run llama3 "Hello, how are you?"
```

If you get a response, Ollama is working correctly!

### 5. Configure Environment Variables

Create or update `.env` file:

```env
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
```

**Available Models:**
- `llama3` (recommended)
- `mistral` (faster, good quality)
- `llama2` (older but stable)
- `llama3:8b` (smaller version)

### 6. Install Node.js Dependencies

```bash
npm install
```

This installs:
- `ollama` - Ollama client library
- `pdf-parse` - PDF text extraction
- `mammoth` - DOCX text extraction

## Usage

### Automatic Summary Generation

When you upload a CV:
1. Text is extracted from PDF/DOCX
2. Text is sent to Ollama AI
3. AI generates a professional summary
4. Summary is saved in database

### Manual Testing

Test the AI service directly:

```javascript
const { generateSummaryWithOllama } = require('./src/services/aiService');

const testText = `
John Doe
Software Engineer
5 years experience in Node.js, React, MongoDB
Education: BS Computer Science, MIT
Skills: JavaScript, Python, AWS
`;

generateSummaryWithOllama(testText)
  .then(summary => console.log('Summary:', summary))
  .catch(err => console.error('Error:', err));
```

## Troubleshooting

### Error: ECONNREFUSED
**Solution**: Ollama service is not running
```bash
ollama serve
```

### Error: Model not found
**Solution**: Download the model
```bash
ollama pull llama3
```

### Error: Out of memory
**Solution**: Use a smaller model
```bash
ollama pull llama3:8b
# Then set OLLAMA_MODEL=llama3:8b in .env
```

### Slow Generation
**Solutions**:
1. Use a smaller/faster model (mistral)
2. Upgrade system RAM
3. Use GPU acceleration (if available)

### Text Extraction Failed
**Solutions**:
- Ensure PDFs are not password-protected
- Convert .doc files to .docx or PDF
- Check file is not corrupted

## Production Deployment

For production, consider:
1. **Dedicated Ollama Server**: Run Ollama on a separate server
2. **GPU Acceleration**: Use GPU for faster processing
3. **Model Caching**: Keep models loaded in memory
4. **Queue System**: Process summaries in background (Bull/Redis)
5. **Fallback**: Use external API (OpenAI/Grok) if Ollama fails

## Background Processing (Future Enhancement)

For large files or multiple uploads, consider implementing a job queue:

```javascript
// Using Bull Queue
const Queue = require('bull');
const summaryQueue = new Queue('cv-summary', {
  redis: { host: 'localhost', port: 6379 }
});

// Add job after file upload
await summaryQueue.add({ cvId: cvRecord._id, filePath: file.path });
```

## API Endpoints

### Upload CV (Auto-generates summary)
```
POST /api/cvBank/upload
```

### Regenerate Summary (Future)
```
POST /api/cvBank/:id/regenerate-summary
```

## Model Comparison

| Model | Size | Speed | Quality | RAM |
|-------|------|-------|---------|-----|
| llama3 | 7B | Medium | Excellent | ~4GB |
| mistral | 7B | Fast | Very Good | ~4GB |
| llama3:8b | 8B | Medium | Excellent | ~5GB |
| llama2 | 7B | Medium | Good | ~4GB |

## Notes

- First summary generation takes longer (model loading)
- Subsequent generations are faster (cached model)
- Summary generation adds ~5-15 seconds per CV
- Text extraction adds ~1-3 seconds per CV

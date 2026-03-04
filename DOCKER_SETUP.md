# Docker Setup for Ollama - CV Summary Backend

## Overview
This guide helps you set up Ollama using Docker Compose for automatic CV summary generation.

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose (usually included with Docker Desktop)

## Quick Start

### 1. Start Ollama Service

```bash
docker-compose up -d ollama
```

This will:
- Pull the Ollama Docker image
- Start Ollama service on port 11434
- Create a persistent volume for models

### 2. Download AI Model

Once Ollama container is running:

```bash
# Option 1: Using Docker exec
docker exec -it cv-summary-ollama ollama pull llama3

# Option 2: Using curl (if Ollama API is accessible)
curl http://localhost:11434/api/pull -d '{"name": "llama3"}'
```

### 3. Test Ollama

```bash
# Test using Docker exec
docker exec -it cv-summary-ollama ollama run llama3 "Hello, how are you?"

# Or test via API
curl http://localhost:11434/api/generate -d '{
  "model": "llama3",
  "prompt": "Why is the sky blue?"
}'
```

### 4. Configure Environment

Update your `.env` file:

```env
# Ollama Configuration (Docker)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
```

### 5. Start Your Node.js Backend

```bash
npm install
npm run dev
```

## Docker Commands

### Start Services
```bash
# Start in detached mode (background)
docker-compose up -d ollama

# Start with logs visible
docker-compose up ollama
```

### Stop Services
```bash
# Stop Ollama
docker-compose stop ollama

# Stop and remove containers
docker-compose down ollama
```

### View Logs
```bash
# View logs
docker-compose logs -f ollama

# View last 100 lines
docker-compose logs --tail=100 ollama
```

### Check Status
```bash
# Check if container is running
docker ps | grep ollama

# Check Ollama health
curl http://localhost:11434/api/tags
```

### Access Ollama Container
```bash
# Execute commands in container
docker exec -it cv-summary-ollama bash

# Run Ollama commands
docker exec -it cv-summary-ollama ollama list
docker exec -it cv-summary-ollama ollama pull llama3
docker exec -it cv-summary-ollama ollama run llama3 "test"
```

## Managing Models

### List Available Models
```bash
docker exec -it cv-summary-ollama ollama list
```

### Download Models
```bash
# Download Llama 3 (recommended)
docker exec -it cv-summary-ollama ollama pull llama3

# Download Mistral (faster, good quality)
docker exec -it cv-summary-ollama ollama pull mistral

# Download Llama 3 8B (smaller, faster)
docker exec -it cv-summary-ollama ollama pull llama3:8b

# Download Llama 2
docker exec -it cv-summary-ollama ollama pull llama2
```

### Remove Models
```bash
docker exec -it cv-summary-ollama ollama rm llama3
```

## GPU Support (Optional)

### NVIDIA GPU Support

If you have an NVIDIA GPU and want to use it for faster processing:

1. Install NVIDIA Docker runtime:
   - **Windows/Mac**: Use WSL2 with NVIDIA support or Docker Desktop with GPU support
   - **Linux**: Install `nvidia-container-toolkit`

2. Create `docker-compose.override.yml`:
```yaml
version: '3.8'

services:
  ollama:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

3. Restart the service:
```bash
docker-compose down ollama
docker-compose up -d ollama
```

### Verify GPU Usage
```bash
docker exec -it cv-summary-ollama nvidia-smi
```

## Persistence

Models and data are stored in a Docker volume named `ollama-data`. This means:
- Models persist even if you stop/remove the container
- Data is saved across container restarts
- You don't lose downloaded models

### View Volume
```bash
docker volume inspect cv-summary-backend_ollama-data
```

### Backup Models
```bash
# Backup volume
docker run --rm -v cv-summary-backend_ollama-data:/data -v $(pwd):/backup alpine tar czf /backup/ollama-backup.tar.gz -C /data .
```

### Restore Models
```bash
# Restore volume
docker run --rm -v cv-summary-backend_ollama-data:/data -v $(pwd):/backup alpine tar xzf /backup/ollama-backup.tar.gz -C /data
```

## Troubleshooting

### Port Already in Use
If port 11434 is already in use:
```yaml
# Change port in docker-compose.yml
ports:
  - "11435:11434"  # Use 11435 on host
```
Then update `.env`:
```env
OLLAMA_HOST=http://localhost:11435
```

### Container Won't Start
```bash
# Check logs
docker-compose logs ollama

# Check Docker status
docker ps -a | grep ollama

# Remove and recreate
docker-compose down ollama
docker-compose up -d ollama
```

### Model Not Found Error
```bash
# Check installed models
docker exec -it cv-summary-ollama ollama list

# Download model
docker exec -it cv-summary-ollama ollama pull llama3

# Restart container if needed
docker-compose restart ollama
```

### Out of Memory
If you get out of memory errors:

1. Use a smaller model:
```bash
docker exec -it cv-summary-ollama ollama pull llama3:8b
```

2. Update `.env`:
```env
OLLAMA_MODEL=llama3:8b
```

3. Limit Docker memory:
```yaml
# Add to docker-compose.yml
services:
  ollama:
    mem_limit: 4g  # Adjust based on your system
```

### Connection Refused
If backend can't connect to Ollama:

1. Check if Ollama is running:
```bash
docker ps | grep ollama
```

2. Check Ollama health:
```bash
curl http://localhost:11434/api/tags
```

3. Verify environment variable:
```env
OLLAMA_HOST=http://localhost:11434
```

## Production Deployment

For production, consider:

1. **Use a specific Ollama version** (instead of `latest`):
```yaml
image: ollama/ollama:0.1.21
```

2. **Add resource limits**:
```yaml
services:
  ollama:
    mem_limit: 8g
    cpus: 4
```

3. **Use restart policy**:
```yaml
restart: always
```

4. **Set up health checks** (already included)

5. **Use environment variables for configuration**

## Integration with Backend

Your backend is already configured to use Ollama. Just ensure:

1. Ollama container is running
2. Model is downloaded
3. `.env` has correct configuration:
```env
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
```

That's it! Your backend will automatically generate CV summaries using the Dockerized Ollama service.

## Example Workflow

```bash
# 1. Start Ollama
docker-compose up -d ollama

# 2. Wait for it to start (check logs)
docker-compose logs -f ollama

# 3. Download model
docker exec -it cv-summary-ollama ollama pull llama3

# 4. Test
docker exec -it cv-summary-ollama ollama run llama3 "Hello"

# 5. Start your backend
npm run dev

# 6. Upload a CV - summary will be generated automatically!
```

## Clean Up

```bash
# Stop and remove container (keeps volume/data)
docker-compose down ollama

# Stop and remove container + volume (deletes models)
docker-compose down -v ollama

# Remove everything including network
docker-compose down --remove-orphans
```


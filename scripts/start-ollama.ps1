# PowerShell script to start Ollama using Docker Compose

Write-Host "🚀 Starting Ollama service with Docker..." -ForegroundColor Cyan

# Start Ollama container
docker-compose up -d ollama

# Wait for Ollama to be ready
Write-Host "⏳ Waiting for Ollama to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if Ollama is running
$containerRunning = docker ps | Select-String "cv-summary-ollama"
if ($containerRunning) {
    Write-Host "✅ Ollama container is running!" -ForegroundColor Green
    
    # Check if llama3 model exists
    Write-Host "📦 Checking for llama3 model..." -ForegroundColor Cyan
    $modelExists = docker exec cv-summary-ollama ollama list | Select-String "llama3"
    
    if ($modelExists) {
        Write-Host "✅ llama3 model found!" -ForegroundColor Green
    } else {
        Write-Host "📥 Downloading llama3 model (this may take a few minutes)..." -ForegroundColor Yellow
        docker exec -it cv-summary-ollama ollama pull llama3
        Write-Host "✅ llama3 model downloaded!" -ForegroundColor Green
    }
    
    # Test Ollama
    Write-Host "🧪 Testing Ollama..." -ForegroundColor Cyan
    docker exec cv-summary-ollama ollama run llama3 "Hello" | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Ollama is working correctly!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📝 Configuration:" -ForegroundColor Cyan
        Write-Host "   OLLAMA_HOST=http://localhost:11434"
        Write-Host "   OLLAMA_MODEL=llama3"
        Write-Host ""
        Write-Host "🎉 Setup complete! You can now start your backend server." -ForegroundColor Green
    } else {
        Write-Host "⚠️  Ollama test failed. Check logs with: docker-compose logs ollama" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ Failed to start Ollama container" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs ollama" -ForegroundColor Yellow
    exit 1
}


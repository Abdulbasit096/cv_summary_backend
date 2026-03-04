#!/bin/bash

# Script to start Ollama using Docker Compose

echo "🚀 Starting Ollama service with Docker..."

# Start Ollama container
docker-compose up -d ollama

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to start..."
sleep 5

# Check if Ollama is running
if docker ps | grep -q cv-summary-ollama; then
    echo "✅ Ollama container is running!"
    
    # Check if llama3 model exists
    echo "📦 Checking for llama3 model..."
    if docker exec cv-summary-ollama ollama list | grep -q llama3; then
        echo "✅ llama3 model found!"
    else
        echo "📥 Downloading llama3 model (this may take a few minutes)..."
        docker exec -it cv-summary-ollama ollama pull llama3
        echo "✅ llama3 model downloaded!"
    fi
    
    # Test Ollama
    echo "🧪 Testing Ollama..."
    docker exec cv-summary-ollama ollama run llama3 "Hello" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Ollama is working correctly!"
        echo ""
        echo "📝 Configuration:"
        echo "   OLLAMA_HOST=http://localhost:11434"
        echo "   OLLAMA_MODEL=llama3"
        echo ""
        echo "🎉 Setup complete! You can now start your backend server."
    else
        echo "⚠️  Ollama test failed. Check logs with: docker-compose logs ollama"
    fi
else
    echo "❌ Failed to start Ollama container"
    echo "Check logs with: docker-compose logs ollama"
    exit 1
fi


# GLM-4.7 Cloud Setup Guide

This guide will help you set up Ollama with the GLM-4.7 Cloud model for use with Resumeness AI.

## 1. Install Ollama

### Windows
1. Download Ollama from https://ollama.ai
2. Run the installer
3. Ollama will start automatically as a service

### macOS
```bash
# Using Homebrew
brew install ollama

# Or download from https://ollama.ai
```

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

## 2. Pull the GLM-4.7 Cloud Model

After installation, pull the required model:

```bash
# Pull the GLM-4.7 Cloud model
ollama pull glm-4.7:cloud
```

## 3. Verify Installation

Test that Ollama is working with GLM-4.7:

```bash
ollama list  # Should show glm-4.7:cloud in the list
ollama run glm-4.7:cloud "Hello, how are you?"  # Test the model
```

## 4. Configure Resumeness AI

1. Copy the environment template:
```bash
cp .env.template .env
```

2. Edit `.env` with your Ollama settings:
```env
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=glm-4.7:cloud
```

3. Test the connection:
```bash
npm run test:agent
```

## 5. About GLM-4.7 Cloud

GLM-4.7 Cloud is a powerful language model developed by Zhipu AI:
- **Size**: 4.7B parameters
- **Strengths**: Excellent for Chinese and English text processing
- **Use Case**: Optimized for cloud deployment and general-purpose tasks
- **Performance**: Good balance of speed and quality

## 6. Troubleshooting

### Model not found
```bash
# Check if the model is available
ollama list

# Pull the model if missing
ollama pull glm-4.7:cloud
```

### Ollama not responding
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Restart Ollama (Windows)
# Stop and start the Ollama service from Services

# Restart Ollama (macOS/Linux)
pkill ollama
ollama serve
```

### Connection errors
- Verify Ollama is running on port 11434
- Check firewall settings
- Ensure `VITE_OLLAMA_BASE_URL` is correct in `.env`
- Confirm the model name is exactly `glm-4.7:cloud`

## 7. Advanced Configuration

### Custom Ollama Host
If running Ollama on a different machine:

```env
VITE_OLLAMA_BASE_URL=http://your-ollama-server:11434
```

### Model Parameters
You can customize GLM-4.7 behavior by modifying the Ollama client in `src/lib/langchain-openrouter.ts`:

```typescript
return new ChatOllama({
  baseUrl: baseUrl,
  model: 'glm-4.7:cloud',
  temperature: 0.7,        // Creativity (0.0-1.0)
  numCtx: 4096,           // Context window size
  topK: 40,               // Top-K sampling
  topP: 0.9,              // Top-P sampling
});
```

## 8. Performance Tips

- GLM-4.7 Cloud is optimized for efficiency
- Ensure you have at least 8GB RAM for smooth operation
- The model works well for both English and Chinese resume content
- Consider adjusting temperature based on your needs:
  - Lower (0.3-0.5) for more consistent, professional output
  - Higher (0.7-0.9) for more creative variations
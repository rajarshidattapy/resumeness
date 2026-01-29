# Resumeness AI - AI-Powered Resume Builder

An intelligent resume builder that uses LangChain and Ollama (local LLM) to tailor resumes automatically using agentic capabilities to maximum ATS compatibility.

## Features
- Paste a JD, set proper knowledge base about your achievements, qualifications, projects etc. and see the AI doing the magic!
- Uses local Ollama models for privacy and cost-effectiveness

## Prerequisites
- **Ollama**: Download and install from https://ollama.ai
- **Node.js**: Version 18 or higher
- **Python**: Version 3.8+ (for MCP backend, optional)

## To-do:
- add a LLM that can do tool call (some Ollama models support this)
- add vercel vector db for easy deployment

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **AI**: LangChain, Ollama (local LLM)
- **Editor**: CodeMirror for LaTeX editing
- **PDF Generation**: LaTeX compilation via ytotech API

## AI Architecture

The application uses LangChain's agent framework for intelligent resume processing with advanced LaTeX handling:

### Agent Tools
- **AnalyzeJobDescriptionTool**: Extracts requirements, keywords, and focus areas from job postings
- **SearchKnowledgeBaseTool**: Finds relevant experience from the user's knowledge base
- **RewriteResumeTool**: Modifies LaTeX resume content using AI with section-aware processing
- **CalculateATSTool**: Evaluates ATS compatibility scores with improved keyword extraction

### LaTeX Processing
- **Section-Aware Parsing**: Intelligently parses complex LaTeX documents into sections
- **Template Preservation**: Maintains LaTeX structure, custom commands, and formatting
- **Content-Only Modification**: Only modifies actual content while preserving LaTeX syntax
- **Validation**: Ensures generated LaTeX remains syntactically valid


## Setup

1. **Install Ollama**:
```bash
# Download from https://ollama.ai and install
# Then pull the GLM-4.7 Cloud model:
ollama pull glm-4.7:cloud
```

2. **Clone and install**:
```bash
git clone github.com/rajarshidattapy/resumeness
cd resumeness
npm install
```

3. **Environment setup**:
```bash
cp .env.template .env
# Edit .env and configure Ollama settings:
# VITE_OLLAMA_BASE_URL=http://localhost:11434
# VITE_OLLAMA_MODEL=glm-4.7:cloud
```

4. **Start the application**:
```bash
npm run dev
```

3. **Start development server**:
```bash
npm run dev
```

## Environment Variables

- `VITE_OPENAI_API_KEY`: Your OpenAI API key (get from https://platform.openai.com/api-keys)

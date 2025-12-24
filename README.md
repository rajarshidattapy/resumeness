# Resumeness AI - AI-Powered Resume Builder

An intelligent resume builder that uses LangChain and OpenRouter AI models to tailor resumes automatically using agentic capabilities to maximum ATS compatibility.

## Features
- Paste a JD, set proper knowledge base about your achievements,qualifications,projects etc. and see the AI doing the magic!

## To-do:
- add a LLM that can do tool call
- add vercel vector db for easy deployment

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **AI**: LangChain, OpenRouter AI
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

1. **Clone and install**:
```bash
git clone github.com/rajarshidattapy/resumeness
cd resumeness
npm install
```

2. **Environment setup**:
```bash
cp .env.template .env
# Edit .env and add your OpenRouter API key
```

3. **Start development server**:
```bash
npm run dev
```

## Environment Variables

- `VITE_OPENROUTER_API_KEY`: Your OpenRouter API key (get from https://openrouter.ai/keys)

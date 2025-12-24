import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface ResumeVersion {
  id: string;
  latex: string;
  timestamp: Date;
  description: string;
  atsScore?: number;
}

export interface KnowledgeItem {
  id: string;
  type: 'project' | 'skill' | 'experience' | 'achievement';
  title: string;
  content: string;
  tags: string[];
  embedding?: number[];
}

interface ResumeState {
  // LaTeX content
  latexContent: string;
  setLatexContent: (content: string) => void;
  
  // Chat messages
  messages: Message[];
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void;
  updateMessage: (id: string, content: string) => void;
  clearMessages: () => void;
  
  // Job description
  jobDescription: string;
  setJobDescription: (jd: string) => void;
  
  // Version history (persisted)
  versions: ResumeVersion[];
  addVersion: (version: Omit<ResumeVersion, 'id' | 'timestamp'>) => void;
  restoreVersion: (id: string) => void;
  deleteVersion: (id: string) => void;
  
  // Knowledge base
  knowledgeBase: KnowledgeItem[];
  addKnowledgeItem: (item: Omit<KnowledgeItem, 'id'>) => void;
  updateKnowledgeItem: (id: string, item: Partial<Omit<KnowledgeItem, 'id'>>) => void;
  removeKnowledgeItem: (id: string) => void;
  
  // UI state
  isAgentThinking: boolean;
  setIsAgentThinking: (thinking: boolean) => void;
  activePanel: 'editor' | 'preview';
  setActivePanel: (panel: 'editor' | 'preview') => void;
  
  // ATS score
  atsScore: number | null;
  setAtsScore: (score: number | null) => void;
  matchedKeywords: string[];
  setMatchedKeywords: (keywords: string[]) => void;
}

const DEFAULT_LATEX = `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{fontawesome5}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{Your Name}}\\\\[4pt]
\\faEnvelope\\ email@example.com \\quad
\\faPhone\\ (555) 123-4567 \\quad
\\faLinkedin\\ linkedin.com/in/yourname \\quad
\\faGithub\\ github.com/yourname
\\end{center}

\\section*{Professional Summary}
Experienced software engineer with 5+ years of expertise in building scalable web applications. Passionate about clean code, user experience, and innovative solutions.

\\section*{Experience}
\\textbf{Senior Software Engineer} \\hfill \\textit{Jan 2022 -- Present}\\\\
\\textit{Tech Company Inc.} \\hfill San Francisco, CA
\\begin{itemize}[leftmargin=*,nosep]
    \\item Led development of microservices architecture serving 1M+ daily users
    \\item Reduced API response time by 40\\% through optimization
    \\item Mentored team of 5 junior developers
\\end{itemize}

\\textbf{Software Engineer} \\hfill \\textit{Jun 2019 -- Dec 2021}\\\\
\\textit{Startup Labs} \\hfill New York, NY
\\begin{itemize}[leftmargin=*,nosep]
    \\item Built React-based dashboard used by 500+ enterprise clients
    \\item Implemented CI/CD pipeline reducing deployment time by 60\\%
    \\item Collaborated with product team on feature prioritization
\\end{itemize}

\\section*{Education}
\\textbf{B.S. Computer Science} \\hfill \\textit{2015 -- 2019}\\\\
\\textit{University of Technology}

\\section*{Skills}
\\textbf{Languages:} JavaScript, TypeScript, Python, Go, SQL\\\\
\\textbf{Technologies:} React, Node.js, AWS, Docker, Kubernetes, PostgreSQL\\\\
\\textbf{Tools:} Git, JIRA, Figma, VS Code

\\end{document}`;

const DEFAULT_KNOWLEDGE: KnowledgeItem[] = [
  {
    id: '1',
    type: 'project',
    title: 'E-commerce Platform',
    content: 'Built a full-stack e-commerce platform using Next.js, Node.js, and PostgreSQL. Implemented real-time inventory management, payment processing with Stripe, and achieved 99.9% uptime.',
    tags: ['Next.js', 'Node.js', 'PostgreSQL', 'Stripe', 'e-commerce'],
  },
  {
    id: '2',
    type: 'achievement',
    title: 'Performance Optimization',
    content: 'Reduced page load time by 65% through code splitting, lazy loading, and CDN optimization. Improved Core Web Vitals scores from 45 to 92.',
    tags: ['performance', 'optimization', 'Core Web Vitals'],
  },
  {
    id: '3',
    type: 'skill',
    title: 'Cloud Architecture',
    content: 'Designed and implemented AWS infrastructure using Terraform. Managed Kubernetes clusters with auto-scaling, serving 10M+ requests daily.',
    tags: ['AWS', 'Terraform', 'Kubernetes', 'DevOps'],
  },
];

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      latexContent: DEFAULT_LATEX,
      setLatexContent: (content) => set({ latexContent: content }),
      
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: "I'm your resume engineering agent. Paste a job description and I'll analyze it against your resume, pull relevant experience from your knowledge base, and rewrite your LaTeX to maximize ATS compatibility.\n\nI can:\n• Parse job requirements and match them to your experience\n• Rewrite bullet points using the job's language\n• Suggest additions from your knowledge base\n• Track keyword matching score\n\nReady when you are.",
          timestamp: new Date(),
        }
      ],
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, {
          ...message,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        }]
      })),
      updateMessage: (id, content) => set((state) => ({
        messages: state.messages.map(m => 
          m.id === id ? { ...m, content, isStreaming: false } : m
        )
      })),
      clearMessages: () => set({ messages: [] }),
      
      jobDescription: '',
      setJobDescription: (jd) => set({ jobDescription: jd }),
      
      versions: [],
      addVersion: (version) => set((state) => ({
        versions: [{
          ...version,
          id: crypto.randomUUID(),
          timestamp: new Date(),
        }, ...state.versions]
      })),
      restoreVersion: (id) => {
        const version = get().versions.find(v => v.id === id);
        if (version) {
          set({ latexContent: version.latex });
        }
      },
      deleteVersion: (id) => set((state) => ({
        versions: state.versions.filter(v => v.id !== id)
      })),
      
      knowledgeBase: DEFAULT_KNOWLEDGE,
      addKnowledgeItem: (item) => set((state) => ({
        knowledgeBase: [...state.knowledgeBase, { ...item, id: crypto.randomUUID() }]
      })),
      updateKnowledgeItem: (id, updates) => set((state) => ({
        knowledgeBase: state.knowledgeBase.map(item =>
          item.id === id ? { ...item, ...updates } : item
        )
      })),
      removeKnowledgeItem: (id) => set((state) => ({
        knowledgeBase: state.knowledgeBase.filter(item => item.id !== id)
      })),
      
      isAgentThinking: false,
      setIsAgentThinking: (thinking) => set({ isAgentThinking: thinking }),
      activePanel: 'editor',
      setActivePanel: (panel) => set({ activePanel: panel }),
      
      atsScore: null,
      setAtsScore: (score) => set({ atsScore: score }),
      matchedKeywords: [],
      setMatchedKeywords: (keywords) => set({ matchedKeywords: keywords }),
    }),
    {
      name: 'resumeness-storage',
      partialize: (state) => ({
        versions: state.versions,
        knowledgeBase: state.knowledgeBase,
        latexContent: state.latexContent,
      }),
    }
  )
);
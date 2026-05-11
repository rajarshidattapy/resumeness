import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getAllKnowledgeItems,
  createKnowledgeItem as createKBItem,
  updateKnowledgeItem as updateKBItem,
  deleteKnowledgeItem as deleteKBItem,
  seedKnowledgeBase,
} from '@/lib/db/knowledgeBaseDb';

// Fallback for crypto.randomUUID() in non-secure contexts (e.g., HTTP on LAN)
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

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
  forceSetLatexContent: (content: string) => void;
  setLatexContentWithTypewriter: (content: string, speed?: number) => Promise<void>;
  isTypewriting: boolean;
  
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
  knowledgeBaseLoading: boolean;
  knowledgeBaseError: string | null;
  loadKnowledgeBase: () => Promise<void>;
  addKnowledgeItem: (item: Omit<KnowledgeItem, 'id'>) => Promise<void>;
  updateKnowledgeItem: (id: string, item: Partial<Omit<KnowledgeItem, 'id'>>) => Promise<void>;
  removeKnowledgeItem: (id: string) => Promise<void>;
  
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
  // Projects
  {
    id: '1',
    type: 'project',
    title: 'E-commerce Platform',
    content: 'Built a full-stack e-commerce platform using Next.js, Node.js, and PostgreSQL. Implemented real-time inventory management, payment processing with Stripe, and achieved 99.9% uptime. Handled 50,000+ daily transactions with zero data loss.',
    tags: ['Next.js', 'Node.js', 'PostgreSQL', 'Stripe', 'e-commerce', 'React', 'TypeScript', 'REST API'],
  },
  {
    id: '2',
    type: 'project',
    title: 'Machine Learning Pipeline',
    content: 'Developed an end-to-end ML pipeline for customer churn prediction using Python, TensorFlow, and Apache Spark. Achieved 94% accuracy and reduced customer churn by 23% through proactive interventions.',
    tags: ['Python', 'TensorFlow', 'Machine Learning', 'Apache Spark', 'Data Science', 'AI', 'Deep Learning'],
  },
  {
    id: '3',
    type: 'project',
    title: 'Real-time Analytics Dashboard',
    content: 'Created a real-time analytics dashboard using React, D3.js, and WebSocket connections. Visualized 1M+ data points with sub-second latency, enabling data-driven decision making for 200+ stakeholders.',
    tags: ['React', 'D3.js', 'WebSocket', 'Data Visualization', 'JavaScript', 'Analytics', 'Dashboard'],
  },
  {
    id: '4',
    type: 'project',
    title: 'Microservices Architecture Migration',
    content: 'Led migration of monolithic application to microservices architecture using Docker and Kubernetes. Improved deployment frequency by 400% and reduced system downtime by 80%.',
    tags: ['Docker', 'Kubernetes', 'Microservices', 'DevOps', 'CI/CD', 'Jenkins', 'Architecture'],
  },
  {
    id: '5',
    type: 'project',
    title: 'Mobile Banking Application',
    content: 'Developed a cross-platform mobile banking app using React Native and Node.js backend. Implemented biometric authentication, real-time notifications, and PCI-DSS compliant payment processing for 100K+ users.',
    tags: ['React Native', 'Mobile Development', 'Node.js', 'Security', 'iOS', 'Android', 'FinTech'],
  },
  // Achievements
  {
    id: '6',
    type: 'achievement',
    title: 'Performance Optimization',
    content: 'Reduced page load time by 65% through code splitting, lazy loading, and CDN optimization. Improved Core Web Vitals scores from 45 to 92, resulting in 30% increase in user engagement.',
    tags: ['performance', 'optimization', 'Core Web Vitals', 'SEO', 'Web Performance'],
  },
  {
    id: '7',
    type: 'achievement',
    title: 'Cost Reduction Initiative',
    content: 'Optimized cloud infrastructure costs by implementing auto-scaling and reserved instances, resulting in 40% reduction in monthly AWS spending ($50K annual savings).',
    tags: ['AWS', 'cost optimization', 'cloud', 'infrastructure', 'budget management'],
  },
  {
    id: '8',
    type: 'achievement',
    title: 'Team Leadership',
    content: 'Led a team of 8 engineers across 3 time zones, delivering 12 major features on schedule. Implemented agile methodologies that improved sprint velocity by 35%.',
    tags: ['leadership', 'team management', 'agile', 'scrum', 'project management', 'mentoring'],
  },
  {
    id: '9',
    type: 'achievement',
    title: 'Security Enhancement',
    content: 'Implemented comprehensive security measures including OAuth 2.0, JWT authentication, and automated vulnerability scanning. Achieved SOC 2 Type II compliance with zero critical findings.',
    tags: ['security', 'OAuth', 'JWT', 'compliance', 'SOC 2', 'cybersecurity'],
  },
  // Skills
  {
    id: '10',
    type: 'skill',
    title: 'Cloud Architecture',
    content: 'Designed and implemented AWS infrastructure using Terraform. Managed Kubernetes clusters with auto-scaling, serving 10M+ requests daily with 99.99% availability.',
    tags: ['AWS', 'Terraform', 'Kubernetes', 'DevOps', 'Cloud Architecture', 'Infrastructure as Code'],
  },
  {
    id: '11',
    type: 'skill',
    title: 'Full-Stack Development',
    content: 'Expert in React, TypeScript, Node.js, and Python. Built RESTful and GraphQL APIs. Proficient in SQL and NoSQL databases including PostgreSQL, MongoDB, and Redis.',
    tags: ['React', 'TypeScript', 'Node.js', 'Python', 'GraphQL', 'REST API', 'PostgreSQL', 'MongoDB', 'Redis'],
  },
  {
    id: '12',
    type: 'skill',
    title: 'Data Engineering',
    content: 'Built data pipelines using Apache Kafka, Airflow, and Spark. Designed data warehouses in Snowflake and BigQuery. Experience with ETL processes handling 500GB+ daily data volumes.',
    tags: ['Apache Kafka', 'Airflow', 'Spark', 'Snowflake', 'BigQuery', 'ETL', 'Data Engineering', 'Data Pipeline'],
  },
  {
    id: '13',
    type: 'skill',
    title: 'DevOps & CI/CD',
    content: 'Implemented CI/CD pipelines using GitHub Actions, Jenkins, and GitLab CI. Experience with Docker, Kubernetes, and infrastructure automation. Reduced deployment time from hours to minutes.',
    tags: ['CI/CD', 'GitHub Actions', 'Jenkins', 'GitLab', 'Docker', 'Kubernetes', 'Automation', 'DevOps'],
  },
  // Experience
  {
    id: '14',
    type: 'experience',
    title: 'Senior Software Engineer - Tech Corp',
    content: 'Led development of customer-facing features serving 5M+ users. Mentored junior developers and conducted code reviews. Collaborated with product managers to define technical requirements and roadmap.',
    tags: ['senior engineer', 'mentoring', 'code review', 'product development', 'technical leadership'],
  },
  {
    id: '15',
    type: 'experience',
    title: 'Software Engineer - Startup Inc',
    content: 'Full-stack development in fast-paced startup environment. Shipped features from concept to production in 2-week sprints. Participated in on-call rotation and incident response.',
    tags: ['startup', 'full-stack', 'agile', 'on-call', 'incident response', 'rapid development'],
  },
  {
    id: '16',
    type: 'experience',
    title: 'Backend Developer - Enterprise Solutions',
    content: 'Developed high-performance backend services using Java and Spring Boot. Integrated with legacy systems and third-party APIs. Maintained systems with 99.95% SLA.',
    tags: ['Java', 'Spring Boot', 'backend', 'enterprise', 'API integration', 'legacy systems', 'SLA'],
  },
];

// Module-level EditorView ref — lives outside Zustand to avoid triggering re-renders
let _editorViewRef: import('@codemirror/view').EditorView | null = null;
export const setEditorViewRef = (view: import('@codemirror/view').EditorView | null) => {
  _editorViewRef = view;
};
export const getEditorViewRef = () => _editorViewRef;

export const useResumeStore = create<ResumeState>()(
  persist(
    (set, get) => ({
      latexContent: DEFAULT_LATEX,
      setLatexContent: (content) => {
        set({ latexContent: content });
      },
      forceSetLatexContent: (content) => {
        set({ latexContent: content });
        // Also dispatch directly to the CodeMirror EditorView to bypass its typing latch
        const view = _editorViewRef;
        if (view && view.state.doc.toString() !== content) {
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: content,
            },
          });
        }
      },
      isTypewriting: false,
      setLatexContentWithTypewriter: async (content: string, speed: number = 5) => {
        // If content is the same, skip
        if (content === get().latexContent) {
          return;
        }
        
        set({ isTypewriting: true });
        
        const oldContent = get().latexContent;
        const newContent = content;
        
        // Find the point where content differs
        let commonPrefixLength = 0;
        const minLength = Math.min(oldContent.length, newContent.length);
        while (commonPrefixLength < minLength && oldContent[commonPrefixLength] === newContent[commonPrefixLength]) {
          commonPrefixLength++;
        }
        
        // If mostly different, do chunked typewriter from the start
        if (commonPrefixLength < newContent.length * 0.3) {
          // Type out in chunks for better performance
          const chunkSize = Math.max(10, Math.floor(newContent.length / 100));
          for (let i = 0; i <= newContent.length; i += chunkSize) {
            set({ latexContent: newContent.slice(0, Math.min(i + chunkSize, newContent.length)) });
            await new Promise(resolve => setTimeout(resolve, speed));
          }
        } else {
          // Type out only the new part
          const unchangedPart = newContent.slice(0, commonPrefixLength);
          const newPart = newContent.slice(commonPrefixLength);
          const chunkSize = Math.max(5, Math.floor(newPart.length / 50));
          
          for (let i = 0; i <= newPart.length; i += chunkSize) {
            set({ latexContent: unchangedPart + newPart.slice(0, Math.min(i + chunkSize, newPart.length)) });
            await new Promise(resolve => setTimeout(resolve, speed));
          }
        }
        
        // Ensure final content is set
        set({ latexContent: newContent, isTypewriting: false });
      },
      
      messages: [
        {
          id: '1',
          role: 'assistant',
          content: "Welcome to **Resumeness AI**! 👋\n\nPaste a job description below to get started. Use the quick actions above to load a sample JD, view your knowledge base, or check version history.",
          timestamp: new Date(),
        }
      ],
      addMessage: (message) => set((state) => ({
        messages: [...state.messages, {
          ...message,
          id: generateUUID(),
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
          id: generateUUID(),
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
      
      knowledgeBase: DEFAULT_KNOWLEDGE, // Initialize with default knowledge
      knowledgeBaseLoading: false,
      knowledgeBaseError: null,
      loadKnowledgeBase: async () => {
        set({ knowledgeBaseLoading: true, knowledgeBaseError: null });
        try {
          // Seed default items if the localStorage KB is empty (first run)
          await seedKnowledgeBase(DEFAULT_KNOWLEDGE);
          const items = await getAllKnowledgeItems();
          set({ knowledgeBase: items, knowledgeBaseLoading: false });
        } catch (error) {
          console.error('Error loading knowledge base:', error);
          set({
            knowledgeBaseError: error instanceof Error ? error.message : 'Failed to load knowledge base',
            knowledgeBaseLoading: false,
            knowledgeBase: DEFAULT_KNOWLEDGE,
          });
        }
      },
      addKnowledgeItem: async (item) => {
        set({ knowledgeBaseError: null });
        try {
          const newItem = await createKBItem(item);
          set((state) => ({
            knowledgeBase: [...state.knowledgeBase, newItem]
          }));
        } catch (error) {
          console.error('Error adding knowledge item:', error);
          set({
            knowledgeBaseError: error instanceof Error ? error.message : 'Failed to add item',
          });
        }
      },
      updateKnowledgeItem: async (id, updates) => {
        set({ knowledgeBaseError: null });
        try {
          const updatedItem = await updateKBItem(id, updates);
          set((state) => ({
            knowledgeBase: state.knowledgeBase.map(item =>
              item.id === id ? updatedItem : item
            )
          }));
        } catch (error) {
          console.error('Error updating knowledge item:', error);
          set({
            knowledgeBaseError: error instanceof Error ? error.message : 'Failed to update item',
          });
        }
      },
      removeKnowledgeItem: async (id) => {
        set({ knowledgeBaseError: null });
        try {
          await deleteKBItem(id);
          set((state) => ({
            knowledgeBase: state.knowledgeBase.filter(item => item.id !== id)
          }));
        } catch (error) {
          console.error('Error deleting knowledge item:', error);
          set({
            knowledgeBaseError: error instanceof Error ? error.message : 'Failed to delete item',
          });
        }
      },
      
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
        // Don't persist knowledge base - it's now in the database
        latexContent: state.latexContent,
      }),
    }
  )
);
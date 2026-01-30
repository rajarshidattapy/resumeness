import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, FileText, Database, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore, Message } from '@/stores/useResumeStore';
import { 
  optimizeResumeWithAgent,
  calculateATSScore,
} from '@/lib/agentIntegration';
import { AgentStep } from '@/lib/agent/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const OLLAMA_BASE_URL = import.meta.env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434';

// Check if Ollama is available
const checkOllamaAvailability = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch {
    return false;
  }
};

const TypingIndicator = ({ currentStep, progress }: { 
  currentStep?: AgentStep; 
  progress?: number; 
}) => (
  <div className="flex items-center gap-1.5 px-4 py-3">
    <div className="typing-indicator flex gap-1">
      <span className="w-2 h-2 rounded-full bg-primary" />
      <span className="w-2 h-2 rounded-full bg-primary" />
      <span className="w-2 h-2 rounded-full bg-primary" />
    </div>
    <div className="flex flex-col ml-2">
      <span className="text-sm text-muted-foreground">
        {currentStep ? getStepMessage(currentStep) : 'Agent is analyzing...'}
      </span>
      {progress !== undefined && (
        <div className="w-32 h-1 bg-secondary rounded-full mt-1">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  </div>
);

const getStepMessage = (step: AgentStep): string => {
  const stepMessages: Record<AgentStep, string> = {
    'planning': 'Creating optimization strategy...',
    'analyzing': 'Analyzing job requirements...',
    'retrieving': 'Searching knowledge base...',
    'rewriting': 'Rewriting resume content...',
    'optimizing': 'Optimizing for ATS...',
    'verifying': 'Verifying quality...',
    'presenting': 'Preparing results...',
    'completed': 'Optimization complete!',
    'error': 'Processing error occurred',
  };
  return stepMessages[step] || 'Processing...';
};

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-md" 
            : "bg-chat-ai text-foreground rounded-bl-md border border-border/50"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/30">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Resume Agent</span>
          </div>
        )}
        <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:italic">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <span className="text-[10px] opacity-50 mt-2 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};

const QuickActions = ({ onAction }: { onAction: (action: string) => void }) => {
  const actions = [
    { icon: FileText, label: 'Sample JD', action: 'sample_jd' },
    { icon: Database, label: 'View KB', action: 'view_kb' },
    { icon: History, label: 'History', action: 'view_history' },
  ];

  return (
    <div className="flex gap-2 p-3 border-b border-border/50">
      {actions.map(({ icon: Icon, label, action }) => (
        <Button
          key={action}
          variant="outline"
          size="sm"
          onClick={() => onAction(action)}
          className="flex-1 text-xs"
        >
          <Icon className="w-3 h-3 mr-1" />
          {label}
        </Button>
      ))}
    </div>
  );
};

export const ChatPanel = () => {
  const [input, setInput] = useState('');
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null);
  const [currentStep, setCurrentStep] = useState<AgentStep | undefined>();
  const [progress, setProgress] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  
  const { 
    messages, 
    addMessage, 
    isAgentThinking, 
    setIsAgentThinking,
    setLatexContent,
    latexContent,
    setAtsScore,
    setMatchedKeywords,
    knowledgeBase,
    setJobDescription,
    addVersion,
  } = useResumeStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Check Ollama availability on component mount
    checkOllamaAvailability().then(setOllamaAvailable);
  }, []);

  const processWithAgent = async (userMessage: string) => {
    setIsAgentThinking(true);
    setCurrentStep(undefined);
    setProgress(0);
    
    try {
      // Check if Ollama is available
      if (ollamaAvailable === false) {
        // Fallback to simulated responses
        await simulateAgentResponse(userMessage);
        return;
      }

      // Store the job description
      setJobDescription(userMessage);
      
      // Calculate current ATS score
      const currentAtsResult = calculateATSScore(latexContent, userMessage);
      setAtsScore(currentAtsResult.score);
      setMatchedKeywords(currentAtsResult.matched);
      
      // Save current version before modifying
      addVersion({
        latex: latexContent,
        description: 'Before AI optimization',
        atsScore: currentAtsResult.score,
      });
      
      // Show initial analysis message
      addMessage({ 
        role: 'assistant', 
        content: `🚀 **Starting autonomous resume optimization...**\n\n**Current ATS Match: ${currentAtsResult.score}%**\n\nI'll now execute the complete 6-step optimization process:\n1. **Planning** - Create optimization strategy\n2. **Analysis** - Extract job requirements\n3. **Retrieval** - Search knowledge base\n4. **Rewriting** - Update resume content\n5. **Optimization** - Enhance ATS compatibility\n6. **Verification** - Quality assurance\n\nThis may take 30-60 seconds...` 
      });
      
      // Set up progress callback
      const progressCallback = (step: AgentStep, progressPercent: number, message: string) => {
        setCurrentStep(step);
        setProgress(progressPercent);
      };

      // Execute the full autonomous optimization
      const result = await optimizeResumeWithAgent(
        userMessage,
        latexContent,
        knowledgeBase,
        progressCallback
      );

      if (result.success) {
        // Update the editor with optimized content
        setLatexContent(result.optimizedLatex);
        
        // Update ATS score
        setAtsScore(result.atsScoreAfter);
        
        // Calculate new matched keywords
        const newAtsResult = calculateATSScore(result.optimizedLatex, userMessage);
        setMatchedKeywords(newAtsResult.matched);

        // Show success results
        const improvement = result.atsScoreAfter - result.atsScoreBefore;
        addMessage({ 
          role: 'assistant', 
          content: `✅ **Autonomous optimization completed successfully!**\n\n📊 **Results:**\n• **ATS Score:** ${result.atsScoreBefore}% → ${result.atsScoreAfter}% ${improvement > 0 ? `(+${improvement}% improvement)` : ''}\n• **Execution Time:** ${Math.round(result.executionTime / 1000)}s\n• **Sections Modified:** ${result.changes.length}\n\n🔑 **Matched Keywords:** ${newAtsResult.matched.slice(0, 8).join(', ')}\n\n📝 **Key Changes Applied:**\n${result.changes.slice(0, 5).map(change => `• ${change}`).join('\n')}\n\n✨ **Your resume has been automatically optimized and updated in the editor!** You can restore the previous version from Version History if needed.` 
        });
        
      } else {
        // Show failure message but preserve original
        addMessage({ 
          role: 'assistant', 
          content: `⚠️ **Optimization encountered issues**\n\n**Current ATS Match: ${currentAtsResult.score}%**\n\nThe original resume has been preserved. Issues encountered:\n${result.changes.join('\n')}\n\n**Suggestions:**\n• Ensure the job description is complete and detailed\n• Add more relevant experience to your knowledge base\n• Try with a more specific job description\n• Check that Ollama is running with the GLM-4.7 model` 
        });
      }
      
    } catch (error) {
      console.error('Agent error:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process your request. Please check Ollama connection.',
        variant: 'destructive',
      });
      
      // Fallback to simulated response
      await simulateAgentResponse(userMessage);
    } finally {
      setIsAgentThinking(false);
      setCurrentStep(undefined);
      setProgress(0);
    }
  };

  const simulateAgentResponse = async (userMessage: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate the same workflow but without actual AI
    setJobDescription(userMessage);
    const atsResult = calculateATSScore(latexContent, userMessage);
    setAtsScore(atsResult.score);
    setMatchedKeywords(atsResult.matched);
    
    const response = `🤖 **Offline Mode - Ollama Unavailable**\n\n**Current ATS Match: ${atsResult.score}%**\n\n**Analysis Results:**\n• Matched keywords: ${atsResult.matched.slice(0, 5).join(', ')}\n• Missing keywords: ${atsResult.missing.slice(0, 5).join(', ')}\n\n**To enable full autonomous optimization:**\n1. Install Ollama from https://ollama.ai\n2. Run: \`ollama pull glm-4.7:cloud\`\n3. Ensure Ollama is running on port 11434\n\n**Manual Optimization Tips:**\n• Add missing keywords naturally to your experience\n• Use action verbs from the job description\n• Quantify achievements where possible\n• Prioritize relevant skills and technologies\n\nFor now, you can manually edit the LaTeX using this analysis.`;
    
    addMessage({ role: 'assistant', content: response });
  };

  const handleSend = async () => {
    if (!input.trim() || isAgentThinking) return;
    
    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });
    
    await processWithAgent(userMessage);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'sample_jd':
        const sampleJD = `Software Engineer - Machine Learning
        
We are seeking a talented Software Engineer with expertise in Machine Learning to join our AI team. 

Requirements:
• 3+ years of software development experience
• Strong proficiency in Python, JavaScript, and SQL
• Experience with ML frameworks (TensorFlow, PyTorch, Scikit-learn)
• Knowledge of cloud platforms (AWS, GCP, Azure)
• Experience with REST APIs and microservices
• Strong problem-solving and communication skills

Preferred:
• Experience with NLP and Computer Vision
• Knowledge of MLOps and model deployment
• Agile development experience`;
        
        setInput(sampleJD);
        inputRef.current?.focus();
        break;
      case 'view_kb':
        if (knowledgeBase.length > 0) {
          const kbSummary = knowledgeBase.slice(0, 3).map(item => 
            `• ${item.title} (${item.type})`
          ).join('\n');
          addMessage({ 
            role: 'assistant', 
            content: `Your knowledge base contains ${knowledgeBase.length} items:\n\n${kbSummary}${knowledgeBase.length > 3 ? '\n• ...' : ''}\n\nAdd more items in the Knowledge Base page to improve resume optimization.` 
          });
        } else {
          addMessage({ 
            role: 'assistant', 
            content: 'Your knowledge base is empty. Add your projects, skills, and achievements in the Knowledge Base page to help me optimize your resume better.' 
          });
        }
        break;
      case 'view_history':
        addMessage({ 
          role: 'assistant', 
          content: 'Your version history is displayed in the sidebar. You can restore any previous version by clicking on it.' 
        });
        break;
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50 bg-card/50">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
        </div>
        <div>
          <h2 className="font-semibold text-foreground">Resume Agent</h2>
          <p className="text-xs text-muted-foreground">
            {ollamaAvailable ? 'GLM-4.7 Ready' : ollamaAvailable === false ? 'Ollama unavailable' : 'Checking Ollama...'} • Paste JD to optimize
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>
        
        {isAgentThinking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-chat-ai rounded-2xl rounded-bl-md border border-border/50"
          >
            <TypingIndicator currentStep={currentStep} progress={progress} />
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-card/30">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste your job description here and I'll automatically optimize your resume..."
              rows={1}
              className="w-full resize-none rounded-xl bg-secondary border border-border/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 placeholder:text-muted-foreground"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isAgentThinking}
            className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90"
          >
            {isAgentThinking ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Autonomous AI agent with 6-step optimization process • Paste job description to start
        </p>
      </div>
    </div>
  );
};
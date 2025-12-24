import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, FileText, Database, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore, Message } from '@/stores/useResumeStore';
import { 
  chatWithAgent, 
  analyzeJobDescription, 
  searchKnowledgeBase, 
  calculateATSScore,
  rewriteResume 
} from '@/lib/resumeAgent';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-4 py-3">
    <div className="typing-indicator flex gap-1">
      <span className="w-2 h-2 rounded-full bg-primary" />
      <span className="w-2 h-2 rounded-full bg-primary" />
      <span className="w-2 h-2 rounded-full bg-primary" />
    </div>
    <span className="text-sm text-muted-foreground ml-2">Agent is analyzing...</span>
  </div>
);

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <span className="text-[10px] opacity-50 mt-2 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
};

const QuickActions = ({ onAction }: { onAction: (action: string) => void }) => {
  const actions = [
    { icon: FileText, label: 'Analyze JD', action: 'analyze_jd' },
    { icon: Database, label: 'Search KB', action: 'search_kb' },
    { icon: History, label: 'View History', action: 'view_history' },
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
    jobDescription,
    setJobDescription,
    addVersion,
  } = useResumeStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processWithAgent = async (userMessage: string) => {
    setIsAgentThinking(true);
    
    const lowerMessage = userMessage.toLowerCase();
    
    try {
      // Check if OpenRouter API key is available
      if (!OPENROUTER_API_KEY) {
        // Fallback to simulated responses
        await simulateAgentResponse(userMessage);
        return;
      }

      // Detect intent and route accordingly
      if (lowerMessage.includes('job description') || lowerMessage.includes('jd') || userMessage.length > 200) {
        // Likely pasting a job description
        setJobDescription(userMessage);
        
        const analysis = await analyzeJobDescription(userMessage);
        const atsResult = calculateATSScore(latexContent, userMessage);
        
        setAtsScore(atsResult.score);
        setMatchedKeywords(atsResult.matched);
        
        addMessage({ 
          role: 'assistant', 
          content: `${analysis}\n\n**Current ATS Match: ${atsResult.score}%**\n\nMatched keywords: ${atsResult.matched.join(', ')}\nMissing keywords: ${atsResult.missing.join(', ')}\n\nSay "proceed" to let me rewrite your resume.` 
        });
      } else if (lowerMessage.includes('proceed') || lowerMessage.includes('rewrite') || lowerMessage.includes('modify')) {
        if (!jobDescription) {
          addMessage({ 
            role: 'assistant', 
            content: 'Please paste a job description first so I can tailor your resume accordingly.' 
          });
          return;
        }

        // Save current version before modifying
        addVersion({
          latex: latexContent,
          description: 'Before AI rewrite',
          atsScore: calculateATSScore(latexContent, jobDescription).score,
        });

        const newLatex = await rewriteResume(
          { jobDescription, currentLatex: latexContent, knowledgeBase },
          'Rewrite the resume to maximize ATS compatibility with the job description. Use the exact language from the JD. Add relevant items from knowledge base if appropriate.'
        );

        setLatexContent(newLatex);
        
        const newAtsResult = calculateATSScore(newLatex, jobDescription);
        setAtsScore(newAtsResult.score);
        setMatchedKeywords(newAtsResult.matched);

        addMessage({ 
          role: 'assistant', 
          content: `Done! I've rewritten your resume to match the job description.\n\n**New ATS Score: ${newAtsResult.score}%** (was ${calculateATSScore(latexContent, jobDescription).score}%)\n\nChanges made:\n• Updated language to mirror JD\n• Emphasized relevant skills\n• Incorporated relevant KB items\n\nReview the changes in the editor. Say "undo" to restore the previous version.` 
        });
      } else if (lowerMessage.includes('knowledge') || lowerMessage.includes('kb') || lowerMessage.includes('search')) {
        const relevantItems = searchKnowledgeBase(
          jobDescription || userMessage, 
          knowledgeBase, 
          5
        );

        if (relevantItems.length > 0) {
          const itemsList = relevantItems.map((item, i) => 
            `**${i + 1}. ${item.title}** (${item.type})\n${item.content.slice(0, 150)}...`
          ).join('\n\n');

          addMessage({ 
            role: 'assistant', 
            content: `Found ${relevantItems.length} relevant items:\n\n${itemsList}\n\nWould you like me to incorporate any of these into your resume?` 
          });
        } else {
          addMessage({ 
            role: 'assistant', 
            content: 'No matching items found in your knowledge base. Try adding more projects, skills, or achievements.' 
          });
        }
      } else if (lowerMessage.includes('undo') || lowerMessage.includes('revert')) {
        addMessage({ 
          role: 'assistant', 
          content: 'You can restore any previous version from the Version History in the sidebar. Click on a version to preview and restore it.' 
        });
      } else {
        // General chat with context
        const conversationHistory = messages.slice(-10).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));

        const response = await chatWithAgent(
          userMessage,
          { jobDescription, currentLatex: latexContent, knowledgeBase },
          conversationHistory
        );

        addMessage({ role: 'assistant', content: response });
      }
    } catch (error) {
      console.error('Agent error:', error);
      toast({
        title: 'Agent Error',
        description: error instanceof Error ? error.message : 'Failed to process your request.',
        variant: 'destructive',
      });
      
      // Fallback to simulated response
      await simulateAgentResponse(userMessage);
    } finally {
      setIsAgentThinking(false);
    }
  };

  const simulateAgentResponse = async (userMessage: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const lowerMessage = userMessage.toLowerCase();
    let response = '';
    
    if (lowerMessage.includes('job description') || lowerMessage.includes('jd') || userMessage.length > 200) {
      setJobDescription(userMessage);
      const atsResult = calculateATSScore(latexContent, userMessage);
      setAtsScore(atsResult.score);
      setMatchedKeywords(atsResult.matched);
      
      response = `I've analyzed the job description.\n\n**Key Requirements Detected:**\n• Software engineering experience\n• React/TypeScript proficiency\n• Cloud platform experience (AWS/GCP)\n• Team collaboration skills\n\n**Current ATS Match: ${atsResult.score}%**\n\nMatched: ${atsResult.matched.join(', ')}\n\nSay "proceed" to let me rewrite your resume, or add your OpenRouter API key for full AI capabilities.`;
    } else if (lowerMessage.includes('proceed') || lowerMessage.includes('rewrite')) {
      response = 'To enable AI-powered resume rewriting, please add your OpenRouter API key. For now, you can manually edit the LaTeX in the editor using the analysis I provided.';
    } else {
      response = `I understand you want to optimize your resume. Here's what I can do:\n\n1. **Paste a job description** - I'll extract key requirements\n2. **Say "search KB"** - I'll find relevant experience\n3. **Say "proceed"** - I'll modify your LaTeX (requires API key)\n\nFor full AI capabilities, add your OpenRouter API key in the environment variables.`;
    }
    
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
      case 'analyze_jd':
        setInput('Analyze this job description and tell me what changes to make:\n\n');
        inputRef.current?.focus();
        break;
      case 'search_kb':
        addMessage({ role: 'user', content: 'Search my knowledge base for relevant experience' });
        processWithAgent('Search my knowledge base for relevant experience');
        break;
      case 'view_history':
        addMessage({ 
          role: 'assistant', 
          content: 'Your version history is displayed in the sidebar. You have saved versions you can restore at any time.' 
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
            {OPENROUTER_API_KEY ? 'AI-powered' : 'Demo mode'} • Paste JD to start
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <QuickActions onAction={handleQuickAction} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
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
            <TypingIndicator />
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
              placeholder="Paste a job description or ask me to optimize..."
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
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};
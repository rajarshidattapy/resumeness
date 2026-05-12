import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, FileText, Database, History, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore, Message } from '@/stores/useResumeStore';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const TypingIndicator = () => (
  <div className="flex items-center gap-1.5 px-4 py-3">
    <div className="typing-indicator flex gap-1">
      <span className="w-2 h-2 rounded-full bg-primary" />
      <span className="w-2 h-2 rounded-full bg-primary" />
      <span className="w-2 h-2 rounded-full bg-primary" />
    </div>
    <span className="text-sm text-muted-foreground ml-2">Thinking...</span>
  </div>
);

const MessageBubble = ({ message }: { message: Message }) => {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-3',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-chat-ai text-foreground rounded-bl-md border border-border/50',
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/30">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-primary">Resume Assistant</span>
          </div>
        )}
        <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-2 prose-headings:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-strong:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:p-3 prose-pre:rounded-lg prose-blockquote:border-l-primary prose-blockquote:pl-4 prose-blockquote:italic">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>
        <span className="text-[10px] opacity-50 mt-2 block">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    addMessage,
    updateMessage,
    isAgentThinking,
    setIsAgentThinking,
    knowledgeBase,
    latexContent,
    jobDescription,
    setJobDescription,
    setAtsScore,
    setMatchedKeywords,
    setLatexContentWithTypewriter,
    addVersion,
  } = useResumeStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isAgentThinking) return;

    const userMessage = input.trim();
    setInput('');
    addMessage({ role: 'user', content: userMessage });

    // Treat the user message as the JD if no JD is set yet
    const activeJD = jobDescription || userMessage;
    if (!jobDescription) setJobDescription(userMessage);

    setIsAgentThinking(true);

    // Add placeholder assistant message and capture its ID
    addMessage({ role: 'assistant', content: '' });
    const storeMessages = useResumeStore.getState().messages;
    const assistantMsgId = storeMessages[storeMessages.length - 1].id;

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: storeMessages.slice(0, -1).map((m) => ({
            role: m.role,
            content: m.content,
          })),
          resumeLatex: latexContent,
          jobDescription: activeJD,
          knowledgeBaseItems: knowledgeBase,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Backend responded with ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          const type = event.type as string;

          if (type === 'text') {
            accText += event.content as string;
            updateMessage(assistantMsgId, accText);
          } else if (type === 'ats') {
            setAtsScore(event.score as number);
            setMatchedKeywords((event.matchedKeywords as string[]) ?? []);
          } else if (type === 'patches') {
            const updatedLatex = event.updatedLatex as string;
            const summary = event.summary as string;
            const scoreAfter = event.atsScoreAfter as number | undefined;
            const matchedAfter = (event.matchedKeywordsAfter as string[]) ?? undefined;

            if (updatedLatex && updatedLatex !== latexContent) {
              await setLatexContentWithTypewriter(updatedLatex, 2);
              addVersion({
                latex: updatedLatex,
                description: summary || 'AI Optimization',
                atsScore: scoreAfter,
              });
              if (scoreAfter !== undefined) setAtsScore(scoreAfter);
              if (matchedAfter) setMatchedKeywords(matchedAfter);
            }
          } else if (type === 'done') {
            break;
          } else if (type === 'error') {
            updateMessage(
              assistantMsgId,
              accText + '\n\n⚠️ ' + (event.content as string),
            );
          }
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      updateMessage(
        assistantMsgId,
        'Sorry, I could not reach the backend. Make sure the server is running at ' +
          API_URL,
      );
    } finally {
      setIsAgentThinking(false);
    }
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
        setInput(`Software Engineer - Machine Learning

We are seeking a talented Software Engineer with expertise in Machine Learning to join our AI team.

Requirements:
• 3+ years of software development experience
• Strong proficiency in Python, JavaScript, and SQL
• Experience with ML frameworks (TensorFlow, PyTorch, Scikit-learn)
• Knowledge of cloud platforms (AWS, GCP, Azure)
• Experience with REST APIs and microservices
• Strong problem-solving and communication skills`);
        inputRef.current?.focus();
        break;
      case 'view_kb':
        addMessage({
          role: 'assistant',
          content:
            knowledgeBase.length > 0
              ? `Your knowledge base contains **${knowledgeBase.length} items**:\n\n${knowledgeBase
                  .slice(0, 5)
                  .map((item) => `• **${item.title}** (${item.type})`)
                  .join('\n')}${knowledgeBase.length > 5 ? '\n• ...' : ''}`
              : 'Your knowledge base is empty. Add your projects, skills, and achievements in the Knowledge Base page.',
        });
        break;
      case 'view_history':
        addMessage({
          role: 'assistant',
          content:
            'Your version history is displayed in the sidebar. You can restore any previous version by clicking on it.',
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
          <h2 className="font-semibold text-foreground">Resume Assistant</h2>
          <p className="text-xs text-muted-foreground">Paste a job description to get started</p>
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
              placeholder="Paste your job description here..."
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

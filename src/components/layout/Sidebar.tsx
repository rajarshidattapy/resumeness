import { motion } from 'framer-motion';
import { FileText, Database, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ATSScore } from '@/components/sidebar/ATSScore';
import { VersionHistory } from '@/components/sidebar/VersionHistory';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/stores/useResumeStore';

export const Sidebar = () => {
  const { knowledgeBase } = useResumeStore();

  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="w-80 h-full bg-card/30 border-r border-border/50 flex flex-col"
    >
      {/* Logo */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center glow-primary">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gradient">Resumeness</h1>
            <p className="text-xs text-muted-foreground">AI Resume Engineer</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <ATSScore />
        
        {/* Knowledge Base Link */}
        <Link to="/knowledge-base">
          <div className="bg-card/50 rounded-xl border border-border/50 p-4 hover:bg-secondary/30 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground">Knowledge Base</h3>
                <p className="text-xs text-muted-foreground">{knowledgeBase.length} items</p>
              </div>
            </div>
          </div>
        </Link>

        <VersionHistory />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center justify-end">
          <Button variant="ghost" size="iconSm">
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.aside>
  );
};
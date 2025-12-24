import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, ChevronDown, RotateCcw, GitCompare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/stores/useResumeStore';
import { cn } from '@/lib/utils';

export const VersionHistory = () => {
  const { versions, setLatexContent } = useResumeStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleRestore = (latex: string) => {
    setLatexContent(latex);
  };

  return (
    <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <History className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-foreground">Version History</h3>
            <p className="text-xs text-muted-foreground">{versions.length} saved versions</p>
          </div>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 pt-0 space-y-2">
              {versions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No versions saved yet. Your changes will be tracked automatically.
                </p>
              ) : (
                versions.slice(0, 5).map((version) => (
                  <motion.div
                    key={version.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="group flex items-center gap-3 p-2 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {version.description}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {version.timestamp.toLocaleString()}
                      </p>
                    </div>
                    {version.atsScore && (
                      <span className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full",
                        version.atsScore >= 85 ? "bg-success/10 text-success" :
                        version.atsScore >= 70 ? "bg-warning/10 text-warning" :
                        "bg-destructive/10 text-destructive"
                      )}>
                        {version.atsScore}%
                      </span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => handleRestore(version.latex)}
                        title="Restore this version"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

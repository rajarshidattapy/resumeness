import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Plus, Briefcase, Award, Code, Trash2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore, KnowledgeItem } from '@/stores/useResumeStore';
import { cn } from '@/lib/utils';

const typeIcons = {
  project: Code,
  skill: Database,
  experience: Briefcase,
  achievement: Award,
};

const typeColors = {
  project: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  skill: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  experience: 'bg-green-500/10 text-green-400 border-green-500/20',
  achievement: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

const KBItem = ({ item, onRemove }: { item: KnowledgeItem; onRemove: () => void }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = typeIcons[item.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group bg-secondary/50 rounded-lg border border-border/50 overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-secondary/80 transition-colors"
      >
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center border", typeColors[item.type])}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
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
            <div className="px-3 pb-3 pt-1 border-t border-border/30">
              <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                {item.content}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-primary/10 text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const KnowledgeBase = () => {
  const { knowledgeBase, removeKnowledgeItem } = useResumeStore();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-foreground">Knowledge Base</h3>
            <p className="text-xs text-muted-foreground">{knowledgeBase.length} items</p>
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
              {knowledgeBase.map((item) => (
                <KBItem
                  key={item.id}
                  item={item}
                  onRemove={() => removeKnowledgeItem(item.id)}
                />
              ))}
              
              <Button variant="outline" size="sm" className="w-full mt-2">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

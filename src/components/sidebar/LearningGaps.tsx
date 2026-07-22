import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, ChevronDown, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { useResumeStore } from '@/stores/useResumeStore';
import { Button } from '@/components/ui/button';
import { suggestLearningPath, type LearningPathResult } from '@/lib/api/learningPath';
import { cn } from '@/lib/utils';

const GapRow = ({ requirement, bestSimilarity }: { requirement: string; bestSimilarity: number }) => {
  const [path, setPath] = useState<LearningPathResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuggest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setPath(await suggestLearningPath(requirement));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/50">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-foreground capitalize">{requirement}</p>
          <p className="text-[10px] text-muted-foreground">
            No strong evidence in your knowledge base ({Math.round(bestSimilarity * 100)}% best match)
          </p>
        </div>
      </div>

      {!path && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 h-7 text-[11px]"
          onClick={handleSuggest}
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
          Suggest learning path
        </Button>
      )}

      {error && <p className="text-[10px] text-destructive mt-1.5">{error}</p>}

      {path && (
        <div className="mt-2 pt-2 border-t border-border/30 space-y-1.5">
          <p className="text-[11px] text-muted-foreground leading-snug">{path.blurb}</p>
          <p className="text-[10px] text-muted-foreground">~{path.estimatedHours}h estimated</p>
          <div className="space-y-1">
            {path.sources.map((s) => (
              <a
                key={s.url}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {s.name}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const LearningGaps = () => {
  const { knowledgeGaps } = useResumeStore();
  const [isExpanded, setIsExpanded] = useState(true);

  if (knowledgeGaps.length === 0) return null;

  return (
    <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-warning" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-foreground">Learning Gaps</h3>
            <p className="text-xs text-muted-foreground">{knowledgeGaps.length} unmatched requirement{knowledgeGaps.length === 1 ? '' : 's'}</p>
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
              {knowledgeGaps.map((gap) => (
                <GapRow key={gap.requirement} requirement={gap.requirement} bestSimilarity={gap.bestSimilarity} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

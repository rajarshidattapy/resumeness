import { motion } from 'framer-motion';
import { Target, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { useResumeStore } from '@/stores/useResumeStore';
import { cn } from '@/lib/utils';

export const ATSScore = () => {
  const { atsScore, matchedKeywords } = useResumeStore();

  if (atsScore === null) {
    return (
      <div className="p-4 bg-card/50 rounded-xl border border-border/50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <Target className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">ATS Score</h3>
            <p className="text-xs text-muted-foreground">Not analyzed yet</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste a job description to get your ATS compatibility score.
        </p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Needs Work';
  };

  const circumference = 2 * Math.PI * 36;
  const strokeDashoffset = circumference - (atsScore / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-4 bg-card/50 rounded-xl border border-border/50"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Target className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-medium text-foreground">ATS Score</h3>
          <p className="text-xs text-muted-foreground">{getScoreLabel(atsScore)}</p>
        </div>
      </div>

      {/* Circular Progress */}
      <div className="flex justify-center mb-4">
        <div className="relative w-24 h-24">
          <svg className="w-24 h-24 -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="36"
              fill="none"
              stroke="hsl(var(--border))"
              strokeWidth="8"
            />
            <motion.circle
              cx="48"
              cy="48"
              r="36"
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-2xl font-bold", getScoreColor(atsScore))}>
              {atsScore}%
            </span>
          </div>
        </div>
      </div>

      {/* Matched Keywords */}
      {matchedKeywords.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            <span className="text-xs font-medium text-foreground">
              Matched Keywords ({matchedKeywords.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {matchedKeywords.map((keyword, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 text-xs rounded-full bg-success/10 text-success border border-success/20"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

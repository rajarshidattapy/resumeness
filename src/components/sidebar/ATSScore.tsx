import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import { useResumeStore } from '@/stores/useResumeStore';
import { Button } from '@/components/ui/button';
import { deepAnalyze, type BenchmarkResult } from '@/lib/api/ats';
import { cn } from '@/lib/utils';

const CATEGORY_LABELS: Record<keyof Pick<BenchmarkResult, 'skills_alignment' | 'experience_relevance' | 'project_relevance' | 'ats_readability'>, string> = {
  skills_alignment: 'Skills Alignment',
  experience_relevance: 'Experience Relevance',
  project_relevance: 'Project Relevance',
  ats_readability: 'ATS Readability',
};

const BenchmarkPanel = ({ benchmark }: { benchmark: BenchmarkResult }) => (
  <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        Deep Analysis
      </span>
      <span className="text-xs font-semibold text-primary">{benchmark.overall}/100</span>
    </div>

    {(Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[]).map((key) => {
      const cat = benchmark[key];
      const pct = cat.max > 0 ? (cat.score / cat.max) * 100 : 0;
      return (
        <div key={key}>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-muted-foreground">{CATEGORY_LABELS[key]}</span>
            <span className="text-foreground font-medium">{cat.score}/{cat.max}</span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
          </div>
          {cat.evidence && (
            <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{cat.evidence}</p>
          )}
        </div>
      );
    })}

    {benchmark.key_strengths.length > 0 && (
      <div>
        <p className="text-[11px] font-medium text-success mb-1">Key strengths</p>
        <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
          {benchmark.key_strengths.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    )}

    {benchmark.areas_for_improvement.length > 0 && (
      <div>
        <p className="text-[11px] font-medium text-warning mb-1">Areas to improve</p>
        <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc list-inside">
          {benchmark.areas_for_improvement.map((s, i) => <li key={i}>{s}</li>)}
        </ul>
      </div>
    )}
  </div>
);

export const ATSScore = () => {
  const { atsScore, matchedKeywords, latexContent, jobDescription } = useResumeStore();
  const [benchmark, setBenchmark] = useState<BenchmarkResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const handleDeepAnalyze = async () => {
    if (!jobDescription.trim()) return;
    setIsAnalyzing(true);
    setAnalyzeError(null);
    try {
      const result = await deepAnalyze(latexContent, jobDescription);
      setBenchmark(result.benchmark);
    } catch (error) {
      setAnalyzeError(error instanceof Error ? error.message : 'Deep analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

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

      {/* Deep Analyze */}
      <div className="mt-4 pt-4 border-t border-border/30">
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs"
          onClick={handleDeepAnalyze}
          disabled={isAnalyzing || !jobDescription.trim()}
        >
          {isAnalyzing ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
          )}
          {isAnalyzing ? 'Analyzing…' : 'Deep Analyze'}
        </Button>
        {analyzeError && (
          <p className="text-[11px] text-destructive mt-2">{analyzeError}</p>
        )}
      </div>

      {benchmark && <BenchmarkPanel benchmark={benchmark} />}
    </motion.div>
  );
};

import { useEffect, useState } from 'react';
import { Loader2, Award, CheckCircle2, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { generateQuiz, submitQuiz, type QuizQuestion, type QuizSubmitResult } from '@/lib/api/quiz';
import { certificatePdfUrl } from '@/lib/api/certificates';
import { cn } from '@/lib/utils';

interface QuizDialogProps {
  userId: string;
  itemId: string;
  itemTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuizDialog = ({ userId, itemId, itemTitle, open, onOpenChange }: QuizDialogProps) => {
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<QuizSubmitResult | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuestions(null);
    setAnswers([]);
    setResult(null);
    setError(null);
    setIsLoading(true);

    generateQuiz(userId, itemId)
      .then((qs) => {
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(-1));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to generate quiz'))
      .finally(() => setIsLoading(false));
  }, [open, userId, itemId]);

  const handleSubmit = async () => {
    if (!questions) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await submitQuiz(userId, itemId, questions, answers);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const allAnswered = questions ? answers.every((a) => a >= 0) : false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quiz: {itemTitle}</DialogTitle>
          <DialogDescription>
            A few quick questions to verify this skill — not a memory test on your own description.
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result ? (
          <div className="text-center py-4 space-y-3">
            {result.score >= 80 ? (
              <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
            ) : (
              <XCircle className="w-10 h-10 text-warning mx-auto" />
            )}
            <p className="text-2xl font-bold">{result.score}%</p>
            <p className="text-sm text-muted-foreground">
              {result.correctCount} of {result.total} correct
            </p>
            {result.certificateId && (
              <a
                href={certificatePdfUrl(result.certificateId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <Award className="w-4 h-4" />
                Download certificate
              </a>
            )}
          </div>
        ) : (
          questions && (
            <div className="space-y-5">
              {questions.map((q, qIdx) => (
                <div key={qIdx}>
                  <p className="text-sm font-medium text-foreground mb-2">
                    {qIdx + 1}. {q.question}
                  </p>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qIdx ? oIdx : a)))}
                        className={cn(
                          'w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors',
                          answers[qIdx] === oIdx
                            ? 'border-primary bg-primary/10 text-foreground'
                            : 'border-border/50 hover:bg-secondary/50',
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {questions && !result && (
          <DialogFooter>
            <Button onClick={handleSubmit} disabled={!allAnswered || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Submit
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

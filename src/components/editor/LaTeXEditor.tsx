import { useCallback, useState, useEffect, useRef } from 'react';
import CodeMirror, { ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, Eye, Download, RotateCcw, Maximize2, Loader2, FileDown, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore, setEditorViewRef } from '@/stores/useResumeStore';
import { compileLatexToPdf, downloadPdf } from '@/lib/latexCompiler';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


export const LaTeXEditor = () => {
  const { latexContent, setLatexContent, activePanel, setActivePanel, addVersion, isTypewriting } = useResumeStore();
  const [isCompiling, setIsCompiling] = useState(false);
  const { toast } = useToast();
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const prevContentRef = useRef(latexContent);

  // Register the EditorView ref for external content dispatch (module-level, no re-renders)
  useEffect(() => {
    const view = editorRef.current?.view;
    if (view) {
      setEditorViewRef(view);
    }
    return () => setEditorViewRef(null);
  }, []); // only on mount/unmount

  // Track when content changes externally (e.g., from AI) vs from user typing
  useEffect(() => {
    if (latexContent !== prevContentRef.current) {
      prevContentRef.current = latexContent;
    }
  }, [latexContent]);

  const handleChange = useCallback((value: string) => {
    prevContentRef.current = value; // Track that this change came from typing
    setLatexContent(value);
  }, [setLatexContent]);

  const handleSaveVersion = () => {
    addVersion({
      latex: latexContent,
      description: 'Manual save',
    });
    toast({
      title: 'Version saved',
      description: 'Your resume version has been saved.',
    });
  };

  const handleDownloadTex = () => {
    const blob = new Blob([latexContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume.tex';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    setIsCompiling(true);
    try {
      const result = await compileLatexToPdf(latexContent);

      if (result.success && result.pdfBlob) {
        downloadPdf(result.pdfBlob, 'resume.pdf');
        toast({
          title: 'PDF downloaded',
          description: 'Your resume has been compiled and downloaded.',
        });
      } else {
        toast({
          title: 'Compilation failed',
          description: result.error || 'Failed to compile LaTeX to PDF.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to compile PDF.',
        variant: 'destructive',
      });
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-editor-bg relative">
      {/* Typewriting Indicator Overlay */}
      <AnimatePresence>
        {isTypewriting && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-r from-primary/20 via-primary/30 to-primary/20 px-4 py-2 flex items-center justify-center gap-2 border-b border-primary/30"
          >
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">AI is updating your resume...</span>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-secondary p-1">
            <button
              onClick={() => setActivePanel('editor')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                activePanel === 'editor'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Code className="w-4 h-4" />
              Editor
            </button>
            <button
              onClick={() => setActivePanel('preview')}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                activePanel === 'preview'
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="iconSm" onClick={handleSaveVersion} title="Save Version">
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={handleDownloadTex} title="Download .tex">
            <Download className="w-4 h-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleDownloadPdf}
            disabled={isCompiling}
            title="Download PDF"
            className="bg-primary hover:bg-primary/90"
          >
            {isCompiling ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="w-4 h-4 mr-2" />
            )}
            PDF
          </Button>
          <Button variant="ghost" size="iconSm" title="Fullscreen">
            <Maximize2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Editor/Preview Content */}
      <div className="flex-1 overflow-hidden">
        {activePanel === 'editor' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full"
          >
            <CodeMirror
              ref={editorRef}
              value={latexContent}
              height="100%"
              theme="light"
              onChange={handleChange}
              className="h-full text-sm"
              basicSetup={{
                lineNumbers: true,
                highlightActiveLineGutter: true,
                highlightActiveLine: true,
                foldGutter: true,
                autocompletion: true,
              }}
            />
          </motion.div>
        ) : (
          <ResumePreview key={latexContent} latex={latexContent} />
        )}
      </div>
    </div>
  );
};

// PDF preview component
const ResumePreview = ({ latex }: { latex: string }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const { toast } = useToast();

  // Compile LaTeX to PDF when latex content changes
  useEffect(() => {
    let isCancelled = false;
    
    const compileToPdf = async () => {
      setIsLoading(true);
      setError(null);

      try {
        console.log('Compiling LaTeX, content length:', latex.length);
        const result = await compileLatexToPdf(latex);

        if (isCancelled) return;

        if (result.success && result.pdfUrl) {
          setPdfUrl(prevUrl => {
            // Revoke previous URL to avoid memory leaks
            if (prevUrl) {
              URL.revokeObjectURL(prevUrl);
            }
            pdfUrlRef.current = result.pdfUrl!;
            return result.pdfUrl!;
          });
        } else {
          setError(result.error || 'Failed to compile LaTeX');
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Compilation error');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    compileToPdf();

    return () => {
      isCancelled = true;
    };
  }, [latex]);

  // Cleanup PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
      }
    };
  }, []);

  const handleRetry = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await compileLatexToPdf(latex);
      if (result.success && result.pdfUrl) {
        setPdfUrl(prevUrl => {
          if (prevUrl) URL.revokeObjectURL(prevUrl);
          pdfUrlRef.current = result.pdfUrl!;
          return result.pdfUrl!;
        });
      } else {
        setError(result.error || 'Failed to compile LaTeX');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation error');
    } finally {
      setIsLoading(false);
    }
  }, [latex]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-full bg-gray-50 dark:bg-gray-900 overflow-hidden"
    >
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-sm text-muted-foreground">Compiling LaTeX to PDF...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-full p-6">
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-4xl w-full">
            <h3 className="text-lg font-semibold mb-2 text-destructive">Compilation Error</h3>
            <p className="text-sm text-muted-foreground mb-4">
              There was an error compiling your LaTeX document:
            </p>
            <pre className="text-xs bg-black/5 dark:bg-white/5 p-4 rounded overflow-auto max-h-96 font-mono whitespace-pre-wrap break-words">
              {error || 'No error details available'}
            </pre>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={handleRetry}
                variant="outline"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
              <Button
                onClick={() => {
                  // Copy error to clipboard
                  navigator.clipboard.writeText(error || '');
                  toast({
                    title: 'Error copied',
                    description: 'Error message copied to clipboard',
                  });
                }}
                variant="ghost"
                size="sm"
              >
                Copy Error
              </Button>
            </div>
          </div>
        </div>
      ) : pdfUrl ? (
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          title="Resume Preview"
        />
      ) : null}
    </motion.div>
  );
};
import { useCallback, useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { motion } from 'framer-motion';
import { Code, Eye, Download, RotateCcw, Maximize2, Loader2, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useResumeStore } from '@/stores/useResumeStore';
import { compileLatexToPdf, downloadPdf } from '@/lib/latexCompiler';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


export const LaTeXEditor = () => {
  const { latexContent, setLatexContent, activePanel, setActivePanel, addVersion } = useResumeStore();
  const [isCompiling, setIsCompiling] = useState(false);
  const { toast } = useToast();

  const handleChange = useCallback((value: string) => {
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
    <div className="flex flex-col h-full bg-editor-bg">
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
  const { toast } = useToast();

  // Compile LaTeX to PDF
  const compileToPdf = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await compileLatexToPdf(latex);

      if (result.success && result.pdfUrl) {
        // Revoke previous URL to avoid memory leaks
        if (pdfUrl) {
          URL.revokeObjectURL(pdfUrl);
        }
        setPdfUrl(result.pdfUrl);
      } else {
        setError(result.error || 'Failed to compile LaTeX');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compilation error');
    } finally {
      setIsLoading(false);
    }
  }, [latex, pdfUrl]);

  // Compile on mount and when latex changes
  useEffect(() => {
    compileToPdf();
  }, [latex]);

  // Cleanup PDF URL on unmount
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

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
          <div className="bg-destructive/10 border border-destructive rounded-lg p-6 max-w-2xl">
            <h3 className="text-lg font-semibold mb-2 text-destructive">Compilation Error</h3>
            <p className="text-sm text-muted-foreground mb-4">
              There was an error compiling your LaTeX document:
            </p>
            <pre className="text-xs bg-black/5 dark:bg-white/5 p-4 rounded overflow-auto max-h-60">
              {error}
            </pre>
            <Button
              onClick={compileToPdf}
              className="mt-4"
              variant="outline"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry
            </Button>
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
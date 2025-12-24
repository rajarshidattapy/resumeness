import { useCallback, useState } from 'react';
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
          <ResumePreview latex={latexContent} />
        )}
      </div>
    </div>
  );
};

// Styled resume preview component
const ResumePreview = ({ latex }: { latex: string }) => {
  // Parse LaTeX content into structured data for preview
  const parseLatexContent = (tex: string) => {
    const sections: { title: string; content: string }[] = [];
    
    // Extract name
    const nameMatch = tex.match(/\\LARGE\s*\\textbf\{([^}]+)\}/);
    const name = nameMatch ? nameMatch[1] : 'Your Name';
    
    // Extract contact info
    const emailMatch = tex.match(/\\faEnvelope\\\s*([^\s\\]+)/);
    const phoneMatch = tex.match(/\\faPhone\\\s*([^\s\\]+)/);
    
    // Extract sections
    const sectionMatches = tex.matchAll(/\\section\*\{([^}]+)\}([\s\S]*?)(?=\\section\*|\\end\{document\})/g);
    
    for (const match of sectionMatches) {
      sections.push({
        title: match[1],
        content: match[2].trim()
      });
    }
    
    return { name, email: emailMatch?.[1], phone: phoneMatch?.[1], sections };
  };

  const parsed = parseLatexContent(latex);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full overflow-auto bg-secondary/30 p-8"
    >
      <div className="max-w-[8.5in] mx-auto bg-card border border-border rounded-lg shadow-lg p-8 min-h-[11in]">
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b border-border/50">
          <h1 className="text-2xl font-bold text-foreground mb-2">{parsed.name}</h1>
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            {parsed.email && <span>✉ {parsed.email}</span>}
            {parsed.phone && <span>☎ {parsed.phone}</span>}
          </div>
        </div>

        {/* Sections */}
        {parsed.sections.map((section, idx) => (
          <div key={idx} className="mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary mb-3 pb-1 border-b border-primary/30">
              {section.title}
            </h2>
            <div className="text-sm text-foreground/80 leading-relaxed font-mono whitespace-pre-wrap">
              {section.content
                .replace(/\\textbf\{([^}]+)\}/g, '**$1**')
                .replace(/\\textit\{([^}]+)\}/g, '_$1_')
                .replace(/\\item\s*/g, '• ')
                .replace(/\\begin\{itemize\}.*?\n/g, '')
                .replace(/\\end\{itemize\}/g, '')
                .replace(/\[.*?\]/g, '')
                .replace(/\\hfill/g, '  |  ')
                .replace(/\\\\/g, '\n')
                .replace(/\\%/g, '%')
                .trim()}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
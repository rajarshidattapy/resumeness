// LaTeX to PDF compilation using latex.ytotech.com API

const LATEX_API_URL = 'https://latex.ytotech.com/builds/sync';

export interface CompileResult {
  success: boolean;
  pdfUrl?: string;
  pdfBlob?: Blob;
  error?: string;
}

export async function compileLatexToPdf(latexContent: string): Promise<CompileResult> {
  try {
    const response = await fetch(LATEX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        compiler: 'pdflatex',
        resources: [
          {
            main: true,
            content: latexContent,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `Compilation failed: ${errorText}`,
      };
    }

    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/pdf')) {
      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      return {
        success: true,
        pdfUrl,
        pdfBlob,
      };
    } else {
      // API returned error response
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.logs || 'Unknown compilation error',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to compile LaTeX',
    };
  }
}

export function downloadPdf(blob: Blob, filename: string = 'resume.pdf'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function revokePdfUrl(url: string): void {
  URL.revokeObjectURL(url);
}
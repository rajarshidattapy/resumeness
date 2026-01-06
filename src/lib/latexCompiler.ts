// LaTeX to PDF compilation using latex.ytotech.com API

const LATEX_API_URL = 'https://latex.ytotech.com/builds/sync';

/**
 * Validate LaTeX content for common issues
 */
function validateLatex(latexContent: string): { valid: boolean; error?: string } {
  if (!latexContent || latexContent.trim().length === 0) {
    return { valid: false, error: 'LaTeX content is empty' };
  }

  // Check for required document structure
  if (!latexContent.includes('\\documentclass')) {
    return { valid: false, error: 'LaTeX document must start with \\documentclass' };
  }

  if (!latexContent.includes('\\begin{document}')) {
    return { valid: false, error: 'LaTeX document must contain \\begin{document}' };
  }

  if (!latexContent.includes('\\end{document}')) {
    return { valid: false, error: 'LaTeX document must contain \\end{document}' };
  }

  // Check for balanced braces (basic check)
  const openBraces = (latexContent.match(/\{/g) || []).length;
  const closeBraces = (latexContent.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return { 
      valid: false, 
      error: `Unbalanced braces: ${openBraces} opening braces, ${closeBraces} closing braces` 
    };
  }

  return { valid: true };
}

export interface CompileResult {
  success: boolean;
  pdfUrl?: string;
  pdfBlob?: Blob;
  error?: string;
}

export async function compileLatexToPdf(latexContent: string): Promise<CompileResult> {
  // Validate LaTeX content first
  const validation = validateLatex(latexContent);
  if (!validation.valid) {
    return {
      success: false,
      error: `LaTeX validation error: ${validation.error}`,
    };
  }

  try {
    console.log('Compiling LaTeX to PDF...');
    
    const requestBody = {
      compiler: 'pdflatex',
      resources: [
        {
          main: true,
          content: latexContent,
        },
      ],
    };

    console.log('Request body:', { ...requestBody, resources: [{ ...requestBody.resources[0], content: '[LaTeX content hidden]' }] });

    const response = await fetch(LATEX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status, response.statusText);
    console.log('Response content-type:', response.headers.get('content-type'));

    const contentType = response.headers.get('content-type');
    
    // Check if response is PDF
    if (contentType?.includes('application/pdf')) {
      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      return {
        success: true,
        pdfUrl,
        pdfBlob,
      };
    }

    // Handle error responses
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        // Try to get error message from response
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        // Try to parse as JSON first
        try {
          const errorData = JSON.parse(errorText);
          console.error('Error response JSON:', errorData);
          errorMessage = errorData.logs || errorData.error || errorData.message || errorData.details || errorText;
          
          // If logs is an array, join them
          if (Array.isArray(errorData.logs)) {
            errorMessage = errorData.logs.join('\n');
          }
        } catch {
          // If not JSON, use the text directly
          errorMessage = errorText || errorMessage;
        }
      } catch (parseError) {
        console.error('Error parsing error response:', parseError);
        errorMessage = `Failed to parse error response. Status: ${response.status}`;
      }
      
      console.error('Final error message:', errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }

    // Response is OK but not PDF - try to get error info
    try {
      const responseText = await response.text();
      console.warn('Response is OK but not PDF. Response text:', responseText.substring(0, 500));
      
      let errorData;
      
      try {
        errorData = JSON.parse(responseText);
        console.warn('Parsed error data:', errorData);
      } catch {
        errorData = { logs: responseText };
      }
      
      let errorMsg = errorData.logs || errorData.error || errorData.message || 'Unknown compilation error. Response was not a PDF.';
      
      // If logs is an array, join them
      if (Array.isArray(errorData.logs)) {
        errorMsg = errorData.logs.join('\n');
      }
      
      return {
        success: false,
        error: errorMsg,
      };
    } catch (error) {
      console.error('Error processing non-PDF response:', error);
      return {
        success: false,
        error: `Failed to process compilation response: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  } catch (error) {
    console.error('LaTeX compilation error:', error);
    return {
      success: false,
      error: error instanceof Error 
        ? `Network error: ${error.message}` 
        : 'Failed to compile LaTeX. Please check your connection and try again.',
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
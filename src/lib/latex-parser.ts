// LaTeX Resume Parser and Section Handler
export interface LatexSection {
  name: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

export class LatexResumeParser {
  private latex: string;

  constructor(latex: string) {
    this.latex = latex;
  }

  /**
   * Parse LaTeX document into sections
   */
  parseSections(): LatexSection[] {
    const sections: LatexSection[] = [];
    const lines = this.latex.split('\n');

    let currentSection: LatexSection | null = null;
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check for section start
      const sectionMatch = trimmed.match(/^\\section\{([^}]+)\}/);
      if (sectionMatch) {
        // Save previous section
        if (currentSection) {
          currentSection.endIndex = i - 1;
          currentSection.content = lines.slice(currentSection.startIndex, i).join('\n');
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          name: sectionMatch[1],
          content: '',
          startIndex: i,
          endIndex: -1
        };
        inSection = true;
      }
    }

    // Add the last section
    if (currentSection) {
      currentSection.endIndex = lines.length - 1;
      currentSection.content = lines.slice(currentSection.startIndex).join('\n');
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Extract content sections that should be modified
   */
  getModifiableSections(): { [key: string]: LatexSection } {
    const sections = this.parseSections();
    const modifiableSections: { [key: string]: LatexSection } = {};

    const modifiableSectionNames = [
      'Professional Experience',
      'Experience',
      'Projects',
      'Skills',
      'Technical Skills',
      'Education',
      'Achievements',
      'Certifications'
    ];

    sections.forEach(section => {
      if (modifiableSectionNames.some(name =>
        section.name.toLowerCase().includes(name.toLowerCase())
      )) {
        modifiableSections[section.name] = section;
      }
    });

    return modifiableSections;
  }

  /**
   * Replace a section's content while preserving LaTeX structure
   */
  replaceSection(sectionName: string, newContent: string): string {
    const sections = this.parseSections();
    const targetSection = sections.find(s => s.name === sectionName);

    if (!targetSection) {
      return this.latex; // Section not found, return original
    }

    const beforeSection = this.latex.substring(0,
      this.latex.indexOf(targetSection.content.split('\n')[0])
    );

    const afterSection = this.latex.substring(
      this.latex.indexOf(targetSection.content) + targetSection.content.length
    );

    return beforeSection + newContent + afterSection;
  }

  /**
   * Get the LaTeX template (everything except content sections)
   */
  getTemplate(): string {
    const modifiableSections = this.getModifiableSections();
    let template = this.latex;

    // Remove modifiable sections
    Object.values(modifiableSections).forEach(section => {
      template = template.replace(section.content, '');
    });

    return template;
  }

  /**
   * Reconstruct LaTeX from template and modified sections
   */
  reconstructFromSections(sections: { [key: string]: string }): string {
    let result = this.getTemplate();

    // Insert sections back in order
    const originalSections = this.parseSections();
    originalSections.forEach(section => {
      if (sections[section.name]) {
        const sectionHeader = section.content.split('\n')[0];
        result = result.replace(sectionHeader, sectionHeader + '\n' + sections[section.name]);
      }
    });

    return result;
  }
}

/**
 * Extract text content from LaTeX for analysis
 */
export function extractTextFromLatex(latex: string): string {
  // Remove LaTeX commands and braces
  let text = latex
    .replace(/\\[a-zA-Z]+\{[^}]*\}/g, '') // Remove commands with braces
    .replace(/\\[a-zA-Z]+/g, '') // Remove other commands
    .replace(/[{}]/g, '') // Remove braces
    .replace(/\\&/g, '&') // Fix escaped characters
    .replace(/\\\\/g, '\n') // Fix line breaks
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return text;
}

/**
 * Check if LaTeX is valid (basic check)
 */
export function isValidLatex(latex: string): boolean {
  try {
    // Basic validation - check for balanced braces and common issues
    let braceCount = 0;
    let inCommand = false;

    for (let i = 0; i < latex.length; i++) {
      const char = latex[i];

      if (char === '\\') {
        inCommand = true;
      } else if (char === '{') {
        braceCount++;
        inCommand = false;
      } else if (char === '}') {
        braceCount--;
        inCommand = false;
        if (braceCount < 0) return false;
      } else if (char === ' ' || char === '\n' || char === '\t') {
        inCommand = false;
      }
    }

    return braceCount === 0;
  } catch {
    return false;
  }
}
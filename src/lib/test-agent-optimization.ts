// Test script to verify agent optimization is working
import { optimizeResumeWithAgent } from './agentIntegration';

const TEST_JOB_DESCRIPTION = `Senior Software Engineer - Full Stack

We are seeking a talented Senior Software Engineer with expertise in React, Node.js, and cloud technologies to join our growing team.

Requirements:
• 5+ years of software development experience
• Strong proficiency in JavaScript, TypeScript, and Python
• Experience with React, Node.js, and modern web frameworks
• Knowledge of cloud platforms (AWS, GCP, Azure)
• Experience with REST APIs and microservices architecture
• Strong problem-solving and communication skills
• Experience with CI/CD pipelines and DevOps practices

Preferred:
• Experience with GraphQL and database design
• Knowledge of containerization (Docker, Kubernetes)
• Agile development experience
• Leadership and mentoring experience`;

const TEST_LATEX = `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{fontawesome5}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{John Developer}}\\\\[4pt]
\\faEnvelope\\ john@example.com \\quad
\\faPhone\\ (555) 123-4567 \\quad
\\faLinkedin\\ linkedin.com/in/johndeveloper \\quad
\\faGithub\\ github.com/johndeveloper
\\end{center}

\\section*{Professional Summary}
Experienced software engineer with 6 years of expertise in building web applications. Passionate about clean code and user experience.

\\section*{Experience}
\\textbf{Software Engineer} \\hfill \\textit{Jan 2020 -- Present}\\\\
\\textit{Tech Company Inc.} \\hfill San Francisco, CA
\\begin{itemize}[leftmargin=*,nosep]
    \\item Built web applications using modern frameworks
    \\item Worked with databases and APIs
    \\item Collaborated with team members on projects
\\end{itemize}

\\section*{Skills}
\\textbf{Languages:} JavaScript, HTML, CSS, SQL\\\\
\\textbf{Technologies:} React, Express, MySQL

\\end{document}`;

const TEST_KNOWLEDGE = [
  {
    id: '1',
    type: 'project' as const,
    title: 'E-commerce Platform',
    content: 'Built a full-stack e-commerce platform using React, Node.js, and PostgreSQL. Implemented real-time inventory management, payment processing with Stripe, and achieved 99.9% uptime. Used AWS for hosting and Docker for containerization.',
    tags: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'AWS', 'Docker'],
  },
  {
    id: '2',
    type: 'achievement' as const,
    title: 'Performance Optimization',
    content: 'Reduced API response time by 60% through database optimization and caching strategies. Implemented Redis for session management and improved overall system performance.',
    tags: ['performance', 'optimization', 'Redis', 'caching'],
  },
  {
    id: '3',
    type: 'skill' as const,
    title: 'Cloud Architecture',
    content: 'Designed and implemented AWS infrastructure using CloudFormation. Managed EC2 instances, RDS databases, and S3 storage. Set up CI/CD pipelines using GitHub Actions.',
    tags: ['AWS', 'CloudFormation', 'EC2', 'RDS', 'S3', 'CI/CD', 'GitHub Actions'],
  },
];

export async function testAgentOptimization() {
  console.log('🧪 Testing Agent Optimization...');
  console.log('📄 Original LaTeX length:', TEST_LATEX.length);
  
  try {
    const result = await optimizeResumeWithAgent(
      TEST_JOB_DESCRIPTION,
      TEST_LATEX,
      TEST_KNOWLEDGE,
      (step, progress, message) => {
        console.log(`📊 Progress: ${step} (${progress}%) - ${message}`);
      }
    );

    console.log('✅ Optimization completed!');
    console.log('📊 Results:');
    console.log('  - Success:', result.success);
    console.log('  - ATS Score:', result.atsScoreBefore, '→', result.atsScoreAfter);
    console.log('  - Changes:', result.changes.length);
    console.log('  - Execution Time:', Math.round(result.executionTime / 1000), 'seconds');
    console.log('  - Output LaTeX length:', result.optimizedLatex.length);
    
    if (result.optimizedLatex !== TEST_LATEX) {
      console.log('✅ LaTeX was modified successfully!');
      console.log('📝 First 500 chars of optimized LaTeX:');
      console.log(result.optimizedLatex.substring(0, 500) + '...');
    } else {
      console.log('⚠️ LaTeX was not modified - this might indicate an issue');
    }

    return result;
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run test if called directly
if (typeof window === 'undefined') {
  testAgentOptimization().catch(console.error);
}
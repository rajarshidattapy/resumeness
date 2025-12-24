// Test script for LangChain Resume Agent with LaTeX parsing
// This demonstrates the agentic capabilities with complex LaTeX

import { createResumeAgent } from './resume-agent-langchain';
import { LatexResumeParser, extractTextFromLatex } from './latex-parser';
import { KnowledgeItem } from '../stores/useResumeStore';

// Complex LaTeX resume from user
const complexLatexResume = `\\documentclass[a4paper,10pt]{article}

\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{fontawesome5}
\\usepackage{ragged2e}
\\usepackage[a4paper,top=1.0cm,bottom=1.5cm,left=1.5cm,right=1.5cm]{geometry}  % Reduced top margin

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% SECTION FORMAT
\\titleformat{\\section}{
  \\vspace{-5pt}\\scshape\\raggedright\\large  % Negative vspace to reduce space above
}{}{0em}{}[\\color{black}\\titlerule\\vspace{-2pt}]  % Reduced space after line
\\titlespacing*{\\section}{0pt}{2pt}{2pt}  % Reduce spacing before & after section title

% CUSTOM COMMANDS
\\newcommand{\\cvitem}[1]{\\item\\small{#1}}
\\newcommand{\\cvheading}[4]{
  \\vspace{1pt}\\item
    \\begin{tabular*}{\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\small#3 & \\small #4 \\\\
    \\end{tabular*}\\vspace{-3pt}
}
\\newcommand{\\cvheadingstart}{\\begin{itemize}[leftmargin=0in, label={}, itemsep=1pt, topsep=0pt]}  % Slightly tighter
\\newcommand{\\cvheadingend}{\\end{itemize}}
\\newcommand{\\cvitemstart}{\\begin{itemize}[leftmargin=0.15in, itemsep=0.5pt, parsep=0pt, topsep=0pt]}  % Tighter spacing
\\newcommand{\\cvitemend}{\\end{itemize}}

\\begin{document}

\\begin{center}
  {\\LARGE\\scshape Rajarshi Datta} \\\\
  \\small AI \\& ML Developer \\textbar{} Software Developer \\\\
  \\href{mailto:rayan05rio@gmail.com}{rayan05rio@gmail.com} \\textbar{} +91 9163148385 \\textbar{} \\href{https://rdport.vercel.app}{Portfolio} \\\\
  \\href{https://github.com/rajarshidattapy}{GitHub} \\textbar{}
  \\href{https://www.kaggle.com/rrrrajarshi}{Kaggle} \\textbar{}
  \\href{https://linkedin.com/in/rajarshidatta05}{LinkedIn} \\textbar{}
  \\href{https://leetcode.com/u/rrrrajarshi_/}{Leetcode(1755)} \\textbar{}
    \\href{https://codeforces.com/profile/rajarshidattapy}{Codeforces(1200)} \\textbar{}
\\end{center}
\\section{Technical Skills}
\\vspace{0.5em}
\\cvitemstart
  \\cvitem{\\textbf{Languages:} C, Python, JS, SQL}
  \\cvitem{\\textbf{Web \\& Backend:} React.js, FastAPI, Flask}
  \\cvitem{\\textbf{Databases \\& Cloud:} PostgreSQL, MongoDB, AWS, GCP}
  \\cvitem{\\textbf{Systems \\& Tools:} Git, Docker, Linux, Postman}
  \\cvitem{\\textbf{AI / ML:} Pandas, NumPy, Scikit-learn, TensorFlow, Keras, CNN, Reinforcement Learning, Transformers, Langchain}
\\cvitemend

\\vspace{0.5em}
\\section{Professional Experience}
\\vspace{0.5em}
\\cvheadingstart
  \\cvheading{CodeMate AI - Software Development Engineering Intern}{Remote}{}{Jul 2025 – Sept 2025}
  \\cvitemstart
    \\cvitem{Developed core features of the education platform (edu.codemate.ai) using \\textbf{Node.js and Next.js}, improving API response time by 30\\% through optimized request handling and efficient data pipelines.}
    \\cvitem{Collaborated on the \\textbf{FastAPI-based compiler service}, performing debugging and preparing for a major refactor to improve performance, maintainability, and scalability on cloud infrastructure.}
    \\cvitem{Enhanced educator workflows (assignments, dashboards, performance tracking), focusing on responsive UI/UX and scalable design to support hundreds of concurrent users.}
  \\cvitemend
\\cvheadingend

\\vspace{0.5em}
\\section{Projects}
\\vspace{0.2em}

\\cvheading
    {OSINTHub — AI-Powered Open Source Intelligence Platform \\href{https://github.com/rajarshidattapy/osinthub}{\\textit{(osinthub-delta.vercel.app)}}}
    {}
    {}
    {}
\\cvitemstart
    \\cvitem{Developed an AI-driven \\textbf{OSINT} analysis platform using \\textbf{React, FastAPI, Neo4j}, integrating a graph intelligence layer to map and visualize entity relationships for threat investigation workflows.}
\\cvitemend

\\cvheading
    {Mutual Fund Plan — ML-Driven Portfolio Optimization System \\href{https://github.com/rajarshidattapy/mutualpal}{\\textit{(github.com/rajarshidattapy/mutualpal)}}}
    {}
    {}
    {}
\\cvitemstart
    \\cvitem{Built an AI-powered investment planning platform that identifies optimal long-term stock portfolios by analyzing historical price data, returns, and volatility metrics.}
\\cvitemend

\\cvheading
    {Cardiocare \\href{https://github.com/rajarshidattapy/cardiocare}{\\textit{(github.com/rajarshidattapy/cardiocare)}}}
    {}
    {}
    {}
\\cvitemstart
    \\cvitem{Developed an AI-powered stress monitoring and wellness platform using LSTM-CNN models trained on physiological datasets, connected to an interactive React dashboard via FastAPI to deliver real-time stress insights, alerts, and personalized wellness plans.}
\\cvitemend

\\vspace{0.5em}
\\section{Achievements}
\\vspace{0.5em}
\\cvitemstart
  \\cvitem{\\textbf{1st runner up} – Build for Aptos Hackathon, Bangalore)}
  \\cvitem{\\textbf{Top 10} – The Open Hack, TON Foundation 2025)}
  \\cvitem{\\textbf{Winner} – Hackzion v2 (National Level Hackathon), AMCEC, Bangalore}
  \\cvitem{\\textbf{Design Lead} – Google Developer Groups BIT, Bangalore: Organized amBITion hackathon, led HacktoberFest with 1000+ contributors - leading to 200+ merged PRs.}
  \\cvitem{\\textbf{Technical Team} – TFUG Hyderabad: Maintains deep learning codebase and authors technical content.}
\\cvitemend

\\vspace{0.5em}
\\section{Certifications}
\\vspace{0.5em}
\\cvitemstart
  \\cvitem{Oracle Cloud Infrastructure 2025 Certified Generative AI Professional \\href{https://catalog-education.oracle.com/ords/certview/sharebadge?id=26E880B3744FD28390E455A30FD2BBDCF2A741F8BA948652452C3E26EE479BD0}{\\textit{}}}
  \\cvitem{Data Science, ML, DL \\& NLP Bootcamp – Krish Naik \\href{https://www.udemy.com/certificate/UC-13479037-7c2c-4e7d-8a40-1756656fb4dd/}{\\textit{- Udemy}}}
  \\cvitem{Data Scientist Job Simulation - Llyods Banking Group \\href{https://forage-uploads-prod.s3.amazonaws.com/completion-certificates/Zbnc2o4ok6kD2NEXx/EuvC8GPjkZ6xaiP9p_Zbnc2o4ok6kD2NEXx_ThuG832STSEQxKJKR_1756960810648_completion_certificate.pdf}{\\textit{- Link}}}
  \\cvitem{Intro to AI with Python – Harvard University (CS50AI) \\href{https://drive.google.com/file/d/1vCtYa4bOdkqXpHAZ3BxD36lPbIVvzQWq/view}{\\textit{- Link}}}
  \\cvitem{5-star Python – HackerRank \\href{https://www.hackerrank.com/profile/rayan05rio}{\\textit{- Link}}}
  \\cvitem{Google Data Analytics \\& ML Courses \\href{https://www.coursera.org/}{\\textit{- Link}}}
\\cvitemend

\\vspace{0.5em}
\\section{Education}
\\vspace{0.5em}
\\cvheadingstart
  \\cvheading{Bangalore Institute of Technology}{Bangalore, Karnataka}{B.E. in Information Technology, SGPA – 8.5/10 (upto 4th sem)}{Aug 2023 – Aug 2027}
  \\cvheading{Delhi Public School, Ruby Park}{Kolkata, West Bengal}{Senior Secondary – 87.0\\%}{Jun 2021 – Mar 2023}
\\cvheadingend

\\end{document}`;

async function testLatexParser() {
  console.log('Testing LaTeX Parser with Complex Resume...\n');

  const parser = new LatexResumeParser(complexLatexResume);

  // Test section parsing
  console.log('1. Parsed Sections:');
  const sections = parser.parseSections();
  sections.forEach(section => {
    console.log(`- ${section.name}: ${section.content.length} characters`);
  });
  console.log();

  // Test modifiable sections
  console.log('2. Modifiable Sections:');
  const modifiableSections = parser.getModifiableSections();
  Object.keys(modifiableSections).forEach(name => {
    console.log(`- ${name}`);
  });
  console.log();

  // Test text extraction
  console.log('3. Text Extraction Sample:');
  const extractedText = extractTextFromLatex(complexLatexResume);
  console.log(extractedText.substring(0, 300) + '...');
  console.log();

  console.log('✅ LaTeX Parser Test Complete\n');
}

async function testResumeAgentWithComplexLatex() {
  // Sample knowledge base
  const knowledgeBase: KnowledgeItem[] = [
    {
      id: '1',
      type: 'project',
      title: 'AI Chatbot Platform',
      content: 'Built an intelligent chatbot platform using LangChain and OpenAI, handling complex conversations and tool integrations.',
      tags: ['LangChain', 'OpenAI', 'Python', 'AI', 'Chatbots']
    },
    {
      id: '2',
      type: 'skill',
      title: 'Machine Learning Engineering',
      content: 'Expertise in deploying ML models to production, including MLOps pipelines, model monitoring, and performance optimization.',
      tags: ['MLOps', 'ML Engineering', 'Production ML', 'Model Deployment']
    }
  ];

  // Sample job description for ML Engineer
  const jobDescription = `Senior Machine Learning Engineer

We are seeking a Senior ML Engineer to join our AI team. You will be responsible for:

- Designing and implementing machine learning pipelines
- Deploying ML models to production environments
- Working with large-scale data processing systems
- Collaborating with data scientists and software engineers
- Optimizing model performance and reliability

Required Skills:
- Python, TensorFlow, PyTorch
- MLOps and model deployment
- Cloud platforms (AWS/GCP/Azure)
- Docker, Kubernetes
- SQL and NoSQL databases
- Experience with LangChain or similar AI frameworks

Nice to have:
- FastAPI, Flask for API development
- React for frontend development
- OpenRouter or similar AI API integrations`;

  // Create the agent
  const agent = createResumeAgent('mistral-7b', knowledgeBase, complexLatexResume, jobDescription);

  console.log('Testing Resume Agent with Complex LaTeX...\n');

  // Test job description analysis
  console.log('1. Analyzing job description:');
  const analysis = await agent.analyzeJobDescription(jobDescription);
  console.log(analysis.substring(0, 500) + '...');
  console.log('\n' + '='.repeat(50) + '\n');

  // Test ATS score calculation
  console.log('2. Calculating ATS score:');
  const atsScore = await agent.calculateATSScore();
  console.log(atsScore);
  console.log('\n' + '='.repeat(50) + '\n');

  // Test resume rewriting (this will now handle sections properly)
  console.log('3. Rewriting resume for ML Engineer position:');
  try {
    const rewritten = await agent.rewriteResume(
      'Tailor this resume for the Senior Machine Learning Engineer position. ' +
      'Emphasize ML engineering experience, MLOps skills, and cloud deployment. ' +
      'Highlight relevant projects and downplay less relevant experience.'
    );
    console.log('Resume successfully rewritten!');
    console.log(`Original length: ${complexLatexResume.length} characters`);
    console.log(`Modified length: ${rewritten.length} characters`);

    // Check if LaTeX structure is preserved
    const hasDocumentClass = rewritten.includes('\\documentclass');
    const hasBeginDocument = rewritten.includes('\\begin{document}');
    const hasEndDocument = rewritten.includes('\\end{document}');

    console.log(`LaTeX structure preserved: ${hasDocumentClass && hasBeginDocument && hasEndDocument ? '✅' : '❌'}`);

  } catch (error) {
    console.error('Error rewriting resume:', error);
  }

  console.log('\n✅ Complex LaTeX Resume Agent Test Complete');
}

export { testLatexParser, testResumeAgentWithComplexLatex };
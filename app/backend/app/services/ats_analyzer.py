import re
from typing import List, Tuple
from app.utils.logger import logger

def extract_text_from_latex(latex: str) -> str:
    """Extract plain text from LaTeX"""
    text = latex
    # Remove comments
    text = re.sub(r'%.*', '', text)
    # Remove commands
    text = re.sub(r'\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})*', ' ', text)
    # Remove special chars
    text = re.sub(r'[{}\\]', ' ', text)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()

def extract_keywords(text: str) -> List[str]:
    """Extract technical keywords from text"""
    # Common technical terms pattern
    patterns = [
        r'\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b',  # CamelCase
        r'\b[A-Z]{2,}\b',  # Acronyms
        r'\b(?:python|java|javascript|typescript|react|node|aws|docker|kubernetes|sql|nosql|mongodb|postgresql|redis|graphql|rest|api|ci/cd|git|agile|scrum|machine learning|ai|ml|data science|devops|frontend|backend|full-?stack|microservices|cloud|saas|b2b|b2c)\b'
    ]
    
    keywords = set()
    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        keywords.update(k.lower() for k in matches)
    
    return list(keywords)

def analyze_ats_score(resume_latex: str, job_description: str) -> Tuple[int, List[str], List[str], List[str]]:
    """Analyze ATS compatibility"""
    
    resume_text = extract_text_from_latex(resume_latex)
    jd_text = job_description.lower()
    
    # Extract keywords from JD
    jd_keywords = extract_keywords(job_description)
    
    # Find matched and missing keywords
    matched = []
    missing = []
    
    for keyword in jd_keywords:
        if keyword in resume_text:
            matched.append(keyword)
        else:
            missing.append(keyword)
    
    # Calculate score
    score = int((len(matched) / len(jd_keywords) * 100)) if jd_keywords else 0
    
    # Generate suggestions
    suggestions = []
    if score < 70:
        suggestions.append("Add more relevant keywords from the job description")
    if missing:
        suggestions.append(f"Consider adding: {', '.join(missing[:5])}")
    if score < 50:
        suggestions.append("Tailor your experience section to match job requirements")
    
    logger.info(f"ATS Score: {score}% ({len(matched)}/{len(jd_keywords)} keywords matched)")
    
    return score, matched, missing, suggestions

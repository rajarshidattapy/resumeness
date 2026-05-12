from openai import AsyncOpenAI
import os
import json
from app.utils.logger import logger

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EXTRACT_PROMPT = """Extract key information from this job description.

Return ONLY a JSON object with this exact structure:
{
  "role": "job title",
  "skills": ["skill1", "skill2"],
  "keywords": ["keyword1", "keyword2"],
  "priority": ["priority1", "priority2"]
}

Job Description:
{job_description}

Focus on:
- Technical skills and tools
- Domain-specific keywords
- Core responsibilities
- Required qualifications

Return valid JSON only, no markdown, no explanation."""

async def extract_job_requirements(job_description: str) -> dict:
    """Extract structured requirements from job description"""
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a job description analyzer. Return only valid JSON."},
                {"role": "user", "content": EXTRACT_PROMPT.format(job_description=job_description)}
            ],
            temperature=0.3
        )
        
        content = response.choices[0].message.content.strip()
        
        # Remove markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
            content = content.strip()
        
        result = json.loads(content)
        logger.info(f"Extracted job requirements: {result.get('role', 'Unknown')}")
        return result
        
    except Exception as e:
        logger.error(f"Error extracting job requirements: {e}")
        # Fallback to basic extraction
        return {
            "role": "Software Engineer",
            "skills": [],
            "keywords": [],
            "priority": []
        }

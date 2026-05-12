import re
from typing import List, Dict
from app.utils.logger import logger


def extract_resume_bullets(latex: str) -> List[Dict[str, str]]:
    """Extract \\item bullet text with their section context."""
    results = []
    section_pattern = re.compile(
        r'\\(?:section|subsection|resumeSection)\*?\{([^}]+)\}(.*?)(?=\\(?:section|subsection|resumeSection)|\Z)',
        re.DOTALL,
    )
    item_pattern = re.compile(
        r'\\item\s+(.*?)(?=\\item|\\end\{itemize\}|\\end\{enumerate\}|\Z)',
        re.DOTALL,
    )

    for section_name, section_body in section_pattern.findall(latex):
        for raw_item in item_pattern.findall(section_body):
            stripped = raw_item.strip()
            if len(stripped) > 15:
                display = re.sub(r'\\[a-zA-Z]+(?:\{[^}]*\}|\[[^\]]*\])*', ' ', stripped)
                display = re.sub(r'\s+', ' ', display).strip()
                results.append({
                    'section': section_name.strip(),
                    'raw': stripped,
                    'display': display,
                })

    if not results:
        # Fallback: no section markers, just grab all items
        for raw_item in item_pattern.findall(latex):
            stripped = raw_item.strip()
            if len(stripped) > 15:
                display = re.sub(r'\\[a-zA-Z]+(?:\{[^}]*\}|\[[^\]]*\])*', ' ', stripped)
                display = re.sub(r'\s+', ' ', display).strip()
                results.append({'section': 'General', 'raw': stripped, 'display': display})

    return results


def apply_patch(latex: str, old_text: str, new_text: str) -> tuple[str, bool]:
    """Try to replace old_text with new_text in latex. Returns (result, success)."""
    if not old_text or not new_text or old_text == new_text:
        return latex, False

    # Direct match (most common — raw bullet text is verbatim in LaTeX)
    if old_text in latex:
        return latex.replace(old_text, new_text, 1), True

    # Trailing-whitespace-stripped match (handles indentation capture)
    stripped = old_text.rstrip()
    if stripped and stripped in latex:
        return latex.replace(stripped, new_text, 1), True

    # Normalised-whitespace fallback
    normalized_old = re.sub(r'\s+', ' ', old_text).strip()
    if normalized_old in latex:
        return latex.replace(normalized_old, new_text, 1), True

    logger.warning(f"Patch target not found: {old_text[:80]!r}")
    return latex, False


def apply_patches(latex: str, patches: List[Dict]) -> tuple[str, int]:
    """Apply a list of patches to LaTeX. Returns (updated_latex, applied_count)."""
    result = latex
    applied = 0
    for patch in patches:
        old = patch.get('old', '')
        new = patch.get('new', '')
        updated, success = apply_patch(result, old, new)
        if success:
            result = updated
            applied += 1
    logger.info(f"Applied {applied}/{len(patches)} patches to LaTeX")
    return result, applied

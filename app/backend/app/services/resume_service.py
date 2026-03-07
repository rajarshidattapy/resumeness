"""Resume service — LaTeX manipulation and compilation helpers."""

from __future__ import annotations

import re


class ResumeService:
    """Utilities for resume LaTeX manipulation."""

    @staticmethod
    def validate_latex(content: str) -> tuple[bool, str | None]:
        """Basic LaTeX validation."""
        if not content or not content.strip():
            return False, "LaTeX content is empty"
        if "\\documentclass" not in content:
            return False, "Missing \\documentclass"
        if "\\begin{document}" not in content:
            return False, "Missing \\begin{document}"
        if "\\end{document}" not in content:
            return False, "Missing \\end{document}"

        # Check balanced braces (excluding escaped braces)
        opens = len(re.findall(r"(?<!\\)\{", content))
        closes = len(re.findall(r"(?<!\\)\}", content))
        if opens != closes:
            return False, f"Unbalanced braces: {opens} opening, {closes} closing"

        return True, None

    @staticmethod
    def extract_sections(latex: str) -> dict[str, str]:
        """Extract named sections from LaTeX."""
        sections: dict[str, str] = {}
        pattern = r"\\section\*?\{([^}]+)\}([\s\S]*?)(?=\\section|\\end\{document\})"
        for match in re.finditer(pattern, latex):
            sections[match.group(1)] = match.group(2).strip()
        return sections

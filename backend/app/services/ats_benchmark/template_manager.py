from pathlib import Path
from jinja2 import Environment, FileSystemLoader

_TEMPLATE_DIR = Path(__file__).parent / "templates"

_env = Environment(loader=FileSystemLoader(str(_TEMPLATE_DIR)), trim_blocks=True, lstrip_blocks=True)


def render_template(name: str, **kwargs) -> str:
    """Render one of the .jinja templates in ats_benchmark/templates/."""
    return _env.get_template(name).render(**kwargs)

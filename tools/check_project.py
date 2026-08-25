#!/usr/bin/env python3
"""Check local references, HTML IDs, CSS braces, and Python syntax."""

from __future__ import annotations

import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from typing import Optional
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
HTML_FILES = sorted(ROOT.glob("*.html"))
REFERENCE_ATTRIBUTES = {"href", "src"}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.references: list[str] = []

    def handle_starttag(self, _tag: str, attrs: list[tuple[str, Optional[str]]]) -> None:
        for name, value in attrs:
            if not value:
                continue
            if name == "id":
                self.ids.append(value)
            elif name in REFERENCE_ATTRIBUTES:
                self.references.append(value)


def local_path(reference: str) -> Optional[Path]:
    parsed = urlsplit(reference)
    if parsed.scheme or parsed.netloc or reference.startswith(("#", "mailto:", "tel:")):
        return None
    return ROOT / parsed.path.lstrip("/")


def check_html(errors: list[str]) -> None:
    for page in HTML_FILES:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))

        duplicates = sorted({item for item in parser.ids if parser.ids.count(item) > 1})
        if duplicates:
            errors.append(f"{page.name}: duplicate IDs: {', '.join(duplicates)}")

        for reference in parser.references:
            path = local_path(reference)
            if path is not None and not path.exists():
                errors.append(f"{page.name}: missing {reference}")


def check_script_assets(errors: list[str]) -> None:
    pattern = re.compile(r'["\'](images/[^"\']+)["\']')
    for script in sorted((ROOT / "js").glob("*.js")):
        for reference in pattern.findall(script.read_text(encoding="utf-8")):
            if not (ROOT / reference).exists():
                errors.append(f"{script.relative_to(ROOT)}: missing {reference}")


def check_css(errors: list[str]) -> None:
    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    clean = re.sub(r"/\*.*?\*/", "", css, flags=re.DOTALL)
    clean = re.sub(r'"(?:\\.|[^"\\])*"|\'(?:\\.|[^\'\\])*\'', '""', clean)

    depth = 0
    for character in clean:
        if character == "{":
            depth += 1
        elif character == "}":
            depth -= 1
            if depth < 0:
                errors.append("css/style.css: unexpected closing brace")
                return
    if depth:
        errors.append(f"css/style.css: {depth} unclosed block(s)")


def check_python(errors: list[str]) -> None:
    try:
        source = (ROOT / "server.py").read_text(encoding="utf-8")
        compile(source, "server.py", "exec")
    except SyntaxError as error:
        errors.append(str(error))


def main() -> int:
    errors: list[str] = []
    check_html(errors)
    check_script_assets(errors)
    check_css(errors)
    check_python(errors)

    if errors:
        print("Project check failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Project check passed ({len(HTML_FILES)} HTML pages checked).")
    return 0


if __name__ == "__main__":
    sys.exit(main())

from __future__ import annotations

import re
from pathlib import Path


FORBIDDEN_PATTERNS = [
    re.compile(r"\.objects\."),
]


def _iter_view_files(project_root: Path):
    backend_root = project_root / "backend" / "apps"
    yield from backend_root.glob("**/views.py")
    yield from backend_root.glob("**/views/**/*.py")


def test_views_have_no_direct_orm_access():
    project_root = Path(__file__).resolve().parents[2]

    violations: list[str] = []

    for file_path in _iter_view_files(project_root):
        text = file_path.read_text(encoding="utf-8", errors="ignore")
        lines = text.splitlines()

        for index, line in enumerate(lines, start=1):
            if line.strip().startswith("#"):
                continue

            for pattern in FORBIDDEN_PATTERNS:
                if pattern.search(line):
                    relative_path = file_path.relative_to(project_root).as_posix()
                    violations.append(f"{relative_path}:{index}: {line.strip()}")

    assert not violations, (
        "Se detectó acceso ORM directo en views. "
        "Debe delegarse en services.\n" + "\n".join(violations)
    )

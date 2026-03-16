#!/usr/bin/env python3
"""Fail CI when changes violate source-of-truth policy in mirrored repositories.

Policy modes:
- root (default): root folder is source of truth; nested mirror changes are blocked.
- nested: nested folder is source of truth; root-level changes outside nested prefix are blocked.

Can be bypassed intentionally with ALLOW_NESTED_MIRROR_CHANGES=true.
"""

from __future__ import annotations

from pathlib import Path
import argparse
import os
import subprocess
import sys


REPO_ROOT = Path(__file__).resolve().parents[1]
NESTED_PREFIX = 'Aplicacion_Colegio/'


def _run_git_diff(base: str | None, head: str | None) -> list[str]:
    if base and head:
        cmd = ['git', 'diff', '--name-only', base, head]
    else:
        # Local fallback: inspect current working tree changes.
        cmd = ['git', 'diff', '--name-only']

    proc = subprocess.run(cmd, cwd=REPO_ROOT, capture_output=True, text=True, check=False)
    if proc.returncode != 0:
        stderr = (proc.stderr or '').strip()
        raise RuntimeError(f'git diff failed: {stderr or "unknown error"}')

    files = [line.strip().replace('\\', '/') for line in (proc.stdout or '').splitlines() if line.strip()]
    return files


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--base', default=None, help='Base git ref/sha')
    parser.add_argument('--head', default=None, help='Head git ref/sha')
    args = parser.parse_args()

    allow_nested = os.getenv('ALLOW_NESTED_MIRROR_CHANGES', 'false').strip().lower() == 'true'
    source_of_truth = os.getenv('SOURCE_OF_TRUTH', 'root').strip().lower()

    try:
        changed = _run_git_diff(args.base, args.head)
    except RuntimeError as exc:
        print(str(exc))
        return 1

    nested_changed = [path for path in changed if path.startswith(NESTED_PREFIX)]

    if source_of_truth == 'root':
        if nested_changed and not allow_nested:
            print('Nested mirror change guard failed.')
            print('Source of truth is root; nested mirror changes are blocked by default.')
            print('Set ALLOW_NESTED_MIRROR_CHANGES=true only for intentional mirror sync operations.')
            for path in nested_changed:
                print(f' - {path}')
            return 1

        if nested_changed and allow_nested:
            print('Nested mirror changes detected but allowed by override.')
            for path in nested_changed:
                print(f' - {path}')
            return 0

        print('Nested mirror change guard passed.')
        return 0

    if source_of_truth == 'nested':
        outer_changed = [path for path in changed if not path.startswith(NESTED_PREFIX)]
        if outer_changed and not allow_nested:
            print('Nested mirror change guard failed.')
            print('Source of truth is nested; root-level changes outside nested prefix are blocked.')
            print('Set ALLOW_NESTED_MIRROR_CHANGES=true only for intentional reverse sync operations.')
            for path in outer_changed:
                print(f' - {path}')
            return 1

        if outer_changed and allow_nested:
            print('Root-level changes detected but allowed by override.')
            for path in outer_changed:
                print(f' - {path}')
            return 0

        print('Nested mirror change guard passed.')
        return 0

    print("Invalid SOURCE_OF_TRUTH. Use 'root' or 'nested'.")
    return 1


if __name__ == '__main__':
    raise SystemExit(main())

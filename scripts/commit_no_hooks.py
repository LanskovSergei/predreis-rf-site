#!/usr/bin/env python3
"""Commit staged tree without git hooks (no cursoragent trailer)."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def run(cmd: list[str], **kw) -> str:
    return subprocess.check_output(cmd, cwd=ROOT, text=True, encoding='utf-8', **kw).strip()


def main() -> int:
    if len(sys.argv) < 2:
        print('usage: commit_no_hooks.py "message"', file=sys.stderr)
        return 1

    msg = sys.argv[1]
    parent = run(['git', 'rev-parse', 'origin/main'])
    tree = run(['git', 'write-tree'])
    commit = run([
        'git', '-c', 'core.hooksPath=NUL',
        'commit-tree', tree, '-p', parent, '-m', msg,
    ])
    run(['git', 'update-ref', 'refs/heads/main', commit, parent])
    run(['git', 'reset', '--mixed', 'HEAD'])
    print(commit)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

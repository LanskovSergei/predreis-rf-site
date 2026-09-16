#!/usr/bin/env python3
"""Сжимает JSON-раскладку бланка: убирает полностью пустые строки и столбцы."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / '_epl_calc_src' / 'templates'


def compact(data: dict) -> dict:
    rows = data['rows']
    merges = data.get('merges', [])

    nrows = len(rows)
    ncols = max(len(r) for r in rows) if rows else 0
    for r in rows:
        while len(r) < ncols:
            r.append('')

    keep_col = [any(rows[r][c].strip() for r in range(nrows)) for c in range(ncols)]
    col_map = {old: new for new, old in enumerate(c for c, k in enumerate(keep_col) if k)}

    trimmed = [[rows[r][c] for c in range(ncols) if keep_col[c]] for r in range(nrows)]

    # Строки не удаляем — на обороте бланка много пустых строк таблицы поездок.
    new_merges = []
    for rlo, rhi, clo, chi in merges:
        if not all(c in col_map for c in range(clo, chi)):
            continue
        new_merges.append((rlo, rhi, col_map[clo], col_map[chi - 1] + 1))

    return {
        'nrows': len(trimmed),
        'ncols': len(trimmed[0]) if trimmed else 0,
        'rows': trimmed,
        'merges': new_merges,
    }


def main() -> int:
    names = ['form3-1', 'form3-2', 'form4c-1', 'form4c-2']
    for name in names:
        src = ROOT / f'{name}.json'
        if not src.exists():
            print('skip', name)
            continue
        data = json.loads(src.read_text(encoding='utf-8'))
        out = compact(data)
        dst = ROOT / f'{name}.compact.json'
        dst.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')
        print(name, data['nrows'], 'x', data['ncols'], '->', out['nrows'], 'x', out['ncols'])
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

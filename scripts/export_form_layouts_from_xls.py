#!/usr/bin/env python3
"""Экспорт раскладки бланков из XLS (шаблоны Госкомстата) в JSON для PDF."""
import json
import sys
from pathlib import Path

import xlrd

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / '_epl_calc_src' / 'templates'


def sheet_to_layout(path: Path, sheet_idx: int) -> dict:
    wb = xlrd.open_workbook(str(path), formatting_info=True)
    sh = wb.sheet_by_index(sheet_idx)
    rows = []
    for r in range(sh.nrows):
        row = []
        for c in range(sh.ncols):
            v = sh.cell_value(r, c)
            if isinstance(v, float) and v == int(v):
                v = int(v)
            row.append('' if v is None else str(v).strip())
        rows.append(row)
    merges = [[rlo, rhi, clo, chi] for rlo, rhi, clo, chi in sh.merged_cells]
    return {'nrows': sh.nrows, 'ncols': sh.ncols, 'rows': rows, 'merges': merges}


def main() -> int:
    pairs = [
        ('putevoi-list-f3-2.xls', 0, 'form3-1.json'),
        ('putevoi-list-f3-2.xls', 1, 'form3-2.json'),
        ('putevoy_list_gruzovogo_avtomobilya_forma_4-c.xls', 0, 'form4c-1.json'),
        ('putevoy_list_gruzovogo_avtomobilya_forma_4-c.xls', 1, 'form4c-2.json'),
    ]
    for xls_name, si, out_name in pairs:
        xls = TEMPLATES / xls_name
        if not xls.exists():
            print('missing', xls, file=sys.stderr)
            return 1
        data = sheet_to_layout(xls, si)
        (TEMPLATES / out_name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
        print('wrote', out_name, data['nrows'], 'x', data['ncols'])
    print('run compact_form_layout.py next')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

#!/usr/bin/env python3
"""PNG-фоны для PDF из эталонных файлов в папке «Загрузки»."""
from pathlib import Path

import fitz

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '_epl_calc_src' / 'public' / 'templates'
DOWNLOADS = Path(r'D:/загрузки')


def render_clip(page, clip, name: str, target_w: int) -> None:
    scale = target_w / clip.width
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)
    OUT.mkdir(parents=True, exist_ok=True)
    pix.save(str(OUT / name))
    print('wrote', name, pix.width, pix.height)


def main() -> int:
    f3 = DOWNLOADS / 'putevoi-list-f3 (2).pdf'
    if not f3.exists():
        print('missing', f3)
        return 1
    doc = fitz.open(f3)
    render_clip(doc[0], fitz.Rect(248, 86, 588, 528), 'form3-front.png', 794)
    render_clip(doc[2], fitz.Rect(260, 50, 582, 538), 'form3-back.png', 794)
    doc.close()

    f4_list = list(DOWNLOADS.glob('putevoy_list_gruzovogo_avtomobilya._forma_4-c (1)*.pdf'))
    if not f4_list:
        print('missing form 4-c pdf in', DOWNLOADS)
        return 1
    doc4 = fitz.open(f4_list[0])
    render_clip(doc4[0], doc4[0].rect, 'form4c-front.png', 1123)
    doc4.close()
    return 0


if __name__ == '__main__':
    raise SystemExit(main())

"""図表が必要な問題(hasFigure: true)を、ページ画像から問題ごとに切り出して public/figures/ に保存する。
問題データ(src/data/exams/*.json)の該当問題に figure フィールド(画像のパス)を書き込む。

使い方: python3 scripts/crop_figures.py [回ID ...]   (省略時は全部の回)
前提: npm run data:pages で data-src/pages/{回ID}/pg-NN.png ができていること

仕組み:
- ページ画像の文字を行に分け、各行の左端の位置を調べる。「問N」の見出し行は一番左(余白ぎりぎり)から
  始まり、選択肢や本文の続きは字下げされているので、左端の位置で見出し行を見分ける。
- データの pdfPage から「そのページで何番目に始まる問題か」が分かるので、該当の見出しから
  次の見出しまでを切り出す。問題が次のページに続いている場合は、次ページの先頭部分もつなげる。
- 見出しの数とデータの問題数が合わないページは、安全のためページ全体を使い、警告を出す。
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / 'data-src' / 'pages'
EXAMS = ROOT / 'src' / 'data' / 'exams'
OUT = ROOT / 'public' / 'figures'

DARK = 150  # これより暗い画素を文字とみなす
LINE_GAP = 8  # この行数以内の空白は同じ行のつながりとみなす
HEADER_TOL = 12  # 見出し行とみなす左端位置の許容幅(px)
FOOTER = 0.94  # ページ下部(ページ番号)を除く位置
MIN_WIDTH = 100  # これより幅の狭いかたまり(製本用の印など)は見出し・横幅の判定に使わない


def load(exam: str, page: int) -> np.ndarray | None:
    path = PAGES / exam / f'pg-{page:02d}.png'
    if not path.exists():
        return None
    img = np.array(Image.open(path).convert('L'))
    # ページの左右端にある製本用の印を消す(本文はページ幅の8%より内側にある)
    edge = int(img.shape[1] * 0.05)
    img[:, :edge] = 255
    img[:, -edge:] = 255
    return img


def lines_of(img: np.ndarray):
    """文字のある行のかたまり [(上端, 下端, 左端, 右端)] を返す"""
    h = int(img.shape[0] * FOOTER)
    dark = img[:h] < DARK
    rows = np.where(dark.any(axis=1))[0]
    if len(rows) == 0:
        return []
    groups = []
    start = prev = rows[0]
    for r in rows[1:]:
        if r - prev > LINE_GAP:
            groups.append((start, prev))
            start = r
        prev = r
    groups.append((start, prev))
    result = []
    for top, bottom in groups:
        cols = np.where(dark[top : bottom + 1].any(axis=0))[0]
        result.append((int(top), int(bottom), int(cols[0]), int(cols[-1])))
    return result


def wide(lines):
    return [l for l in lines if l[3] - l[2] >= MIN_WIDTH]


def headers_of(lines):
    """見出し行(一番左から始まる行)の上端のリスト"""
    w = wide(lines)
    if not w:
        return []
    margin = min(left for _, _, left, _ in w)
    return [top for top, _, left, _ in w if left - margin <= HEADER_TOL]


def content_bottom(lines):
    return max(b for _, b, _, _ in lines) if lines else 0


def content_x(lines):
    """横方向の範囲(製本用の印などを除く)"""
    w = wide(lines) or lines
    return min(l[2] for l in w), max(l[3] for l in w)


def crop(img: np.ndarray, lines, top: int, bottom: int) -> np.ndarray:
    """縦は top〜bottom、横はその範囲にある(幅のある)行の左右端で切り出す"""
    inside = [l for l in lines if l[0] >= top - 1 and l[1] <= bottom + 1] or lines
    left, right = content_x(inside)
    pad = 12
    return img[max(0, top - pad) : min(img.shape[0], bottom + pad), max(0, left - pad) : min(img.shape[1], right + pad)]


def figure_for(exam: str, q, by_page) -> tuple[np.ndarray | None, str | None]:
    page = q['pdfPage']
    img = load(exam, page)
    if img is None:
        return None, f'ページ画像がありません({page})'
    lines = lines_of(img)
    heads = headers_of(lines)
    starting = sorted(by_page.get(page, []))  # このページで始まる問番号
    warn = None
    if len(heads) != len(starting):
        warn = f'{page}ページ: 見出し{len(heads)}個 / データ上の問題{len(starting)}問 → ページ全体を使用'
        parts = [crop(img, lines, lines[0][0] if lines else 0, content_bottom(lines))]
        last_on_page = q['no'] == max(starting)
    else:
        k = starting.index(q['no'])
        top = heads[k]
        # 終わりは「次の見出しの直前の行」の下端(余白を足しても次の問題に食い込まないように)
        bottom = content_bottom([l for l in lines if l[0] < heads[k + 1]]) if k + 1 < len(heads) else content_bottom(lines)
        parts = [crop(img, lines, top, bottom)]
        last_on_page = k + 1 == len(heads)

    # 次のページに続いているか(次の問題が次ページ以降で始まり、次ページの先頭が見出しでない)
    if last_on_page:
        nxt = load(exam, page + 1)
        if nxt is not None:
            nlines = lines_of(nxt)
            nheads = headers_of(nlines)
            first = wide(nlines)[0][0] if wide(nlines) else None
            if first is not None and (not nheads or nheads[0] > first + 1):
                end = content_bottom([l for l in nlines if l[0] < nheads[0]]) if nheads else content_bottom(nlines)
                parts.append(crop(nxt, nlines, first, end))

    width = max(p.shape[1] for p in parts)
    stacked = np.vstack([np.pad(p, ((0, 0), (0, width - p.shape[1])), constant_values=255) for p in parts])
    return stacked, warn


def main():
    targets = sys.argv[1:] or sorted(p.stem for p in EXAMS.glob('*.json'))
    OUT.mkdir(parents=True, exist_ok=True)
    for exam in targets:
        path = EXAMS / f'{exam}.json'
        data = json.loads(path.read_text(encoding='utf-8'))
        by_page = {}
        for q in data['questions']:
            by_page.setdefault(q['pdfPage'], []).append(q['no'])
        changed = 0
        for q in data['questions']:
            if not q.get('hasFigure'):
                continue
            arr, warn = figure_for(exam, q, by_page)
            if warn:
                print(f'  要確認 {q["id"]}: {warn}')
            if arr is None:
                continue
            # 150dpi → 横幅を最大1000pxに縮小し、16階調にして軽くする
            im = Image.fromarray(arr)
            if im.width > 1000:
                im = im.resize((1000, round(im.height * 1000 / im.width)), Image.LANCZOS)
            im = im.quantize(colors=16)
            name = f'{q["id"]}.png'
            im.save(OUT / name, optimize=True)
            q['figure'] = f'figures/{name}'
            changed += 1
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{exam}: 図表問題 {changed}問を切り出し')


if __name__ == '__main__':
    main()

// 問題PDFをページ画像(PNG)にする。PDFの保護は解除しない(閲覧・印刷として画像化するだけ)
// 使い方: node scripts/render-pages.mjs 2025a 2025h
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { SRC_DIR } from './lib.mjs';

for (const id of process.argv.slice(2)) {
  const pdf = join(SRC_DIR, 'pdf', `${id}_qs.pdf`);
  const outDir = join(SRC_DIR, 'pages', id);
  mkdirSync(outDir, { recursive: true });
  execFileSync('pdftoppm', ['-r', '150', '-png', pdf, join(outDir, 'pg')]);
  console.log(`${id}: ${outDir} に出力`);
}

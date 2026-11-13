// IPAの年度別ページから応用情報の午前(科目A)の問題PDF・解答PDFを探してダウンロードする
// 使い方: node scripts/fetch-pdfs.mjs 2025a 2025h
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { IPA, SRC_DIR, parseExamId, yearPageSlug, readJson, writeJson } from './lib.mjs';

const ids = process.argv.slice(2);
if (ids.length === 0) {
  console.error('回のIDを指定してください(例: 2025a 2025h)');
  process.exit(1);
}

const sourcesPath = join(SRC_DIR, 'sources.json');
const sources = readJson(sourcesPath, {});
mkdirSync(join(SRC_DIR, 'pdf'), { recursive: true });

for (const id of ids) {
  const { year, season } = parseExamId(id);
  const pageUrl = `${IPA}/shiken/mondai-kaiotu/${yearPageSlug(year)}.html`;
  const html = await (await fetch(pageUrl)).text();

  // 例: /shiken/mondai-kaiotu/xxx-att/2025r07a_ap_am_qs.pdf
  const re = new RegExp(`href="([^"]*/${year}[hr]\\d{2}${season}_ap_am_(qs|ans)\\.pdf)"`, 'g');
  const found = {};
  for (const m of html.matchAll(re)) found[m[2]] = IPA + m[1];
  if (!found.qs || !found.ans) {
    console.error(`${id}: PDFのリンクが見つかりません(${pageUrl})`);
    process.exitCode = 1;
    continue;
  }

  for (const kind of ['qs', 'ans']) {
    const dest = join(SRC_DIR, 'pdf', `${id}_${kind}.pdf`);
    if (existsSync(dest)) continue;
    const res = await fetch(found[kind]);
    if (!res.ok) throw new Error(`${found[kind]} の取得に失敗: ${res.status}`);
    writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`保存: ${dest}`);
  }
  sources[id] = { qsUrl: found.qs, ansUrl: found.ans };
}

writeJson(sourcesPath, sources);
console.log('完了');

// 書き写し結果(data-src/transcribed/{回ID}/part-*.json)と、解答PDFから取った正解を結合して
// アプリが読む問題データ src/data/exams/{回ID}.json を作る。
// 使い方: node scripts/build-exam.mjs 2025a
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, SRC_DIR, OUT_DIR, ANSWERS_DIR, minorToMajor, readJson, writeJson } from './lib.mjs';

const pad2 = (n) => String(n).padStart(2, '0');
// 用語名の表記ゆれをそろえる対応表
const aliases = readJson(join(ROOT, 'data', 'term-aliases.json'), {});

for (const id of process.argv.slice(2)) {
  const answers = readJson(join(ANSWERS_DIR, `${id}.json`));
  const sources = readJson(join(SRC_DIR, 'sources.json'), {});
  if (!answers) throw new Error(`${id}: 先に extract-answers を実行してください`);
  if (!sources[id]) throw new Error(`${id}: 先に fetch-pdfs を実行してください`);

  const dir = join(SRC_DIR, 'transcribed', id);
  const parts = readdirSync(dir).filter((f) => /^part-.*\.json$/.test(f)).sort();
  const raw = parts.flatMap((f) => readJson(join(dir, f)));

  const warnings = [];
  const seen = new Set();
  const questions = [];
  for (const t of raw.sort((a, b) => a.no - b.no)) {
    if (seen.has(t.no)) {
      warnings.push(`問${t.no}: 重複しているので2つ目以降を無視`);
      continue;
    }
    seen.add(t.no);

    const key = answers.answers[t.no];
    if (!key) {
      warnings.push(`問${t.no}: 解答PDFに見当たりません`);
      continue;
    }
    if (key.answer < 0) {
      warnings.push(`問${t.no}: 正解が1つに定まらない問題("${key.raw}")なので除外`);
      continue;
    }
    const major = minorToMajor.get(t.minor);

    questions.push({
      id: `${id}-${pad2(t.no)}`,
      exam: id,
      no: t.no,
      source: `${answers.label} 応用情報技術者試験 午前 問${t.no}`,
      pdfUrl: sources[id].qsUrl,
      pdfPage: t.pdfPage,
      field: key.field,
      major: major ? major.name : null,
      minor: t.minor,
      hasFigure: Boolean(t.hasFigure),
      // 図表問題の切り出し画像(scripts/crop_figures.py で作成済みなら付ける)
      ...(t.hasFigure && existsSync(join(ROOT, 'public', 'figures', `${id}-${pad2(t.no)}.png`))
        ? { figure: `figures/${id}-${pad2(t.no)}.png` }
        : {}),
      modified: Boolean(t.modified),
      stem: t.stem,
      choices: t.choices,
      answer: key.answer, // 正解は必ず解答PDF由来
      explanation: t.explanation,
      whyWrong: t.whyWrong,
      analogy: t.analogy,
      terms: (t.terms ?? []).map((term) => ({ ...term, name: aliases[term.name] ?? term.name })),
    });
  }

  const missing = [];
  for (let n = 1; n <= 80; n++) if (!seen.has(n)) missing.push(n);
  if (missing.length) warnings.push(`未作成の問題: ${missing.join(', ')}`);

  writeJson(join(OUT_DIR, 'exams', `${id}.json`), { id, label: answers.label, questions });

  const figures = questions.filter((q) => q.hasFigure).map((q) => `${q.no}${q.figure ? '' : '(画像なし)'}`);
  console.log(`${id}: ${questions.length}問を出力(図表あり: ${figures.join(', ') || 'なし'})`);
  if (figures.some((f) => f.includes('画像なし'))) console.log(`  → python3 scripts/crop_figures.py ${id} で図表の画像を切り出してください`);
  for (const w of warnings) console.log(`  要確認: ${w}`);
}

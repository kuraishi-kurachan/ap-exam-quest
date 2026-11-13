// 問題データの検査。1つでも問題があれば終了コード1で終わる
// 使い方: node scripts/validate.mjs
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { SRC_DIR, OUT_DIR, KANA, syllabus, minorToMajor, readJson } from './lib.mjs';

const errors = [];
const err = (q, msg) => errors.push(`${q?.id ?? '?'}: ${msg}`);
const nonEmpty = (s) => typeof s === 'string' && s.trim().length > 0;

const examDir = join(OUT_DIR, 'exams');
const files = existsSync(examDir) ? readdirSync(examDir).filter((f) => f.endsWith('.json')) : [];
const allIds = new Set();
let total = 0;

for (const f of files) {
  const exam = readJson(join(examDir, f));
  const key = readJson(join(SRC_DIR, 'answers', `${exam.id}.json`)); // 手元にあれば正解を突き合わせる
  if (`${exam.id}.json` !== f) errors.push(`${f}: ファイル名と回IDが合いません`);
  if (exam.questions.length !== 80) console.log(`注意: ${exam.id} は ${exam.questions.length}問(80問ではない)`);

  for (const q of exam.questions) {
    total++;
    if (allIds.has(q.id)) err(q, 'IDが重複');
    allIds.add(q.id);

    for (const k of ['source', 'pdfUrl', 'stem', 'explanation', 'analogy', 'minor', 'major']) {
      if (!nonEmpty(q[k])) err(q, `${k} が空`);
    }
    if (!Number.isInteger(q.pdfPage) || q.pdfPage < 1) err(q, 'pdfPage が不正');
    if (!Array.isArray(q.choices) || q.choices.length !== 4 || !q.choices.every(nonEmpty)) err(q, '選択肢が4つそろっていない');
    if (!Array.isArray(q.whyWrong) || q.whyWrong.length !== 4 || !q.whyWrong.every(nonEmpty)) err(q, 'whyWrong が4つそろっていない');
    if (![0, 1, 2, 3].includes(q.answer)) err(q, `正解が不正(${q.answer})`);
    if (!Array.isArray(q.terms) || q.terms.length < 1 || q.terms.length > 3) err(q, 'terms は1〜3個');
    for (const t of q.terms ?? []) if (!nonEmpty(t.name) || !nonEmpty(t.definition)) err(q, '用語の名前か定義が空');

    const major = minorToMajor.get(q.minor);
    if (!major) err(q, `中分類が一覧にない(${q.minor})`);
    else {
      if (major.name !== q.major) err(q, `大分類と中分類が合わない(${q.major} / ${q.minor})`);
      if (major.field !== q.field) err(q, `分野(${q.field})と中分類(${q.minor})が合わない`);
    }
    if (/^問\s*\d+/.test(q.stem)) err(q, '問題文の先頭に問番号が入っている');
    if (q.choices?.some((c) => /^[アイウエ][\s　]/.test(c))) err(q, '選択肢の先頭に記号が入っている');

    if (key) {
      const k = key.answers[q.no];
      if (!k || k.answer !== q.answer) err(q, `正解が解答PDFと一致しない(データ: ${KANA[q.answer]}, 解答PDF: ${k?.raw})`);
      if (k && k.field !== q.field) err(q, '分野が解答PDFと一致しない');
    }
  }
}

console.log(`検査した回: ${files.length} / 問題数: ${total} / 中分類の数: ${syllabus.majors.flatMap((m) => m.minors).length}`);
if (errors.length) {
  console.log(`エラー ${errors.length}件`);
  for (const e of errors) console.log('  ' + e);
  process.exit(1);
}
console.log('OK');

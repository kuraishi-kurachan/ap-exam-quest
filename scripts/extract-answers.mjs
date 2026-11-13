// 解答PDF(テキストが取れる)から 問番号・正解・分野 を機械的に取り出す
// 使い方: node scripts/extract-answers.mjs 2025a 2025h
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { SRC_DIR, KANA, writeJson } from './lib.mjs';

const FIELD = { 'Ｔ': 'T', 'Ｍ': 'M', 'Ｓ': 'S', T: 'T', M: 'M', S: 'S' };

for (const id of process.argv.slice(2)) {
  const pdf = join(SRC_DIR, 'pdf', `${id}_ans.pdf`);
  const text = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' });

  // 1行目の例: "令和 7 年度   秋期   応用情報技術者試験      解答例"
  const head = /(令和|平成)\s*(元|\d+)\s*年度\s*(春期|秋期|\S+?)\s+応用情報技術者試験/.exec(text);
  if (!head) throw new Error(`${id}: 見出し(年度・期)が読めません`);
  const label = `${head[1]}${head[2]}年度 ${head[3]}`;

  // 午前試験の表だけを対象にする(午後の解答が同じPDFにある年に備える)
  const amPart = text.split(/午後/)[0];
  const answers = {};
  const problems = [];
  for (const m of amPart.matchAll(/問\s*(\d+)\s+(\S+)\s+([ＴＭＳTMS])/g)) {
    const no = Number(m[1]);
    const raw = m[2];
    const idx = KANA.indexOf(raw);
    if (idx < 0) problems.push(`問${no}: 正解が1つに定まりません("${raw}")`);
    answers[no] = { answer: idx, raw, field: FIELD[m[3]] };
  }

  const count = Object.keys(answers).length;
  if (count !== 80) problems.push(`問題数が80ではありません(${count})`);
  writeJson(join(SRC_DIR, 'answers', `${id}.json`), { id, label, answers, problems });
  console.log(`${id}: ${label} ${count}問 ${problems.length ? '要確認: ' + problems.join(' / ') : 'OK'}`);
}

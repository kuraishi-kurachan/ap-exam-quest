// 書きぶりの確認用に、分野が散らばるように数問を選んで Markdown にする
// 使い方: node scripts/sample-review.mjs 2025a 3,10,21,35,41,48,53,57,65,77 > review.md
import { join } from 'node:path';
import { OUT_DIR, KANA, readJson } from './lib.mjs';

const [id, list] = process.argv.slice(2);
const exam = readJson(join(OUT_DIR, 'exams', `${id}.json`));
const nos = list.split(',').map(Number);

const out = [`# 書きぶり確認用サンプル(${exam.label} ${nos.length}問)`, ''];
for (const no of nos) {
  const q = exam.questions.find((x) => x.no === no);
  if (!q) continue;
  out.push(`## 問${q.no}(${q.major} / ${q.minor})${q.hasFigure ? ' ※図表あり' : ''}${q.modified ? ' ※表記を一部改変' : ''}`, '');
  out.push(q.stem, '');
  q.choices.forEach((c, i) => out.push(`- **${KANA[i]}** ${c}${i === q.answer ? ' ⭕' : ''}`));
  out.push('', `**解説**`, '', q.explanation, '', `**各選択肢**`, '');
  q.whyWrong.forEach((w, i) => out.push(`- ${KANA[i]}: ${w}`));
  out.push('', `**💼 あなたの仕事で言うと**`, '', q.analogy, '', `**用語**`, '');
  q.terms.forEach((t) => out.push(`- **${t.name}**: ${t.definition}`));
  out.push('', `出典: ${q.source}`, '', '---', '');
}
console.log(out.join('\n'));

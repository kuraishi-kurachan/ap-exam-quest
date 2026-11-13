// データ作成スクリプトの共通部品
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SRC_DIR = join(ROOT, 'data-src'); // git管理しない作業フォルダ
export const OUT_DIR = join(ROOT, 'src', 'data'); // 問題データは exams/ の下。アプリにビルド時に取り込まれる
export const IPA = 'https://www.ipa.go.jp';

export const syllabus = JSON.parse(readFileSync(join(ROOT, 'src', 'data', 'syllabus.json'), 'utf8'));

/** 中分類名 → 大分類 */
export const minorToMajor = new Map();
for (const m of syllabus.majors) for (const n of m.minors) minorToMajor.set(n, m);

export function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
}

/** "2025a" → { year: 2025, season: 'a' } */
export function parseExamId(id) {
  const m = /^(\d{4})([ah])$/.exec(id);
  if (!m) throw new Error(`回のIDは 2025a / 2025h の形式で指定してください: ${id}`);
  return { year: Number(m[1]), season: m[2] };
}

/** 年度別ページのファイル名(IPAの命名に合わせる) */
export function yearPageSlug(year) {
  if (year <= 2018) return `${year}h${String(year - 1988).padStart(2, '0')}`;
  if (year === 2019) return '2019h31';
  return `${year}r${String(year - 2018).padStart(2, '0')}`;
}

export const KANA = ['ア', 'イ', 'ウ', 'エ'];

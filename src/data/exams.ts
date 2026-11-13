// 問題データの読み込み。src/data/exams/*.json はビルド時に別ファイル(チャンク)として取り込まれ、
// PWAが端末に保存するのでオフラインでも読める
import type { Exam } from '../types';

const files = import.meta.glob<Exam>('./exams/*.json', { import: 'default' });

export async function loadExams(): Promise<Exam[]> {
  const exams = await Promise.all(Object.values(files).map((load) => load()));
  return exams.sort((a, b) => b.id.localeCompare(a.id)); // 新しい回が先
}

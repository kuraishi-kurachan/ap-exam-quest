// テスト用のダミー問題と乱数
import type { Question } from '../types';

export function fakeQuestion(id: string, major = '技術要素', minor = 'セキュリティ', extra: Partial<Question> = {}): Question {
  return {
    id,
    exam: 'test',
    no: 1,
    source: 'テスト',
    pdfUrl: 'https://example.com/q.pdf',
    pdfPage: 1,
    field: 'T',
    major,
    minor,
    hasFigure: false,
    modified: false,
    stem: '問題文',
    choices: ['ア', 'イ', 'ウ', 'エ'],
    answer: 0,
    explanation: '解説',
    whyWrong: ['a', 'b', 'c', 'd'],
    analogy: 'たとえ',
    terms: [{ name: `用語${id}`, definition: '定義' }],
    ...extra,
  };
}

/** 再現できる疑似乱数 */
export function seededRng(seed = 1): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

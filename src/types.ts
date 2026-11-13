// アプリ全体で使う型

export type Field = 'T' | 'M' | 'S';

export type Term = { name: string; definition: string };

/** 問題1問。正解(answer)は解答PDFから機械的に取ったもの */
export type Question = {
  id: string; // "2025a-03"
  exam: string; // "2025a"
  no: number;
  source: string; // 出典表記
  pdfUrl: string;
  pdfPage: number;
  field: Field;
  major: string; // 大分類(部門)
  minor: string; // 中分類
  hasFigure: boolean;
  figure?: string; // 図表問題の切り出し画像(public/ からの相対パス)
  modified: boolean; // 表記を一部改変したか
  stem: string;
  choices: [string, string, string, string];
  answer: 0 | 1 | 2 | 3;
  explanation: string;
  whyWrong: [string, string, string, string];
  analogy: string;
  terms: Term[];
};

export type Exam = { id: string; label: string; questions: Question[] };

export type Box = 1 | 2 | 3 | 4 | 5;

/** 1問ごとの学習状況 */
export type QuestionStat = {
  box: Box; // 間隔反復の段階
  due: string; // 次に出す日 "2026-12-01"
  seen: number; // 出題回数
  wrong: number; // 誤答回数
  flagged?: boolean; // 「この問題はおかしい」報告
};

export type SessionKind = 'event' | 'audit';

/** 進行中のイベント(途中で閉じても再開するために保存する) */
export type Session = {
  kind: SessionKind;
  major: string | null; // イベントの部門(監査は null)
  scenario: string; // 冒頭の状況文
  questionIds: string[];
  answers: (number | null)[]; // 選んだ選択肢
  index: number; // 今の問題
  phase: 'intro' | 'question' | 'explanation' | 'result';
  valuationBefore: number;
  newTerms: string[]; // このイベントで解放された用語
};

export type Progress = {
  version: 1;
  questions: Record<string, QuestionStat>;
  company: { name: string; valuation: number; eventsCleared: number; auditsCleared: number };
  history: { date: string; answered: number; correct: number }[];
  session: Session | null;
  lastExportAt?: string; // 最後にバックアップを書き出した日
};

// イベント・監査の進行。すべて「古い Progress を受け取り、新しい Progress を返す」純粋な関数
import { AUDIT_PASS, REWARD } from '../config';
import { pickScenario } from '../data/scenarios';
import type { Progress, Question, QuestionStat, SessionKind } from '../types';
import { rewardFor } from './growth';
import { buildAuditQuestions, buildEventQuestions, majorLevels, pickMajor, type Rng } from './select';
import { everCorrect, review } from './srs';

/** 解放済みの用語名(一度でも正解した問題の用語) */
export function unlockedTermNames(all: Question[], progress: Progress): Set<string> {
  const names = new Set<string>();
  for (const q of all) if (everCorrect(progress.questions[q.id])) for (const t of q.terms) names.add(t.name);
  return names;
}

export function startSession(
  progress: Progress,
  pool: Question[],
  today: string,
  rng: Rng,
  kind: SessionKind,
  major?: string,
): Progress {
  let questionIds: string[];
  let eventMajor: string | null = null;
  if (kind === 'audit') {
    questionIds = buildAuditQuestions(pool, progress, today, rng);
  } else {
    eventMajor = major ?? pickMajor(majorLevels(pool, progress), rng);
    questionIds = buildEventQuestions(pool, progress, today, eventMajor, rng);
  }
  if (questionIds.length === 0) return progress;

  return {
    ...progress,
    session: {
      kind,
      major: eventMajor,
      scenario: pickScenario(eventMajor, rng),
      questionIds,
      answers: questionIds.map(() => null),
      index: 0,
      phase: 'intro',
      valuationBefore: progress.company.valuation,
      newTerms: [],
    },
  };
}

export function beginQuestions(progress: Progress): Progress {
  if (!progress.session) return progress;
  return { ...progress, session: { ...progress.session, phase: 'question' } };
}

/** 回答する。学習状況・評価額・日別記録を更新し、解説画面へ進める */
export function answerCurrent(progress: Progress, all: Question[], choice: number, today: string): Progress {
  const s = progress.session;
  if (!s || s.phase !== 'question') return progress;
  const q = all.find((x) => x.id === s.questionIds[s.index]);
  if (!q) return progress;

  const prev = progress.questions[q.id];
  const correct = choice === q.answer;
  const before = unlockedTermNames(all, progress);
  const stat = review(prev, correct, today); // review は flagged を引き継ぐ

  const questions = { ...progress.questions, [q.id]: stat };
  const newTerms = correct && !everCorrect(prev) ? q.terms.map((t) => t.name).filter((n) => !before.has(n) && !s.newTerms.includes(n)) : [];

  const history = [...progress.history];
  const last = history[history.length - 1];
  if (last && last.date === today) {
    history[history.length - 1] = { ...last, answered: last.answered + 1, correct: last.correct + (correct ? 1 : 0) };
  } else {
    history.push({ date: today, answered: 1, correct: correct ? 1 : 0 });
  }

  const answers = [...s.answers];
  answers[s.index] = choice;

  return {
    ...progress,
    questions,
    history,
    company: { ...progress.company, valuation: progress.company.valuation + rewardFor(prev, correct) },
    session: { ...s, answers, phase: 'explanation', newTerms: [...s.newTerms, ...newTerms] },
  };
}

/** このセッションの正解数 */
export function sessionScore(progress: Progress, all: Question[]): { correct: number; total: number } {
  const s = progress.session;
  if (!s) return { correct: 0, total: 0 };
  let correct = 0;
  s.questionIds.forEach((id, i) => {
    const q = all.find((x) => x.id === id);
    if (q && s.answers[i] === q.answer) correct++;
  });
  return { correct, total: s.questionIds.length };
}

export function auditPassed(score: { correct: number; total: number }): boolean {
  return score.correct >= Math.min(AUDIT_PASS, score.total);
}

/** 次の問題へ。最後の問題なら結果画面へ進み、イベント完了の記録とボーナスを付ける */
export function nextQuestion(progress: Progress, all: Question[]): Progress {
  const s = progress.session;
  if (!s || s.phase !== 'explanation') return progress;
  if (s.index + 1 < s.questionIds.length) {
    return { ...progress, session: { ...s, index: s.index + 1, phase: 'question' } };
  }
  const company = { ...progress.company };
  if (s.kind === 'audit') {
    if (auditPassed(sessionScore(progress, all))) {
      company.auditsCleared += 1;
      company.valuation += REWARD.auditClear;
    }
  } else {
    company.eventsCleared += 1;
  }
  return { ...progress, company, session: { ...s, phase: 'result' } };
}

export function closeSession(progress: Progress): Progress {
  return { ...progress, session: null };
}

/** 「この問題はおかしい」の切り替え */
export function toggleFlag(progress: Progress, id: string): Progress {
  const stat = progress.questions[id];
  if (!stat) return progress;
  const { flagged, ...rest } = stat;
  const next: QuestionStat = flagged ? rest : { ...rest, flagged: true };
  return { ...progress, questions: { ...progress.questions, [id]: next } };
}

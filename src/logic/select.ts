// どの問題を出すかを決める
import syllabus from '../data/syllabus.json';
import { AUDIT_FORCE, AUDIT_SIZE, AUDIT_TRIGGER, EVENT_MAX_REVIEW, EVENT_SIZE, MASTERED_BOX } from '../config';
import type { Progress, Question } from '../types';
import { isDue } from './srs';

export type Rng = () => number;

export const MAJORS: string[] = syllabus.majors.map((m) => m.name);
export const MINORS_OF: Record<string, string[]> = Object.fromEntries(syllabus.majors.map((m) => [m.name, m.minors]));

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 出題対象: 図表が必要な問題(未対応)と「おかしい」報告済みの問題を除く */
export function eligiblePool(questions: Question[], progress: Progress): Question[] {
  return questions.filter((q) => !q.hasFigure && !progress.questions[q.id]?.flagged);
}

/** 復習期限が来ている問題。期限が古い順、同じなら段階が低い順 */
export function dueList(pool: Question[], progress: Progress, today: string): Question[] {
  return pool
    .filter((q) => isDue(progress.questions[q.id], today))
    .sort((a, b) => {
      const sa = progress.questions[a.id];
      const sb = progress.questions[b.id];
      return sa.due.localeCompare(sb.due) || sa.box - sb.box || a.id.localeCompare(b.id);
    });
}

export type Level = { name: string; total: number; mastered: number; seen: number; level: number };

function levelOf(name: string, qs: Question[], progress: Progress): Level {
  let mastered = 0;
  let seen = 0;
  for (const q of qs) {
    const s = progress.questions[q.id];
    if (s) seen++;
    if (s && s.box >= MASTERED_BOX) mastered++;
  }
  return { name, total: qs.length, mastered, seen, level: qs.length ? mastered / qs.length : 0 };
}

/** 9部門それぞれのレベル(段階3以上の割合) */
export function majorLevels(pool: Question[], progress: Progress): Level[] {
  return MAJORS.map((m) => levelOf(m, pool.filter((q) => q.major === m), progress));
}

/** ある部門の中分類ごとのレベル */
export function minorLevels(pool: Question[], progress: Progress, major: string): Level[] {
  return (MINORS_OF[major] ?? []).map((n) => levelOf(n, pool.filter((q) => q.minor === n), progress));
}

/** イベントの部門をくじ引きで決める。レベルが低い部門ほど当たりやすい */
export function pickMajor(levels: Level[], rng: Rng): string {
  const candidates = levels.filter((l) => l.total > 0);
  if (candidates.length === 0) return MAJORS[0];
  const weights = candidates.map((l) => 1 - l.level + 0.1);
  let r = rng() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r < 0) return candidates[i].name;
  }
  return candidates[candidates.length - 1].name;
}

/** イベント1回分(5問)の問題IDを選ぶ */
export function buildEventQuestions(pool: Question[], progress: Progress, today: string, major: string, rng: Rng): string[] {
  const chosen: Question[] = [];
  const has = (q: Question) => chosen.includes(q);
  const take = (qs: Question[]) => {
    for (const q of qs) {
      if (chosen.length >= EVENT_SIZE) return;
      if (!has(q)) chosen.push(q);
    }
  };
  const byWeakness = (qs: Question[]) =>
    [...qs].sort((a, b) => {
      const sa = progress.questions[a.id];
      const sb = progress.questions[b.id];
      return sa.box - sb.box || sa.due.localeCompare(sb.due);
    });

  // 1. 復習期限が来た問題(部門を問わず最大3問)
  take(dueList(pool, progress, today).slice(0, EVENT_MAX_REVIEW));
  // 2. その部門の未出題
  const inMajor = pool.filter((q) => q.major === major);
  take(shuffle(inMajor.filter((q) => !progress.questions[q.id]), rng));
  // 3. その部門の解いたことがある問題(苦手な順)
  take(byWeakness(inMajor.filter((q) => progress.questions[q.id])));
  // 4. それでも足りなければ他部門の未出題 → 他部門の苦手な問題
  take(shuffle(pool.filter((q) => !progress.questions[q.id]), rng));
  take(byWeakness(pool.filter((q) => progress.questions[q.id])));

  return shuffle(chosen, rng).map((q) => q.id);
}

/** 監査(復習問題だけ10問) */
export function buildAuditQuestions(pool: Question[], progress: Progress, today: string, rng: Rng): string[] {
  return shuffle(dueList(pool, progress, today).slice(0, AUDIT_SIZE), rng).map((q) => q.id);
}

export type AuditStatus = 'none' | 'available' | 'forced';

export function auditStatus(dueCount: number): AuditStatus {
  if (dueCount >= AUDIT_FORCE) return 'forced';
  if (dueCount >= AUDIT_TRIGGER) return 'available';
  return 'none';
}

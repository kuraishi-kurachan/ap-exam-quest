// 会社の成長(評価額とステージ)
import { MASTERED_BOX, REWARD, STAGES } from '../config';
import type { Progress, Question, QuestionStat } from '../types';
import { isEarly } from './srs';

/** 1問回答したときの評価額の増分(万円) */
export function rewardFor(prev: QuestionStat | undefined, correct: boolean, today: string): number {
  if (!correct) return REWARD.wrong;
  if (!prev) return REWARD.firstCorrect;
  return isEarly(prev, today) ? REWARD.earlyCorrect : REWARD.reviewCorrect;
}

/** 出題対象のうち「身についた」(段階3以上)問題の割合 */
export function masteryRatio(pool: Question[], progress: Progress): number {
  if (pool.length === 0) return 0;
  const n = pool.filter((q) => (progress.questions[q.id]?.box ?? 0) >= MASTERED_BOX).length;
  return n / pool.length;
}

export function stageFor(ratio: number) {
  let stage: (typeof STAGES)[number] = STAGES[0];
  for (const s of STAGES) if (ratio >= s.min) stage = s;
  const idx = STAGES.indexOf(stage);
  const next = STAGES[idx + 1] ?? null;
  return { ...stage, index: idx, next };
}

/** 評価額の表示("3,200万円" / "1.2億円") */
export function formatValuation(manYen: number): string {
  if (manYen >= 10000) return `${(manYen / 10000).toFixed(manYen >= 100000 ? 0 : 1)}億円`;
  return `${manYen.toLocaleString('ja-JP')}万円`;
}

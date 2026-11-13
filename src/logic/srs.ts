// 間隔反復(5段階)。正解で1段上がり、誤答で段階1に戻る
import { INTERVALS } from '../config';
import type { Box, QuestionStat } from '../types';
import { addDays } from './date';

/** 回答結果を反映した新しい学習状況を返す(元のオブジェクトは変えない) */
export function review(prev: QuestionStat | undefined, correct: boolean, today: string): QuestionStat {
  let box: Box;
  if (!correct) box = 1;
  else if (!prev) box = 2; // 初見で正解したら段階2から
  else box = Math.min(prev.box + 1, 5) as Box;

  return {
    ...prev,
    box,
    due: addDays(today, INTERVALS[box - 1]),
    seen: (prev?.seen ?? 0) + 1,
    wrong: (prev?.wrong ?? 0) + (correct ? 0 : 1),
  };
}

/** 復習期限が来ているか(一度も解いていない問題は対象外) */
export function isDue(stat: QuestionStat | undefined, today: string): boolean {
  return !!stat && stat.due <= today;
}

/** 一度でも正解したことがあるか(用語の解放に使う) */
export function everCorrect(stat: QuestionStat | undefined): boolean {
  return !!stat && stat.seen - stat.wrong > 0;
}

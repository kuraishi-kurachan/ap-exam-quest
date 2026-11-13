// 間隔反復(5段階)。正解で1段上がり、誤答で段階1に戻る
import { INTERVALS } from '../config';
import type { Box, QuestionStat } from '../types';
import { addDays } from './date';

/** 復習期限より前に解き直しているか(自主練) */
export function isEarly(prev: QuestionStat | undefined, today: string): boolean {
  return !!prev && prev.due > today;
}

/**
 * 回答結果を反映した新しい学習状況を返す(元のオブジェクトは変えない)。
 * 期限前の正解では段階も期限も変えない(覚えた直後の解き直しで「習得済み」にならないように)。
 * 誤答はいつでも段階1に戻す。
 */
export function review(prev: QuestionStat | undefined, correct: boolean, today: string): QuestionStat {
  if (prev && correct && isEarly(prev, today)) {
    return { ...prev, seen: prev.seen + 1 };
  }
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

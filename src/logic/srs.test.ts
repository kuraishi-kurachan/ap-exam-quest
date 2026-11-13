import { describe, expect, it } from 'vitest';
import { addDays, daysBetween } from './date';
import { everCorrect, isDue, review } from './srs';

describe('日付', () => {
  it('月またぎ・年またぎで日を足せる', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-02-28', 1)).toBe('2027-03-01');
  });
  it('日数の差を出せる', () => {
    expect(daysBetween('2026-11-13', '2027-02-06')).toBe(85);
  });
});

describe('間隔反復', () => {
  const today = '2026-11-13';

  it('初見で正解したら段階2、3日後に再出題', () => {
    const s = review(undefined, true, today);
    expect(s).toMatchObject({ box: 2, due: '2026-11-16', seen: 1, wrong: 0 });
  });

  it('初見で間違えたら段階1、翌日に再出題', () => {
    const s = review(undefined, false, today);
    expect(s).toMatchObject({ box: 1, due: '2026-11-14', seen: 1, wrong: 1 });
  });

  it('正解するたびに段階が上がり、間隔が 1→3→7→14→30日 と伸びる', () => {
    let s = review(undefined, false, today); // 段階1
    const dues: number[] = [];
    let d = today;
    for (let i = 0; i < 5; i++) {
      s = review(s, true, d);
      dues.push(daysBetween(d, s.due));
      d = s.due;
    }
    expect(dues).toEqual([3, 7, 14, 30, 30]); // 段階5で頭打ち
    expect(s.box).toBe(5);
  });

  it('段階5でも間違えたら段階1に戻る', () => {
    const s = review({ box: 5, due: today, seen: 9, wrong: 0 }, false, today);
    expect(s).toMatchObject({ box: 1, due: '2026-11-14', seen: 10, wrong: 1 });
  });

  it('間違えた問題は翌日から出題対象になり、当日は対象にならない', () => {
    const s = review(undefined, false, today);
    expect(isDue(s, today)).toBe(false);
    expect(isDue(s, '2026-11-14')).toBe(true);
    expect(isDue(s, '2026-11-20')).toBe(true);
  });

  it('一度も解いていない問題は復習対象ではない', () => {
    expect(isDue(undefined, today)).toBe(false);
  });

  it('一度でも正解していれば everCorrect', () => {
    expect(everCorrect(undefined)).toBe(false);
    expect(everCorrect({ box: 1, due: today, seen: 2, wrong: 2 })).toBe(false);
    expect(everCorrect({ box: 1, due: today, seen: 3, wrong: 2 })).toBe(true);
  });
});

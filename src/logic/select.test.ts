import { describe, expect, it } from 'vitest';
import { newProgress } from '../storage/progress';
import type { Progress } from '../types';
import { auditStatus, buildAuditQuestions, buildEventQuestions, dueList, eligiblePool, majorLevels, pickMajor } from './select';
import { fakeQuestion, seededRng } from './testutil';

const today = '2026-11-20';

function withStats(stats: Progress['questions']): Progress {
  return { ...newProgress(), questions: stats };
}

describe('出題対象', () => {
  it('図表が必要な問題と「おかしい」報告済みの問題は出さない', () => {
    const qs = [fakeQuestion('a'), fakeQuestion('b', undefined, undefined, { hasFigure: true }), fakeQuestion('c')];
    const p = withStats({ c: { box: 1, due: today, seen: 1, wrong: 1, flagged: true } });
    expect(eligiblePool(qs, p).map((q) => q.id)).toEqual(['a']);
  });
});

describe('イベントの問題選び', () => {
  const sec = Array.from({ length: 10 }, (_, i) => fakeQuestion(`sec${i}`));
  const pm = Array.from({ length: 10 }, (_, i) => fakeQuestion(`pm${i}`, 'プロジェクトマネジメント', 'プロジェクトマネジメント'));
  const pool = [...sec, ...pm];

  it('5問選ぶ', () => {
    const ids = buildEventQuestions(pool, newProgress(), today, '技術要素', seededRng());
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
  });

  it('復習期限が来た問題を最大3問まで先に入れ、残りはその部門の未出題', () => {
    const p = withStats({
      pm0: { box: 1, due: '2026-11-18', seen: 1, wrong: 1 },
      pm1: { box: 1, due: '2026-11-19', seen: 1, wrong: 1 },
      pm2: { box: 2, due: '2026-11-20', seen: 1, wrong: 0 },
      pm3: { box: 1, due: '2026-11-20', seen: 1, wrong: 1 },
      pm4: { box: 2, due: '2026-11-30', seen: 1, wrong: 0 }, // まだ期限前
    });
    const ids = buildEventQuestions(pool, p, today, '技術要素', seededRng());
    const review = ids.filter((id) => id.startsWith('pm'));
    expect(review.sort()).toEqual(['pm0', 'pm1', 'pm3']); // 期限が古い順、同日なら段階が低い順
    expect(ids.filter((id) => id.startsWith('sec'))).toHaveLength(2);
  });

  it('部門の問題が足りなければ他部門から補う', () => {
    const small = [fakeQuestion('x1', '企業と法務', '法務'), fakeQuestion('x2', '企業と法務', '法務'), ...sec];
    const ids = buildEventQuestions(small, newProgress(), today, '企業と法務', seededRng());
    expect(ids).toHaveLength(5);
    expect(ids).toEqual(expect.arrayContaining(['x1', 'x2']));
  });

  it('問題が全部で5問未満なら、あるだけ出す', () => {
    const ids = buildEventQuestions(sec.slice(0, 3), newProgress(), today, '技術要素', seededRng());
    expect(ids).toHaveLength(3);
  });
});

describe('監査', () => {
  it('復習待ちの数で状態が変わる(10問で発生、21問以上で強制)', () => {
    expect(auditStatus(9)).toBe('none');
    expect(auditStatus(10)).toBe('available');
    expect(auditStatus(20)).toBe('available');
    expect(auditStatus(21)).toBe('forced');
  });

  it('復習期限が来た問題だけを、古い順に最大10問', () => {
    const qs = Array.from({ length: 15 }, (_, i) => fakeQuestion(`q${String(i).padStart(2, '0')}`));
    const stats: Progress['questions'] = {};
    qs.forEach((q, i) => {
      stats[q.id] = { box: 1, due: `2026-11-${String(5 + i).padStart(2, '0')}`, seen: 1, wrong: 1 };
    });
    const p = withStats(stats);
    expect(dueList(qs, p, today)).toHaveLength(15);
    const ids = buildAuditQuestions(qs, p, today, seededRng());
    expect(ids).toHaveLength(10);
    expect([...ids].sort()).toEqual(qs.slice(0, 10).map((q) => q.id));
  });
});

describe('部門', () => {
  it('レベルは段階3以上の割合', () => {
    const qs = [fakeQuestion('a'), fakeQuestion('b'), fakeQuestion('c'), fakeQuestion('d')];
    const p = withStats({
      a: { box: 3, due: today, seen: 2, wrong: 0 },
      b: { box: 2, due: today, seen: 1, wrong: 0 },
    });
    const lv = majorLevels(qs, p).find((l) => l.name === '技術要素')!;
    expect(lv).toMatchObject({ total: 4, mastered: 1, seen: 2, level: 0.25 });
  });

  it('くじ引きは問題がある部門からしか当たらない', () => {
    const qs = [fakeQuestion('a', '企業と法務', '法務')];
    const levels = majorLevels(qs, newProgress());
    const rng = seededRng(7);
    for (let i = 0; i < 20; i++) expect(pickMajor(levels, rng)).toBe('企業と法務');
  });
});

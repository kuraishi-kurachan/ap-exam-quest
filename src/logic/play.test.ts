import { describe, expect, it } from 'vitest';
import { REWARD } from '../config';
import { newProgress, parseProgress, exportProgress } from '../storage/progress';
import { answerCurrent, beginQuestions, closeSession, nextQuestion, sessionScore, startSession, toggleFlag } from './play';
import { buildEventQuestions } from './select';
import { fakeQuestion, seededRng } from './testutil';

const today = '2026-11-13';
const all = Array.from({ length: 12 }, (_, i) => fakeQuestion(`q${i}`)); // 正解はすべて0(ア)

describe('イベントの進行', () => {
  it('5問解いて結果画面まで進み、記録が残る', () => {
    let p = startSession(newProgress(), all, today, seededRng(), 'event', '技術要素');
    expect(p.session?.phase).toBe('intro');
    p = beginQuestions(p);
    for (let i = 0; i < 5; i++) {
      p = answerCurrent(p, all, i < 3 ? 0 : 1, today); // 3問正解、2問誤答
      expect(p.session?.phase).toBe('explanation');
      p = nextQuestion(p, all);
    }
    expect(p.session?.phase).toBe('result');
    expect(sessionScore(p, all)).toEqual({ correct: 3, total: 5 });
    expect(p.company.eventsCleared).toBe(1);
    expect(p.company.valuation).toBe(1000 + 3 * REWARD.firstCorrect + 2 * REWARD.wrong);
    expect(p.history).toEqual([{ date: today, answered: 5, correct: 3 }]);
    expect(Object.keys(p.questions)).toHaveLength(5);
    expect(p.session?.newTerms).toHaveLength(3); // 正解した3問の用語が解放
    expect(closeSession(p).session).toBeNull();
  });

  it('途中で保存して読み込み直しても、同じ問題の続きから再開できる', () => {
    let p = beginQuestions(startSession(newProgress(), all, today, seededRng(), 'event', '技術要素'));
    p = nextQuestion(answerCurrent(p, all, 0, today), all);
    p = answerCurrent(p, all, 0, today);
    const restored = parseProgress(exportProgress(p));
    expect(restored.session).toEqual(p.session);
    expect(restored.session?.index).toBe(1);
    expect(restored.session?.phase).toBe('explanation');
  });

  it('間違えた問題は、翌日のイベントで優先して再出題される', () => {
    let p = beginQuestions(startSession(newProgress(), all, today, seededRng(), 'event', '技術要素'));
    const missed = p.session!.questionIds[0];
    p = answerCurrent(p, all, 3, today); // 誤答
    p = closeSession(p);
    const sameDay = buildEventQuestions(all, p, today, '技術要素', seededRng(2));
    const nextDay = buildEventQuestions(all, p, '2026-11-14', '技術要素', seededRng(2));
    expect(sameDay).not.toContain(missed);
    expect(nextDay).toContain(missed);
  });

  it('監査は8問以上正解でクリアし、ボーナスが入る', () => {
    let p = newProgress();
    for (const q of all.slice(0, 10)) p.questions[q.id] = { box: 1, due: '2026-11-10', seen: 1, wrong: 1 };
    p = beginQuestions(startSession(p, all, today, seededRng(), 'audit'));
    expect(p.session?.questionIds).toHaveLength(10);
    for (let i = 0; i < 10; i++) {
      p = nextQuestion(answerCurrent(p, all, i < 8 ? 0 : 2, today), all);
    }
    expect(p.company.auditsCleared).toBe(1);
    expect(p.company.valuation).toBe(1000 + 8 * REWARD.reviewCorrect + 2 * REWARD.wrong + REWARD.auditClear);
  });

  it('監査は7問正解ではクリアにならない', () => {
    let p = newProgress();
    for (const q of all.slice(0, 10)) p.questions[q.id] = { box: 1, due: '2026-11-10', seen: 1, wrong: 1 };
    p = beginQuestions(startSession(p, all, today, seededRng(), 'audit'));
    for (let i = 0; i < 10; i++) p = nextQuestion(answerCurrent(p, all, i < 7 ? 0 : 2, today), all);
    expect(p.company.auditsCleared).toBe(0);
  });

  it('「おかしい」報告を付け外しでき、回答しても消えない', () => {
    let p = beginQuestions(startSession(newProgress(), all, today, seededRng(), 'event', '技術要素'));
    const id = p.session!.questionIds[0];
    p = answerCurrent(p, all, 0, today);
    p = toggleFlag(p, id);
    expect(p.questions[id].flagged).toBe(true);
    p = toggleFlag(p, id);
    expect(p.questions[id].flagged).toBeUndefined();
  });
});

describe('学習記録の読み込み', () => {
  it('書き出した記録は元どおりに読み込める', () => {
    const p = { ...newProgress(), company: { name: 'テスト社', valuation: 5000, eventsCleared: 3, auditsCleared: 1 } };
    expect(parseProgress(exportProgress(p))).toEqual(p);
  });
  it('壊れた文字列は分かりやすいエラーにする', () => {
    expect(() => parseProgress('abc')).toThrow('JSONとして読めませんでした');
    expect(() => parseProgress('{"version":2}')).toThrow('version');
  });
});

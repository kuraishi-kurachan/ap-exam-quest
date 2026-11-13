// 学習記録の保存・読み込み(端末内の localStorage)
import type { Progress } from '../types';

const KEY = 'apq:progress:v1';

export function newProgress(): Progress {
  return {
    version: 1,
    questions: {},
    company: { name: '株式会社ネクストベンチャー', valuation: 1000, eventsCleared: 0, auditsCleared: 0 },
    history: [],
    session: null,
  };
}

export function loadProgress(): Progress {
  try {
    const text = localStorage.getItem(KEY);
    if (text) return parseProgress(text);
  } catch {
    // 壊れていた・読めない場合は新規で始める
  }
  return newProgress();
}

/** 保存に失敗したら false を返す(容量不足・プライベートモードなど) */
export function saveProgress(p: Progress): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 何もしない
  }
}

export function exportProgress(p: Progress): string {
  return JSON.stringify(p);
}

/** 書き出したJSONを読み込む。形式がおかしければ日本語のメッセージ付きで例外を投げる */
export function parseProgress(text: string): Progress {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('JSONとして読めませんでした。書き出した文字列を全部貼り付けてください。');
  }
  const p = data as Partial<Progress>;
  if (!p || typeof p !== 'object' || p.version !== 1) throw new Error('このアプリの学習記録ではないようです(version が違います)。');
  if (!p.questions || typeof p.questions !== 'object') throw new Error('学習記録の中身(questions)が見つかりません。');
  if (!p.company || typeof p.company.valuation !== 'number') throw new Error('会社の情報(company)が見つかりません。');
  const base = newProgress();
  return {
    version: 1,
    questions: p.questions,
    company: { ...base.company, ...p.company },
    history: Array.isArray(p.history) ? p.history : [],
    session: p.session ?? null,
    ...(typeof p.lastExportAt === 'string' ? { lastExportAt: p.lastExportAt } : {}),
  };
}

/** バックアップを促すか(1問以上解いていて、最後の書き出しから7日以上) */
export function needsBackup(p: Progress, today: string, daysBetween: (a: string, b: string) => number): boolean {
  if (Object.keys(p.questions).length === 0) return false;
  return !p.lastExportAt || daysBetween(p.lastExportAt, today) >= 7;
}

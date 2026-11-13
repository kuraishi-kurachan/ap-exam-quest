import { useMemo, useState } from 'react';
import type { Ctx } from '../App';
import { Card } from '../components/ui';
import { everCorrect } from '../logic/srs';

type Entry = { name: string; definition: string; minor: string; sources: string[]; unlocked: boolean };

export default function Wiki({ ctx }: { ctx: Ctx }) {
  const [query, setQuery] = useState('');

  // 同じ用語が複数の問題に出てくるのでまとめる。どれか1問でも正解していれば解放
  const entries = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const q of ctx.all) {
      const ok = everCorrect(ctx.progress.questions[q.id]);
      for (const t of q.terms) {
        const e = map.get(t.name) ?? { name: t.name, definition: t.definition, minor: q.minor, sources: [], unlocked: false };
        e.sources.push(q.source);
        if (ok && !e.unlocked) {
          e.unlocked = true;
          e.definition = t.definition;
        }
        map.set(t.name, e);
      }
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [ctx.all, ctx.progress.questions]);

  const unlocked = entries.filter((e) => e.unlocked);
  const q = query.trim().toLowerCase();
  const shown = q ? unlocked.filter((e) => (e.name + e.definition + e.minor).toLowerCase().includes(q)) : unlocked;

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-xl font-bold">社内Wiki</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          解放 {unlocked.length} / {entries.length}語 ・ 正解した問題の用語がたまっていく
        </p>
      </header>

      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="用語を検索"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
      />

      {shown.map((e) => (
        <Card key={e.name}>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-bold">{e.name}</h2>
            <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{e.minor}</span>
          </div>
          <p className="mt-1 text-sm">{e.definition}</p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {e.sources.length >= 2 && <span className="mr-2 rounded bg-amber-200 px-1 text-amber-900">頻出 ×{e.sources.length}</span>}
            {e.sources[0]}
          </p>
        </Card>
      ))}

      {!q && entries.length > unlocked.length && (
        <Card className="text-center text-slate-500 dark:text-slate-400">
          <p className="text-2xl tracking-widest">???</p>
          <p className="text-sm">未解放の用語があと{entries.length - unlocked.length}語</p>
        </Card>
      )}
    </div>
  );
}

import { useState } from 'react';
import type { Ctx } from '../App';
import { Button, ProgressBar } from '../components/ui';
import { auditStatus, dueList, majorLevels, minorLevels } from '../logic/select';

const FIELD_LABEL: Record<string, string> = { T: 'テクノロジ', M: 'マネジメント', S: 'ストラテジ' };
const FIELD_OF: Record<string, string> = {
  基礎理論: 'T',
  コンピュータシステム: 'T',
  技術要素: 'T',
  開発技術: 'T',
  プロジェクトマネジメント: 'M',
  サービスマネジメント: 'M',
  システム戦略: 'S',
  経営戦略: 'S',
  企業と法務: 'S',
};

export default function MapScreen({ ctx }: { ctx: Ctx }) {
  const { pool, progress, today } = ctx;
  const [open, setOpen] = useState<string | null>(null);
  const levels = majorLevels(pool, progress);
  const forced = auditStatus(dueList(pool, progress, today).length) === 'forced';
  const blocked = !!progress.session || forced;

  return (
    <div className="space-y-3">
      <header>
        <h1 className="text-xl font-bold">部門マップ</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">レベル = 3回以上続けて正解できた(段階3以上の)問題の割合</p>
      </header>

      {levels.map((l, i) => {
        const field = FIELD_OF[l.name];
        const showField = i === 0 || FIELD_OF[levels[i - 1].name] !== field;
        return (
          <div key={l.name}>
            {showField && <p className="mt-4 mb-1 text-xs font-bold text-slate-500 dark:text-slate-400">{FIELD_LABEL[field]}系</p>}
            <div className="rounded-2xl bg-white shadow-sm dark:bg-slate-900">
              <button type="button" className="w-full p-4 text-left" onClick={() => setOpen(open === l.name ? null : l.name)}>
                <div className="flex items-baseline justify-between">
                  <span className="font-bold">{l.name}</span>
                  <span className="text-sm tabular-nums">
                    Lv.{Math.floor(l.level * 10)}
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                      {l.mastered}/{l.total}問
                    </span>
                  </span>
                </div>
                <ProgressBar value={l.level} className="mt-2" />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  解いた {l.seen}問 ・ 未出題 {l.total - l.seen}問
                </p>
              </button>
              {open === l.name && (
                <div className="space-y-2 border-t border-slate-200 p-4 dark:border-slate-800">
                  {minorLevels(pool, progress, l.name).map((m) => (
                    <div key={m.name}>
                      <div className="flex justify-between text-sm">
                        <span>{m.name}</span>
                        <span className="tabular-nums text-slate-500 dark:text-slate-400">
                          {m.mastered}/{m.total}
                        </span>
                      </div>
                      <ProgressBar value={m.level} className="mt-1" />
                    </div>
                  ))}
                  <Button className="mt-2 w-full" disabled={blocked || l.total === 0} onClick={() => ctx.start('event', l.name)}>
                    この部門の案件を受ける
                  </Button>
                  {blocked && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {progress.session ? '保留中の案件があるので、先にホームから再開してください。' : '監査を先に片付けてください。'}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

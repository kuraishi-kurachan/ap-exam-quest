import type { Ctx } from '../App';
import { Button, Card, ProgressBar } from '../components/ui';
import { EXAM_DATES } from '../config';
import { daysBetween } from '../logic/date';
import { formatValuation, masteryRatio, stageFor } from '../logic/growth';
import { closeSession } from '../logic/play';
import { auditStatus, dueList } from '../logic/select';

export default function Home({ ctx }: { ctx: Ctx }) {
  const { progress, pool, all, today, exams } = ctx;
  const ratio = masteryRatio(pool, progress);
  const stage = stageFor(ratio);
  const due = dueList(pool, progress, today).length;
  const audit = auditStatus(due);
  const todayLog = progress.history.find((h) => h.date === today);
  const daysToA = daysBetween(today, EXAM_DATES.examAStart);
  const figureCount = all.filter((q) => q.hasFigure).length;
  const unseen = pool.filter((q) => !progress.questions[q.id]).length;

  const session = progress.session;

  return (
    <div className="space-y-4">
      <header>
        <p className="text-sm text-slate-500 dark:text-slate-400">ひとり情シス奮闘記</p>
        <h1 className="text-xl font-bold">{progress.company.name}</h1>
      </header>

      <Card>
        <div className="flex items-baseline justify-between">
          <span className="rounded-full bg-teal-100 px-3 py-0.5 text-sm font-bold text-teal-800 dark:bg-teal-900 dark:text-teal-200">{stage.name}</span>
          <span className="text-sm text-slate-500 dark:text-slate-400">社員 {stage.staff}名</span>
        </div>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">企業評価額</p>
        <p className="text-3xl font-bold tabular-nums">{formatValuation(progress.company.valuation)}</p>
        {stage.next && (
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>次のステージ「{stage.next.name}」まで</span>
              <span>
                習得 {Math.round(ratio * 100)}% / {Math.round(stage.next.min * 100)}%
              </span>
            </div>
            <ProgressBar value={(ratio - stage.min) / (stage.next.min - stage.min)} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-2 text-center">
        <Stat label="今日解いた" value={`${todayLog?.answered ?? 0}問`} sub={todayLog ? `正解 ${todayLog.correct}` : ' '} />
        <Stat label="未解決" value={`${due}件`} sub="復習待ち" />
        <Stat label="科目Aまで" value={daysToA >= 0 ? `${daysToA}日` : '終了'} sub="2/6〜" />
      </div>

      {audit !== 'none' && (
        <Card className="border-2 border-amber-400 dark:border-amber-500">
          <p className="font-bold">🚨 監査が来た</p>
          <p className="mt-1 text-sm">
            未解決インシデントが{due}件たまっている。{audit === 'forced' ? '先に監査を片付けないと、新しい案件は受けられない。' : '10問中8問正解でクリア。'}
          </p>
        </Card>
      )}

      <Card className="text-sm text-slate-600 dark:text-slate-300">
        <p>
          収録: {exams.map((e) => e.label).join('・') || 'なし'}({all.length}問)
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          未出題 {unseen}問{figureCount > 0 && ` ・ 図表が必要な${figureCount}問は準備中`}
        </p>
      </Card>

      {/* 画面下の固定ボタン(タブバーの上) */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+max(0.75rem,env(safe-area-inset-bottom)))] z-10 px-4 pb-2">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {session ? (
            <>
              <Button onClick={ctx.resume}>
                保留中の{session.kind === 'audit' ? '監査' : '案件'}を再開({Math.min(session.index + 1, session.questionIds.length)}/{session.questionIds.length})
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm('保留中の案件を破棄しますか?(回答済みの問題の記録は残ります)')) ctx.update(closeSession);
                }}
              >
                破棄する
              </Button>
            </>
          ) : (
            <>
              {audit !== 'none' && (
                <Button onClick={() => ctx.start('audit')} className="bg-amber-500 text-slate-900 active:bg-amber-600 dark:bg-amber-500">
                  監査を受ける(10問)
                </Button>
              )}
              {audit !== 'forced' && (
                <Button onClick={() => ctx.start('event')} disabled={pool.length === 0} variant={audit === 'none' ? 'primary' : 'secondary'}>
                  次のイベントへ(5問)
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="px-2 py-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{sub}</p>
    </Card>
  );
}

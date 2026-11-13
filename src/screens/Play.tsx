import { useEffect, useState } from 'react';
import type { Ctx } from '../App';
import { RichText } from '../components/RichText';
import { BottomBar, Button, Card, KANA } from '../components/ui';
import { AUDIT_PASS } from '../config';
import { formatValuation } from '../logic/growth';
import { copyText } from '../lib/clipboard';
import { answerCurrent, auditPassed, beginQuestions, closeSession, nextQuestion, sessionScore, toggleFlag } from '../logic/play';
import type { Question } from '../types';

export default function Play({ ctx }: { ctx: Ctx }) {
  const s = ctx.progress.session!;
  const q = ctx.all.find((x) => x.id === s.questionIds[s.index]);
  const title = s.kind === 'audit' ? '監査' : `案件: ${s.major}`;

  // 問題が変わったら画面の先頭へ
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [s.index, s.phase]);

  const header = (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
        <div className="text-sm">
          <span className="font-bold">{title}</span>
          {s.phase !== 'intro' && s.phase !== 'result' && (
            <span className="ml-2 tabular-nums text-slate-500 dark:text-slate-400">
              {s.index + 1} / {s.questionIds.length}
            </span>
          )}
        </div>
        {s.phase !== 'result' && (
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-500 active:bg-slate-200 dark:text-slate-400 dark:active:bg-slate-800"
            onClick={ctx.suspend}
          >
            保留
          </button>
        )}
      </div>
    </div>
  );

  if (!q && s.phase !== 'result') {
    return (
      <div className="mx-auto max-w-md space-y-4 p-4">
        <Card>問題データが見つかりませんでした(データ更新で問題が消えた可能性があります)。</Card>
        <Button onClick={() => ctx.update(closeSession)} className="w-full">
          ホームへ戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      {header}
      <main className="mx-auto max-w-md px-4 pt-4 pb-48">
        {s.phase === 'intro' && <Intro ctx={ctx} />}
        {s.phase === 'question' && q && <QuestionView ctx={ctx} q={q} />}
        {s.phase === 'explanation' && q && <Explanation key={`${s.index}-${q.id}`} ctx={ctx} q={q} />}
        {s.phase === 'result' && <Result ctx={ctx} />}
      </main>
    </div>
  );
}

function Intro({ ctx }: { ctx: Ctx }) {
  const s = ctx.progress.session!;
  return (
    <>
      <Card className={s.kind === 'audit' ? 'border-2 border-amber-400' : ''}>
        <p className="text-sm text-slate-500 dark:text-slate-400">{s.kind === 'audit' ? '🚨 監査' : `📨 ${s.major}`}</p>
        <p className="mt-2 text-lg leading-relaxed">{s.scenario}</p>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {s.kind === 'audit'
            ? `過去に対応を誤った${s.questionIds.length}件。${Math.min(AUDIT_PASS, s.questionIds.length)}件以上正しく答えればクリア。`
            : `${s.questionIds.length}つの判断を迫られている。`}
        </p>
      </Card>
      <BottomBar>
        <Button onClick={() => ctx.update(beginQuestions)}>対応する</Button>
      </BottomBar>
    </>
  );
}

function QuestionView({ ctx, q }: { ctx: Ctx; q: Question }) {
  const stat = ctx.progress.questions[q.id];
  return (
    <>
      <div className="mb-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-200 px-2 py-0.5 dark:bg-slate-800">{q.minor}</span>
        {stat && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 dark:bg-amber-900 dark:text-amber-100">復習(過去{stat.wrong}回ミス)</span>}
      </div>
      <Stem q={q} />
      <div className="mt-4 space-y-2">
        {q.choices.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => ctx.update((p) => answerCurrent(p, ctx.all, i, ctx.today))}
            className="flex min-h-14 w-full items-start gap-3 rounded-xl border border-slate-300 bg-white p-3 text-left active:bg-teal-50 dark:border-slate-700 dark:bg-slate-900 dark:active:bg-slate-800"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-700 font-bold text-white dark:bg-teal-600">{KANA[i]}</span>
            {isPlaceholder(c) ? <span className="pt-1 text-sm text-slate-500 dark:text-slate-400">図の{KANA[i]}</span> : <RichText text={c} className="pt-0.5" />}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">出典:{q.source}</p>
    </>
  );
}

function Explanation({ ctx, q }: { ctx: Ctx; q: Question }) {
  const s = ctx.progress.session!;
  const chosen = s.answers[s.index];
  const correct = chosen === q.answer;
  const flagged = !!ctx.progress.questions[q.id]?.flagged;
  const last = s.index + 1 >= s.questionIds.length;
  const [showStem, setShowStem] = useState(false);
  // 選択肢ごとの説明の開閉。正解と自分の回答だけ最初から開く。画面の再描画で勝手に戻らないよう自前で覚えておく
  const [opened, setOpened] = useState<boolean[]>(() => q.choices.map((_, i) => i === q.answer || i === chosen));
  const term = q.terms[0];

  const explainPrompt = `あなたは入社1年目の新人です。私が今から「${term?.name ?? q.minor}」を説明するので、分からない点を1つずつ質問してください。3往復したら、私の説明の正確さを100点満点で採点し、抜けていた点を教えてください。
参考(私には見せないこと):${term?.definition ?? q.explanation}`;

  return (
    <>
      <div className={`rounded-2xl p-4 text-center ${correct ? 'bg-teal-600 text-white' : 'bg-rose-600 text-white'}`}>
        <p className="text-2xl font-bold">{correct ? '正解!' : '不正解'}</p>
        <p className="text-sm opacity-90">
          正解は「{KANA[q.answer]}」{!correct && chosen !== null && `/ あなたの回答は「${KANA[chosen]}」`}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {q.choices.map((c, i) => {
          const isAns = i === q.answer;
          const isMine = i === chosen;
          return (
            <details
              key={i}
              open={opened[i]}
              onToggle={(e) => {
                const isOpen = (e.currentTarget as HTMLDetailsElement).open;
                setOpened((prev) => (prev[i] === isOpen ? prev : prev.map((v, j) => (j === i ? isOpen : v))));
              }}
              className={`rounded-xl border p-3 ${
                isAns
                  ? 'border-teal-500 bg-teal-50 dark:bg-teal-950'
                  : isMine
                    ? 'border-rose-400 bg-rose-50 dark:bg-rose-950'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
              }`}
            >
              <summary className="flex cursor-pointer list-none items-start gap-2">
                <span className="font-bold">{KANA[i]}</span>
                {isPlaceholder(c) ? <span className="flex-1 text-sm">(図は問題の画像を参照)</span> : <RichText text={c} className="flex-1 text-sm" />}
                <span aria-hidden>{isAns ? '⭕' : isMine ? '❌' : ''}</span>
              </summary>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{q.whyWrong[i]}</p>
            </details>
          );
        })}
      </div>

      <Card className="mt-4">
        <h2 className="font-bold">解説</h2>
        <RichText text={q.explanation} className="mt-2" />
      </Card>

      <Card className="mt-4 border-l-4 border-teal-500">
        <h2 className="font-bold">💼 あなたの仕事で言うと</h2>
        <p className="mt-2 whitespace-pre-wrap">{q.analogy}</p>
      </Card>

      {q.terms.length > 0 && (
        <Card className="mt-4">
          <h2 className="font-bold">📚 用語</h2>
          <dl className="mt-2 space-y-2 text-sm">
            {q.terms.map((t) => (
              <div key={t.name}>
                <dt className="font-bold">
                  {t.name}
                  {s.newTerms.includes(t.name) && <span className="ml-2 rounded bg-amber-300 px-1 text-xs text-slate-900">NEW</span>}
                </dt>
                <dd className="text-slate-700 dark:text-slate-300">{t.definition}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <button type="button" className="mt-4 text-sm text-teal-700 underline dark:text-teal-300" onClick={() => setShowStem((v) => !v)}>
        {showStem ? '問題文を閉じる' : '問題文をもう一度見る'}
      </button>
      {showStem && (
        <div className="mt-2 text-sm">
          <Stem q={q} />
        </div>
      )}

      <div className="mt-4 space-y-1 text-xs text-slate-500 dark:text-slate-400">
        <p>
          出典:{q.source}
          {q.modified && '(表記を一部改変)'}
        </p>
        <p>解説・たとえ・用語説明はAIが生成したもので、誤りを含む可能性があります。</p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
        <a
          href={`${q.pdfUrl}#page=${q.pdfPage}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-2 text-center dark:border-slate-700 dark:bg-slate-900"
        >
          原文を見る
        </a>
        <button
          type="button"
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-2 dark:border-slate-700 dark:bg-slate-900"
          onClick={async () => ctx.toast((await copyText(explainPrompt)) ? 'コピーした。Claudeアプリに貼ってね' : 'コピーできませんでした')}
        >
          新人に説明する
        </button>
        <button
          type="button"
          className={`min-h-12 rounded-xl border px-2 ${
            flagged ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200' : 'border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'
          }`}
          onClick={() => {
            ctx.update((p) => toggleFlag(p, q.id));
            ctx.toast(flagged ? '報告を取り消した' : '報告した。この問題は今後出題しない');
          }}
        >
          {flagged ? '報告済み' : 'おかしい'}
        </button>
      </div>

      <BottomBar>
        <Button onClick={() => ctx.update((p) => nextQuestion(p, ctx.all))}>{last ? '結果を見る' : '次へ'}</Button>
      </BottomBar>
    </>
  );
}

function Result({ ctx }: { ctx: Ctx }) {
  const s = ctx.progress.session!;
  const score = sessionScore(ctx.progress, ctx.all);
  const gained = ctx.progress.company.valuation - s.valuationBefore;
  const passed = s.kind === 'audit' ? auditPassed(score) : null;

  return (
    <>
      <Card className="text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">{s.kind === 'audit' ? '監査結果' : '案件完了'}</p>
        <p className="mt-2 text-4xl font-bold tabular-nums">
          {score.correct} / {score.total}
        </p>
        {passed !== null && (
          <p className={`mt-2 font-bold ${passed ? 'text-teal-600 dark:text-teal-300' : 'text-rose-600 dark:text-rose-300'}`}>
            {passed ? '監査クリア!ボーナス獲得' : '監査は持ち越し。間違えた問題はまた出てくる'}
          </p>
        )}
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">企業評価額</p>
        <p className="text-xl font-bold">
          {formatValuation(ctx.progress.company.valuation)} <span className="text-base text-teal-600 dark:text-teal-300">(+{formatValuation(gained)})</span>
        </p>
      </Card>

      {s.newTerms.length > 0 && (
        <Card className="mt-4">
          <h2 className="font-bold">📚 社内Wikiに追加された用語</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {s.newTerms.map((t) => (
              <span key={t} className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-900 dark:bg-amber-900 dark:text-amber-100">
                {t}
              </span>
            ))}
          </div>
        </Card>
      )}

      <BottomBar>
        <Button onClick={() => ctx.update(closeSession)}>ホームへ</Button>
      </BottomBar>
    </>
  );
}

/** 選択肢が図だけの問題の、文字の代わりの印 */
function isPlaceholder(text: string): boolean {
  return text.trim() === '（図は原文参照）';
}

/** 問題文。図表問題は問題冊子から切り出した画像を表示する(タップで拡大) */
function Stem({ q }: { q: Question }) {
  if (q.figure) {
    const src = import.meta.env.BASE_URL + q.figure;
    return (
      <Card className="p-2">
        <a href={src} target="_blank" rel="noreferrer">
          <img src={src} alt={q.stem} className="w-full rounded-lg bg-white" loading="lazy" />
        </a>
        <p className="mt-1 px-2 text-xs text-slate-500 dark:text-slate-400">問題冊子から切り出した画像です。タップで拡大できます。</p>
      </Card>
    );
  }
  return (
    <Card>
      <RichText text={q.stem} />
    </Card>
  );
}

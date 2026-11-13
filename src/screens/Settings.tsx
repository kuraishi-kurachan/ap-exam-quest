import { useState } from 'react';
import type { Ctx } from '../App';
import { Button, Card } from '../components/ui';
import { copyText } from '../lib/clipboard';
import { clearProgress, exportProgress, newProgress, parseProgress } from '../storage/progress';

export default function Settings({ ctx }: { ctx: Ctx }) {
  const { progress } = ctx;
  const [name, setName] = useState(progress.company.name);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const flagged = ctx.all.filter((q) => progress.questions[q.id]?.flagged);
  const answered = Object.keys(progress.questions).length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">設定</h1>

      <Card>
        <h2 className="font-bold">会社名</h2>
        <div className="mt-2 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
          <Button
            variant="secondary"
            disabled={!name.trim() || name === progress.company.name}
            onClick={() => {
              ctx.update((p) => ({ ...p, company: { ...p.company, name: name.trim() } }));
              ctx.toast('会社名を変えた');
            }}
          >
            保存
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="font-bold">学習記録のバックアップ</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          記録はこの端末のブラウザの中だけにあります(解いた問題 {answered}問)。機種変更やブラウザのデータ削除に備えて、ときどき書き出してメモなどに保存してください。
        </p>
        <Button
          className="mt-3 w-full"
          variant="secondary"
          onClick={async () => {
            if (await copyText(exportProgress(progress))) {
              ctx.update((p) => ({ ...p, lastExportAt: ctx.today }));
              ctx.toast('学習記録をコピーした');
            } else {
              ctx.toast('コピーできませんでした');
            }
          }}
        >
          書き出す(コピー){progress.lastExportAt && `・前回 ${progress.lastExportAt}`}
        </Button>
        <textarea
          value={importText}
          onChange={(e) => {
            setImportText(e.target.value);
            setImportError(null);
          }}
          placeholder="書き出した文字列をここに貼り付け"
          rows={3}
          className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900"
        />
        {importError && <p className="mt-1 text-sm text-rose-600">{importError}</p>}
        <Button
          className="mt-2 w-full"
          variant="secondary"
          disabled={!importText.trim()}
          onClick={() => {
            try {
              const p = parseProgress(importText);
              if (!confirm('今の記録を、貼り付けた記録で上書きしますか?')) return;
              ctx.update(() => p);
              setImportText('');
              ctx.toast('読み込んだ');
            } catch (e) {
              setImportError((e as Error).message);
            }
          }}
        >
          読み込む(上書き)
        </Button>
      </Card>

      <Card>
        <h2 className="font-bold">「おかしい」と報告した問題({flagged.length})</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">報告した問題は出題されません。一覧をコピーして修正依頼に使ってください。</p>
        {flagged.length > 0 && (
          <>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {flagged.map((q) => (
                <li key={q.id}>{q.source}</li>
              ))}
            </ul>
            <Button
              className="mt-3 w-full"
              variant="secondary"
              onClick={async () =>
                ctx.toast((await copyText(flagged.map((q) => `${q.id}\t${q.source}`).join('\n'))) ? '一覧をコピーした' : 'コピーできませんでした')
              }
            >
              一覧をコピー
            </Button>
          </>
        )}
      </Card>

      <Card className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <h2 className="font-bold text-slate-900 dark:text-slate-100">出典とライセンス</h2>
        <p>
          問題は、独立行政法人情報処理推進機構(IPA)が公表している応用情報技術者試験の過去問題を使用しています。各問題に出典(年度・期・試験区分・時間区分・問番号)を表示しています。表や数式などの表記をテキスト向けに変えた問題には「表記を一部改変」と表示しています。
        </p>
        <p>解説・業務たとえ・用語説明はAIが生成したもので、誤りを含む可能性があります。正解は IPA 公表の解答例に基づいています。</p>
        <p>収録: {ctx.exams.map((e) => `${e.label}(${e.questions.length}問)`).join('、')}</p>
      </Card>

      <Card>
        <h2 className="font-bold text-rose-600">記録をすべて消す</h2>
        <Button
          className="mt-2 w-full"
          variant="danger"
          onClick={() => {
            if (!confirm('学習記録をすべて消します。元に戻せません。よろしいですか?')) return;
            if (!confirm('本当に消しますか?(バックアップは取りましたか?)')) return;
            clearProgress();
            ctx.update(() => newProgress());
            ctx.toast('記録を消した');
          }}
        >
          すべて消す
        </Button>
      </Card>
    </div>
  );
}

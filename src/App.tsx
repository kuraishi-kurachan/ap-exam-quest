import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Toast } from './components/ui';
import { loadExams } from './data/exams';
import { today as getToday } from './logic/date';
import { startSession } from './logic/play';
import { eligiblePool } from './logic/select';
import Home from './screens/Home';
import MapScreen from './screens/MapScreen';
import Play from './screens/Play';
import Settings from './screens/Settings';
import Wiki from './screens/Wiki';
import { loadProgress, saveProgress } from './storage/progress';
import type { Exam, Progress, Question, SessionKind } from './types';

/** 各画面に渡す共通の道具一式 */
export type Ctx = {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  exams: Exam[];
  all: Question[]; // 全問題(図表問題も含む)
  pool: Question[]; // 出題対象
  today: string;
  toast: (message: string) => void;
  /** イベント・監査を始める(保留中のものがあれば上書きする) */
  start: (kind: SessionKind, major?: string) => void;
  /** 進行中の案件を保留してタブ画面に戻る/再開する */
  suspend: () => void;
  resume: () => void;
};

type Tab = 'home' | 'map' | 'wiki' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'home', label: 'ホーム', icon: '🏢' },
  { id: 'map', label: '部門', icon: '🗺️' },
  { id: 'wiki', label: '社内Wiki', icon: '📚' },
  { id: 'settings', label: '設定', icon: '⚙️' },
];

export default function App() {
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('home');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const [suspended, setSuspended] = useState(false);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    loadExams()
      .then(setExams)
      .catch((e) => setLoadError(String(e)));
  }, []);

  // 変更があるたびに端末へ保存(途中で閉じても続きから再開できる)
  useEffect(() => {
    setSaveFailed(!saveProgress(progress));
  }, [progress]);

  const toast = useCallback((message: string) => {
    setToastMsg(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const all = useMemo(() => exams?.flatMap((e) => e.questions) ?? [], [exams]);
  const pool = useMemo(() => eligiblePool(all, progress), [all, progress]);
  const today = getToday();

  if (loadError) return <Center>問題データを読み込めませんでした。{loadError}</Center>;
  if (!exams) return <Center>読み込み中…</Center>;

  const ctx: Ctx = {
    progress,
    update: setProgress,
    exams,
    all,
    pool,
    today,
    toast,
    start: (kind, major) => {
      setProgress((p) => startSession(p, eligiblePool(all, p), getToday(), Math.random, kind, major));
      setSuspended(false);
    },
    suspend: () => setSuspended(true),
    resume: () => setSuspended(false),
  };

  return (
    <>
      <Toast message={toastMsg} />
      {saveFailed && (
        <div className="bg-rose-600 px-4 py-2 text-center text-sm text-white">記録を保存できませんでした。プライベートモードでは保存されません。</div>
      )}
      {progress.session && !suspended ? (
        <Play ctx={ctx} />
      ) : (
        <div className="mx-auto max-w-md px-4 pt-4 pb-44">
          {tab === 'home' && <Home ctx={ctx} />}
          {tab === 'map' && <MapScreen ctx={ctx} />}
          {tab === 'wiki' && <Wiki ctx={ctx} />}
          {tab === 'settings' && <Settings ctx={ctx} />}
          <nav className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
            <div className="mx-auto grid max-w-md grid-cols-4">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex min-h-14 flex-col items-center justify-center text-xs ${
                    tab === t.id ? 'font-bold text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <span className="text-xl leading-none" aria-hidden>
                    {t.icon}
                  </span>
                  <span className="mt-1">{t.label}</span>
                </button>
              ))}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh items-center justify-center p-6 text-center text-slate-500">{children}</div>;
}

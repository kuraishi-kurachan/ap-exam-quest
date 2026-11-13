// 共通の部品
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANT: Record<Variant, string> = {
  primary: 'bg-teal-700 text-white active:bg-teal-800 disabled:bg-slate-400 dark:bg-teal-600 dark:active:bg-teal-700 dark:disabled:bg-slate-700',
  secondary:
    'bg-white text-slate-800 border border-slate-300 active:bg-slate-100 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 dark:active:bg-slate-700',
  danger: 'bg-rose-600 text-white active:bg-rose-700',
  ghost: 'text-teal-700 active:bg-teal-50 dark:text-teal-300 dark:active:bg-slate-800',
};

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`min-h-12 rounded-xl px-4 py-3 font-bold transition-colors disabled:cursor-not-allowed ${VARIANT[variant]} ${className}`}
      {...rest}
    />
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-white p-4 shadow-sm dark:bg-slate-900 ${className}`}>{children}</div>;
}

/** 画面下に固定する操作エリア(片手の親指で押せる位置) */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-slate-50/95 px-4 pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-md flex-col gap-2">{children}</div>
    </div>
  );
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 ${className}`}>
      <div className="h-full rounded-full bg-teal-600 dark:bg-teal-400" style={{ width: `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` }} />
    </div>
  );
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 flex justify-center px-4">
      <div className="rounded-full bg-slate-900/90 px-4 py-2 text-sm text-white shadow-lg dark:bg-slate-100/90 dark:text-slate-900">{message}</div>
    </div>
  );
}

export const KANA = ['ア', 'イ', 'ウ', 'エ'] as const;

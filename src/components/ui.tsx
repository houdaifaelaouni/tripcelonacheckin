import React from 'react';
import { Loader2, X } from 'lucide-react';

/*
 * Buttons are pills.
 * - primary: deep green, for confident actions on white.
 * - accent: neon green with deep-green text; only ONE per area (pay, book, board).
 * - secondary: white pill with a 1.5px outline.
 * - share: soft mint, for sending things on WhatsApp.
 */
type BtnVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'share';

const btn: Record<BtnVariant, string> = {
  primary: 'bg-brand text-paper hover:bg-brand-dark active:bg-pressed disabled:bg-line disabled:text-muted',
  accent: 'bg-accent text-ink border-[1.5px] border-moss hover:bg-accent-hover active:bg-pressed active:text-paper disabled:bg-line disabled:border-line disabled:text-muted',
  secondary: 'bg-white text-ink border-[1.5px] border-line hover:border-ink disabled:text-muted',
  ghost: 'text-ink hover:bg-paper',
  danger: 'bg-white text-alert-ink border-[1.5px] border-alert hover:border-alert-ink',
  share: 'bg-mint text-ink border-[1.5px] border-moss/50 hover:border-moss',
};

export function Button({
  variant = 'primary',
  loading,
  className = '',
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-bold transition-colors disabled:cursor-not-allowed ${btn[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

/** Flat, bordered, 8px. No shadows: borders separate, not elevation. */
export function Card({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`rounded-lg border border-line bg-white p-5 ${className}`}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block px-1 text-[13px] text-muted">{hint}</span>}
    </label>
  );
}

export const inputCls =
  'w-full min-h-12 rounded-full border-[1.5px] border-line bg-white px-5 py-2.5 text-base text-ink outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-ink';

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} appearance-none bg-[length:12px] bg-[right_1.25rem_center] bg-no-repeat pr-10 ${props.className || ''}`} style={{ backgroundImage: CHEVRON }} />;
}

const CHEVRON = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5l5-5' fill='none' stroke='%23002B11' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`;

const tones = {
  gray: 'bg-paper text-body border border-line',
  blue: 'bg-mint text-ink', // brand/neutral info (name kept for call sites)
  green: 'bg-moss/12 text-[#00702b]',
  amber: 'bg-gold-soft text-[#5c3b00]',
  red: 'bg-alert text-alert-ink',
};

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold leading-none ${tones[tone]}`}>{children}</span>;
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label && <span className="text-sm">{label}</span>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start justify-between gap-3 rounded-lg bg-alert px-4 py-3 text-sm font-medium text-alert-ink">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-bold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-lg border-[1.5px] border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="text-lg font-extrabold text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-body">{children}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={`max-h-[92vh] w-full overflow-y-auto rounded-t-xl2 bg-white p-5 sm:rounded-xl2 sm:p-7 ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold text-ink">{title}</h2>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-line text-ink hover:border-ink" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white px-4 py-4">
      <div className="text-sm font-bold text-body">{label}</div>
      <div className="mt-1 text-[28px] font-black leading-tight text-ink">{value}</div>
      {sub && <div className="mt-0.5 text-[13px] text-muted">{sub}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-black leading-tight text-ink md:text-[32px]">{title}</h1>
        {sub && <p className="mt-1.5 max-w-2xl text-[15px] text-body">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Tripcelona mark: deep green tile, neon bus. */
export function Logo({ size = 36 }: { size?: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-brand" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="#00EB5B" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 17V7a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v10" />
        <path d="M4 17h16M5 11h14M8 20v-3M16 20v-3" />
        <circle cx="8.5" cy="14" r=".6" fill="#00EB5B" />
        <circle cx="15.5" cy="14" r=".6" fill="#00EB5B" />
      </svg>
    </span>
  );
}

import React from 'react';
import { Logo } from '../../components/ui';

export function PublicShell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4 md:px-6">
          <Logo size={38} />
          <div className="leading-tight">
            <a href="https://tripcelona.com" className="block text-lg font-black text-ink">
              Tripcelona
            </a>
            <span className="text-[13px] text-body">{subtitle && subtitle !== 'Tripcelona' ? subtitle : 'Day trips from Barcelona'}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-10">{children}</main>
    </div>
  );
}

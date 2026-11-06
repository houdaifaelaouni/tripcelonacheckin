import React from 'react';
import { Bus } from 'lucide-react';

export function PublicShell({ subtitle, children }: { subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-2.5 px-4 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white">
            <Bus className="h-5 w-5" />
          </span>
          <div>
            <a href="https://tripcelona.com" className="block font-bold leading-tight text-ink">
              Tripcelona
            </a>
            <span className="text-xs text-muted">{subtitle && subtitle !== 'Tripcelona' ? subtitle : 'Day trips from Barcelona'}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}

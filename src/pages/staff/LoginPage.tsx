import React, { useEffect, useState } from 'react';
import { KeyRound } from 'lucide-react';
import type { SessionInfo } from '../../../shared/types';
import { api, errorText, saveSession } from '../../lib/api';
import { googleIdToken } from '../../lib/googleSignIn';
import { navigate } from '../../lib/router';
import { Button, Card, ErrorBox, Field, Input, Logo } from '../../components/ui';

export function LoginPage() {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState<'key' | 'google' | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const done = (s: SessionInfo) => {
    saveSession(s);
    navigate('/app', true);
  };

  async function withKey(k: string) {
    setErr(null);
    setBusy('key');
    try {
      done(await api<SessionInfo>('/auth/key', { body: { key: k } }));
    } catch (e) {
      setErr(errorText(e));
      setBusy(null);
    }
  }

  // Invite links carry the key in the #fragment (never sent to servers or logs).
  useEffect(() => {
    const m = location.hash.match(/key=([A-Za-z0-9-]+)/);
    if (m) {
      history.replaceState(null, '', '/login');
      setKey(m[1]);
      withKey(m[1]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function withGoogle() {
    setErr(null);
    setBusy('google');
    try {
      const idToken = await googleIdToken();
      done(await api<SessionInfo>('/auth/google', { body: { idToken } }));
    } catch (e) {
      setErr(errorText(e).replace('Firebase: ', ''));
      setBusy(null);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <Logo size={44} />
          <div>
            <div className="text-xl font-black leading-tight text-ink">Tripcelona</div>
            <div className="text-[13px] text-body">Team access</div>
          </div>
        </div>

        <Card>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              withKey(key);
            }}
            className="space-y-3"
          >
            <Field label="Access key" hint="Drivers, sellers and coordinators: use the key or invite link the owner sent you.">
              <Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="TCK-XXXXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" spellCheck={false} />
            </Field>
            <Button type="submit" className="w-full" loading={busy === 'key'} disabled={!key.trim() || !!busy}>
              <KeyRound className="h-4 w-4" /> Sign in with key
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-[13px] font-bold text-body">
            <span className="h-px flex-1 bg-line" />
            Owner or partner
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" className="w-full" onClick={withGoogle} loading={busy === 'google'} disabled={!!busy}>
            Continue with Google
          </Button>

          {err && (
            <div className="mt-4">
              <ErrorBox message={err} />
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

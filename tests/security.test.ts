import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  signSession, verifySession, issueAccessKey, parseAccessKey, verifyAccessKeySecret,
  signTicketCode, verifyTicketCode,
} from '../server/security.ts';

const S = 'test-secret';

test('session round-trip, tamper and expiry', () => {
  const t = signSession(S, { sid: 'ST1', role: 'seller', tv: 0, exp: Date.now() + 60_000 });
  assert.equal(verifySession(S, t)?.sid, 'ST1');
  assert.equal(verifySession('other', t), null);
  const [body, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ sid: 'ST1', role: 'owner', tv: 0, exp: Date.now() + 60_000 })).toString('base64url');
  assert.equal(verifySession(S, `${forged}.${sig}`), null);
  assert.equal(verifySession(S, signSession(S, { sid: 'x', role: 'driver', tv: 0, exp: Date.now() - 1 })), null);
  assert.equal(verifySession(S, body), null);
});

test('access keys verify only with the right secret', () => {
  const k = issueAccessKey();
  const p = parseAccessKey(k.key.toLowerCase());
  assert.ok(p);
  assert.equal(p!.lookupId, k.lookupId);
  assert.ok(verifyAccessKeySecret(p!.secret, k.hash));
  assert.ok(!verifyAccessKeySecret('AAAA-BBBB-CCCC', k.hash));
  assert.equal(parseAccessKey('garbage'), null);
});

test('ticket codes are signed', () => {
  const c = signTicketCode(S, 'TABCDEFGHJK');
  assert.equal(verifyTicketCode(S, c), 'TABCDEFGHJK');
  assert.equal(verifyTicketCode(S, `https://x.com/pass/${c}`), 'TABCDEFGHJK');
  assert.equal(verifyTicketCode(S, c.replace('TABCDEFGHJK', 'TABCDEFGHJM')), null);
  assert.equal(verifyTicketCode('other', c), null);
});

import { describe, expect, it } from 'vitest';
import { extractEmailFromIdToken } from '../../src/auth/jwt.js';
import { parseBackupInput } from '../../src/auth/validation.js';
import { AppError } from '../../src/core/errors.js';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.sig`;
}

describe('auth validation & JWT decoding', () => {
  it('extracts email from valid id_token JWT and handles malformed tokens safely', () => {
    const jwt = makeJwt({ email: 'dev@example.com', sub: '123' });
    expect(extractEmailFromIdToken(jwt)).toBe('dev@example.com');
    expect(extractEmailFromIdToken(undefined)).toBeNull();
    expect(extractEmailFromIdToken('not-a-jwt')).toBeNull();
    expect(extractEmailFromIdToken('a.!!!.c')).toBeNull();
  });

  it('accepts wrapped plain envelope and raw agy credential JSON', () => {
    const rawCred = {
      token: { access_token: 'acc', refresh_token: 'ref', expiry: '2026-12-01T00:00:00Z' },
      auth_method: 'oauth-personal',
      id_token: makeJwt({ email: 'user@example.com' }),
    };

    const parsedRaw = parseBackupInput(JSON.stringify(rawCred));
    expect(parsedRaw.kind).toBe('raw-credential');

    const wrapped = {
      format: 'agy-tools-auth',
      version: 1,
      exportedAt: '2026-11-15T12:00:00.000Z',
      account: { email: 'user@example.com', authMethod: 'oauth-personal', expiry: null },
      encrypted: false,
      credential: rawCred,
    };
    const parsedWrapped = parseBackupInput(JSON.stringify(wrapped));
    expect(parsedWrapped.kind).toBe('plain-envelope');
  });

  it('throws AUTH_INVALID_FORMAT on missing token or malformed JSON (AC-105)', () => {
    for (const bad of ['{invalid', '{}', '{"auth_method":"oauth-personal"}', '{"token":{},"auth_method":"x"}']) {
      try {
        parseBackupInput(bad);
        expect.unreachable('Expected parseBackupInput to throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('AUTH_INVALID_FORMAT');
        expect((err as AppError).exitCode).toBe(3);
      }
    }
  });
});

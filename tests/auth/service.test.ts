import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { FileFallbackKeyringAdapter } from '../../src/auth/keyring/file-fallback.js';
import type { KeyringAdapter } from '../../src/auth/keyring/types.js';
import {
  applyImportedCredential,
  backupAuth,
  getAuthStatus,
  inspectImportFile,
} from '../../src/auth/service.js';

function makeJwt(email: string): string {
  const h = Buffer.from('{"alg":"none"}').toString('base64url');
  const p = Buffer.from(JSON.stringify({ email })).toString('base64url');
  return `${h}.${p}.`;
}

function makeMemoryKeyring(initial: string | null = null): {
  adapter: KeyringAdapter;
  getStored: () => string | null;
} {
  let stored = initial;
  return {
    adapter: {
      sourceKind: 'keyring',
      isAvailable: async () => true,
      read: async () => stored,
      write: async (val) => {
        stored = val;
      },
    },
    getStored: () => stored,
  };
}

describe('auth service (backup, import, status)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-tools-auth-'));
    tempDirs.push(dir);
    return dir;
  }

  it('backs up plain and encrypted single-account JSON and imports back cleanly (AC-101..AC-103, AC-106)', async () => {
    const dir = makeTempDir();
    const rawCred = {
      token: {
        access_token: 'ya29.secret-access',
        refresh_token: '1//secret-refresh',
        token_type: 'Bearer',
        expiry: '2026-12-01T00:00:00Z',
      },
      auth_method: 'oauth-personal',
      id_token: makeJwt('alice@example.com'),
    };

    const mem = makeMemoryKeyring(JSON.stringify(rawCred));
    const deps = {
      readActive: async () => {
        const val = await mem.adapter.read();
        return val ? { rawJson: val, adapter: mem.adapter } : null;
      },
      resolveWriter: async () => mem.adapter,
    };

    const plainOut = path.join(dir, 'plain.json');
    const plainRes = await backupAuth({ outputPath: plainOut }, deps);
    expect(plainRes.encrypted).toBe(false);
    expect(plainRes.account.email).toBe('alice@example.com');
    const plainContent = fs.readFileSync(plainOut, 'utf8');
    expect(plainContent).toContain('"agy-tools-auth"');
    expect(plainContent).toContain('1//secret-refresh');

    const encOut = path.join(dir, 'enc.json');
    const encRes = await backupAuth(
      { outputPath: encOut, encrypt: true, passphrase: 'my-password' },
      deps,
    );
    expect(encRes.encrypted).toBe(true);
    const encContent = fs.readFileSync(encOut, 'utf8');
    expect(encContent).not.toContain('1//secret-refresh');
    expect(encContent).not.toContain('ya29.secret-access');

    // Clear keyring and test dry-run import first
    await mem.adapter.write('');
    const inspected = inspectImportFile(encOut);
    expect(inspected.encrypted).toBe(true);
    const resolved = inspected.resolveCredential('my-password');
    expect(resolved.account.email).toBe('alice@example.com');

    const dryResult = await applyImportedCredential(resolved.credential, { dryRun: true }, deps);
    expect(dryResult.applied).toBe(false);
    expect(mem.getStored()).toBe('');

    // Real import
    const realResult = await applyImportedCredential(resolved.credential, { dryRun: false }, deps);
    expect(realResult.applied).toBe(true);
    expect(realResult.importedAccount.email).toBe('alice@example.com');

    const status = await getAuthStatus({}, deps);
    expect(status.authenticated).toBe(true);
    expect(status.account?.email).toBe('alice@example.com');
  });

  it('supports file fallback adapter read/write (AC-107)', async () => {
    const fakeHome = makeTempDir();
    const fallback = new FileFallbackKeyringAdapter(fakeHome);

    expect(await fallback.read()).toBeNull();
    const payload = JSON.stringify({
      token: { refresh_token: '1//fallback-token' },
      auth_method: 'oauth-personal',
      id_token: makeJwt('headless@example.com'),
    });
    await fallback.write(payload);

    expect(fs.existsSync(fallback.tokenPath)).toBe(true);
    expect(await fallback.read()).toBe(payload);
  });
});

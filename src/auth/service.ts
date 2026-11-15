import fs from 'node:fs';
import { AppError } from '../core/errors.js';
import { writeFileAtomic } from '../core/fs-atomic.js';
import { decryptCredential, encryptCredential } from './crypto.js';
import { extractAccountMeta } from './jwt.js';
import { readCredentialWithFallback, resolveKeyringAdapter } from './keyring/index.js';
import type { KeyringAdapter } from './keyring/types.js';
import type {
  AuthAccountMeta,
  AuthBackupEnvelope,
  AuthSourceKind,
  AuthStatusResult,
  RawAgyCredential,
} from './types.js';
import { parseBackupInput, validateRawCredential } from './validation.js';

export interface AuthServiceDeps {
  readActive?: (opts: { fileFallback?: boolean }) => Promise<{ rawJson: string; adapter: KeyringAdapter } | null>;
  resolveWriter?: (opts: { fileFallback?: boolean }) => Promise<KeyringAdapter>;
}

export interface BackupAuthOptions {
  outputPath: string;
  encrypt?: boolean;
  passphrase?: string;
  force?: boolean;
  fileFallback?: boolean;
}

export interface BackupAuthResult {
  outputPath: string;
  encrypted: boolean;
  source: AuthSourceKind;
  account: AuthAccountMeta;
}

export interface InspectImportResult {
  encrypted: boolean;
  account: AuthAccountMeta | null;
  resolveCredential: (passphrase?: string) => { credential: RawAgyCredential; account: AuthAccountMeta };
}

export interface ImportAuthResult {
  applied: boolean;
  targetSource: AuthSourceKind;
  previousAccount: AuthAccountMeta | null;
  importedAccount: AuthAccountMeta;
}

function parseRawCredentialText(rawJson: string): RawAgyCredential {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    throw new AppError('AUTH_INVALID_FORMAT', 'Stored agy credential is not valid JSON.', err);
  }
  return validateRawCredential(parsed);
}

/**
 * Checks whether an active agy credential exists without exposing secret tokens.
 */
export async function getAuthStatus(
  opts: { fileFallback?: boolean } = {},
  deps: AuthServiceDeps = {},
): Promise<AuthStatusResult> {
  const reader = deps.readActive ?? ((o) => readCredentialWithFallback(o));
  const found = await reader({ fileFallback: opts.fileFallback });
  if (!found) {
    return { authenticated: false, source: null, account: null };
  }

  const credential = parseRawCredentialText(found.rawJson);
  return {
    authenticated: true,
    source: found.adapter.sourceKind,
    account: extractAccountMeta(credential),
  };
}

/**
 * Exports the active agy credential to a single-account JSON file (plain or AES-256-GCM encrypted).
 */
export async function backupAuth(
  options: BackupAuthOptions,
  deps: AuthServiceDeps = {},
): Promise<BackupAuthResult> {
  if (!options.force && fs.existsSync(options.outputPath)) {
    throw new AppError(
      'CLI_INVALID_ARGS',
      `Output file already exists: ${options.outputPath}. Pass --force to overwrite.`,
    );
  }

  const reader = deps.readActive ?? ((o) => readCredentialWithFallback(o));
  const found = await reader({ fileFallback: options.fileFallback });
  if (!found) {
    throw new AppError(
      'AUTH_NOT_FOUND',
      'No active agy credential found in OS Keyring or fallback token file.',
    );
  }

  const credential = parseRawCredentialText(found.rawJson);
  const account = extractAccountMeta(credential);
  const exportedAt = new Date().toISOString();

  let envelope: AuthBackupEnvelope;
  if (options.encrypt) {
    if (!options.passphrase) {
      throw new AppError('CLI_INVALID_ARGS', 'Passphrase is required when --encrypt is enabled.');
    }
    const encrypted = encryptCredential(JSON.stringify(credential), options.passphrase);
    envelope = {
      format: 'agy-tools-auth',
      version: 1,
      exportedAt,
      account,
      encrypted: true,
      crypto: encrypted.crypto,
      ciphertext: encrypted.ciphertext,
    };
  } else {
    envelope = {
      format: 'agy-tools-auth',
      version: 1,
      exportedAt,
      account,
      encrypted: false,
      credential,
    };
  }

  writeFileAtomic(options.outputPath, `${JSON.stringify(envelope, null, 2)}\n`, { mode: 0o600 });

  return {
    outputPath: options.outputPath,
    encrypted: Boolean(options.encrypt),
    source: found.adapter.sourceKind,
    account,
  };
}

/**
 * Parses an auth backup file and returns a lazy resolver so CLI can prompt for passphrase if encrypted.
 */
export function inspectImportFile(inputPath: string): InspectImportResult {
  if (!fs.existsSync(inputPath)) {
    throw new AppError('AUTH_NOT_FOUND', `Backup file not found: ${inputPath}`);
  }
  const rawText = fs.readFileSync(inputPath, 'utf8');
  const parsed = parseBackupInput(rawText);

  if (parsed.kind === 'encrypted-envelope') {
    const env = parsed.envelope;
    return {
      encrypted: true,
      account: env.account ?? null,
      resolveCredential: (passphrase?: string) => {
        const plainText = decryptCredential(env.ciphertext, env.crypto, passphrase ?? '');
        const credential = parseRawCredentialText(plainText);
        return { credential, account: extractAccountMeta(credential) };
      },
    };
  }

  if (parsed.kind === 'plain-envelope') {
    const credential = parsed.envelope.credential;
    const account = extractAccountMeta(credential);
    return {
      encrypted: false,
      account,
      resolveCredential: () => ({ credential, account }),
    };
  }

  const credential = parsed.credential;
  const account = extractAccountMeta(credential);
  return {
    encrypted: false,
    account,
    resolveCredential: () => ({ credential, account }),
  };
}

/**
 * Writes a validated credential into agy's OS Keyring (or fallback file when requested).
 */
export async function applyImportedCredential(
  credential: RawAgyCredential,
  options: { dryRun?: boolean; fileFallback?: boolean } = {},
  deps: AuthServiceDeps = {},
): Promise<ImportAuthResult> {
  const reader = deps.readActive ?? ((o) => readCredentialWithFallback(o));
  const writerFactory = deps.resolveWriter ?? ((o) => resolveKeyringAdapter(o));

  const existing = await reader({ fileFallback: options.fileFallback });
  let previousAccount: AuthAccountMeta | null = null;
  if (existing) {
    try {
      previousAccount = extractAccountMeta(parseRawCredentialText(existing.rawJson));
    } catch {
      previousAccount = null;
    }
  }

  const importedAccount = extractAccountMeta(credential);
  const adapter = await writerFactory({ fileFallback: options.fileFallback });

  if (!options.dryRun) {
    await adapter.write(JSON.stringify(credential));
  }

  return {
    applied: !options.dryRun,
    targetSource: adapter.sourceKind,
    previousAccount,
    importedAccount,
  };
}

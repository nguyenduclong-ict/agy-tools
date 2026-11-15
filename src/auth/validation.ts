import { AppError } from '../core/errors.js';
import type {
  AuthBackupEncryptedEnvelope,
  AuthBackupPlainEnvelope,
  AuthCryptoMeta,
  RawAgyCredential,
} from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Validates that a parsed object conforms to agy's OAuth keyring credential shape.
 */
export function validateRawCredential(input: unknown): RawAgyCredential {
  if (!isRecord(input)) {
    throw new AppError('AUTH_INVALID_FORMAT', 'Credential payload must be a JSON object.');
  }
  if (!isRecord(input.token)) {
    throw new AppError('AUTH_INVALID_FORMAT', 'Credential payload is missing the "token" object.');
  }

  const hasRefresh = typeof input.token.refresh_token === 'string' && input.token.refresh_token.length > 0;
  const hasAccess = typeof input.token.access_token === 'string' && input.token.access_token.length > 0;
  if (!hasRefresh && !hasAccess) {
    throw new AppError(
      'AUTH_INVALID_FORMAT',
      'Credential "token" must contain a non-empty "refresh_token" or "access_token".',
    );
  }

  if (typeof input.auth_method !== 'string' || input.auth_method.trim().length === 0) {
    throw new AppError('AUTH_INVALID_FORMAT', 'Credential payload is missing a valid "auth_method" string.');
  }

  return input as RawAgyCredential;
}

export type ParsedBackupInput =
  | { kind: 'plain-envelope'; envelope: AuthBackupPlainEnvelope }
  | { kind: 'encrypted-envelope'; envelope: AuthBackupEncryptedEnvelope }
  | { kind: 'raw-credential'; credential: RawAgyCredential };

function validateCryptoMeta(input: unknown): AuthCryptoMeta {
  if (!isRecord(input)) {
    throw new AppError('AUTH_INVALID_FORMAT', 'Encrypted backup is missing "crypto" metadata.');
  }
  if (
    typeof input.cipher !== 'string' ||
    typeof input.kdf !== 'string' ||
    !isRecord(input.kdfParams) ||
    typeof input.salt !== 'string' ||
    typeof input.iv !== 'string' ||
    typeof input.tag !== 'string'
  ) {
    throw new AppError('AUTH_INVALID_FORMAT', 'Encrypted backup has malformed "crypto" metadata.');
  }
  return input as unknown as AuthCryptoMeta;
}

/**
 * Parses and validates an imported JSON file (supports wrapped plain/encrypted envelopes and raw keyring JSON).
 */
export function parseBackupInput(rawJsonText: string): ParsedBackupInput {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJsonText);
  } catch (err) {
    throw new AppError('AUTH_INVALID_FORMAT', 'Input file is not valid JSON.', err);
  }

  if (!isRecord(parsed)) {
    throw new AppError('AUTH_INVALID_FORMAT', 'Auth backup JSON root must be an object.');
  }

  if (parsed.format === 'agy-tools-auth') {
    if (parsed.version !== 1) {
      throw new AppError('AUTH_INVALID_FORMAT', `Unsupported backup version: ${String(parsed.version)}`);
    }
    if (parsed.encrypted === true) {
      if (typeof parsed.ciphertext !== 'string' || parsed.ciphertext.length === 0) {
        throw new AppError('AUTH_INVALID_FORMAT', 'Encrypted backup is missing "ciphertext".');
      }
      validateCryptoMeta(parsed.crypto);
      return {
        kind: 'encrypted-envelope',
        envelope: parsed as unknown as AuthBackupEncryptedEnvelope,
      };
    }
    if (parsed.encrypted === false) {
      validateRawCredential(parsed.credential);
      return {
        kind: 'plain-envelope',
        envelope: parsed as unknown as AuthBackupPlainEnvelope,
      };
    }
    throw new AppError('AUTH_INVALID_FORMAT', 'Backup envelope must specify boolean "encrypted".');
  }

  // Fallback: raw keyring JSON (`{ token, auth_method, id_token }`)
  const credential = validateRawCredential(parsed);
  return {
    kind: 'raw-credential',
    credential,
  };
}

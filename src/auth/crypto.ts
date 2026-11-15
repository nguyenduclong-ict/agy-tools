import crypto from 'node:crypto';
import { AppError } from '../core/errors.js';
import type { AuthCryptoMeta } from './types.js';

const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  keyLen: 32,
} as const;

export interface EncryptedPayload {
  crypto: AuthCryptoMeta;
  ciphertext: string;
}

/**
 * Encrypts a UTF-8 JSON credential string using AES-256-GCM and a scrypt-derived key.
 */
export function encryptCredential(plaintextJson: string, passphrase: string): EncryptedPayload {
  if (!passphrase) {
    throw new AppError('CLI_INVALID_ARGS', 'Passphrase must not be empty when encrypting.');
  }

  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(passphrase, salt, SCRYPT_PARAMS.keyLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
  });

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintextJson, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    crypto: {
      cipher: 'aes-256-gcm',
      kdf: 'scrypt',
      kdfParams: { ...SCRYPT_PARAMS },
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
    },
    ciphertext: encrypted.toString('base64'),
  };
}

/**
 * Decrypts an AES-256-GCM encrypted auth payload using the provided passphrase.
 */
export function decryptCredential(
  ciphertextB64: string,
  meta: AuthCryptoMeta,
  passphrase: string,
): string {
  if (!passphrase) {
    throw new AppError('CRYPTO_DECRYPT_FAILED', 'Passphrase is required to decrypt this backup.');
  }
  if (meta.cipher !== 'aes-256-gcm' || meta.kdf !== 'scrypt') {
    throw new AppError('AUTH_INVALID_FORMAT', `Unsupported encryption metadata: ${meta.cipher}/${meta.kdf}`);
  }

  try {
    const salt = Buffer.from(meta.salt, 'base64');
    const iv = Buffer.from(meta.iv, 'base64');
    const tag = Buffer.from(meta.tag, 'base64');
    const ciphertext = Buffer.from(ciphertextB64, 'base64');

    const { N, r, p, keyLen } = meta.kdfParams;
    const key = crypto.scryptSync(passphrase, salt, keyLen, { N, r, p });

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    throw new AppError(
      'CRYPTO_DECRYPT_FAILED',
      'Failed to decrypt auth backup. Verify your passphrase and file integrity.',
      err,
    );
  }
}

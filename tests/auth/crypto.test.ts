import { describe, expect, it } from 'vitest';
import { decryptCredential, encryptCredential } from '../../src/auth/crypto.js';
import { AppError } from '../../src/core/errors.js';

describe('auth crypto (AES-256-GCM + scrypt)', () => {
  it('encrypts and decrypts credential JSON with matching passphrase', () => {
    const sample = JSON.stringify({
      token: { access_token: 'ya29.test', refresh_token: '1//test', expiry: '2026-12-01T00:00:00Z' },
      auth_method: 'oauth-personal',
      id_token: 'a.b.c',
    });

    const encrypted = encryptCredential(sample, 'super-secret-pass');
    expect(encrypted.ciphertext).not.toContain('ya29.test');
    expect(encrypted.ciphertext).not.toContain('1//test');
    expect(encrypted.crypto.cipher).toBe('aes-256-gcm');

    const decrypted = decryptCredential(encrypted.ciphertext, encrypted.crypto, 'super-secret-pass');
    expect(decrypted).toBe(sample);
  });

  it('throws CRYPTO_DECRYPT_FAILED on wrong passphrase (AC-104)', () => {
    const encrypted = encryptCredential('{"token":{"refresh_token":"r"}}', 'correct-pass');

    try {
      decryptCredential(encrypted.ciphertext, encrypted.crypto, 'wrong-pass');
      expect.unreachable('Expected decryptCredential to throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('CRYPTO_DECRYPT_FAILED');
      expect((err as AppError).exitCode).toBe(5);
    }
  });

  it('throws CRYPTO_DECRYPT_FAILED when GCM auth tag is tampered', () => {
    const encrypted = encryptCredential('{"token":{"refresh_token":"r"}}', 'pass');
    const badTag = Buffer.alloc(16, 0xff).toString('base64');

    expect(() =>
      decryptCredential(encrypted.ciphertext, { ...encrypted.crypto, tag: badTag }, 'pass'),
    ).toThrowError(AppError);
  });
});

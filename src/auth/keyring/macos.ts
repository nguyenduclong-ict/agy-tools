import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { AppError } from '../../core/errors.js';
import { KEYRING_ACCOUNT, KEYRING_SERVICE, type KeyringAdapter } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * macOS Keychain adapter backed by `/usr/bin/security`.
 */
export class MacosKeyringAdapter implements KeyringAdapter {
  public readonly sourceKind = 'keyring' as const;

  public async isAvailable(): Promise<boolean> {
    return process.platform === 'darwin';
  }

  public async read(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(
        '/usr/bin/security',
        ['find-generic-password', '-s', KEYRING_SERVICE, '-a', KEYRING_ACCOUNT, '-w'],
        { encoding: 'utf8' },
      );
      return stdout.trim();
    } catch (err) {
      const exitCode = (err as { code?: number })?.code;
      // 44 = errSecItemNotFound
      if (exitCode === 44) {
        return null;
      }
      throw new AppError(
        'AUTH_KEYRING_UNAVAILABLE',
        `macOS Keychain read failed: ${(err as Error).message}`,
        err,
      );
    }
  }

  public async write(payloadUtf8: string): Promise<void> {
    try {
      await execFileAsync(
        '/usr/bin/security',
        ['add-generic-password', '-U', '-s', KEYRING_SERVICE, '-a', KEYRING_ACCOUNT, '-w', payloadUtf8],
        { encoding: 'utf8' },
      );
    } catch (err) {
      throw new AppError(
        'AUTH_KEYRING_UNAVAILABLE',
        `macOS Keychain write failed: ${(err as Error).message}`,
        err,
      );
    }
  }
}

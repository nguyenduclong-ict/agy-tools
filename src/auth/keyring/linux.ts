import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { AppError } from '../../core/errors.js';
import { KEYRING_ACCOUNT, KEYRING_SERVICE, WINDOWS_CRED_TARGET, type KeyringAdapter } from './types.js';

const execFileAsync = promisify(execFile);

/**
 * Linux Secret Service adapter backed by `secret-tool` (libsecret).
 */
export class LinuxKeyringAdapter implements KeyringAdapter {
  public readonly sourceKind = 'keyring' as const;

  public async isAvailable(): Promise<boolean> {
    if (process.platform !== 'linux' || !process.env.DBUS_SESSION_BUS_ADDRESS) {
      return false;
    }
    try {
      await execFileAsync('which', ['secret-tool']);
      return true;
    } catch {
      return false;
    }
  }

  public async read(): Promise<string | null> {
    try {
      const { stdout } = await execFileAsync(
        'secret-tool',
        ['lookup', 'service', KEYRING_SERVICE, 'account', KEYRING_ACCOUNT],
        { encoding: 'utf8' },
      );
      const trimmed = stdout.trim();
      return trimmed.length > 0 ? trimmed : null;
    } catch (err) {
      const exitCode = (err as { code?: number })?.code;
      if (exitCode === 1) {
        return null;
      }
      throw new AppError(
        'AUTH_KEYRING_UNAVAILABLE',
        `Linux Secret Service read failed: ${(err as Error).message}`,
        err,
      );
    }
  }

  public async write(payloadUtf8: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        'secret-tool',
        ['store', `--label=${WINDOWS_CRED_TARGET}`, 'service', KEYRING_SERVICE, 'account', KEYRING_ACCOUNT],
        { stdio: ['pipe', 'pipe', 'pipe'] },
      );
      const stderr: Buffer[] = [];
      child.stderr.on('data', (d: Buffer) => stderr.push(d));
      child.on('error', (err) => {
        reject(new AppError('AUTH_KEYRING_UNAVAILABLE', `Linux Secret Service write failed: ${err.message}`, err));
      });
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(
            new AppError(
              'AUTH_KEYRING_UNAVAILABLE',
              `Linux Secret Service write failed: ${Buffer.concat(stderr).toString('utf8').trim()}`,
            ),
          );
        }
      });
      child.stdin.write(payloadUtf8, 'utf8');
      child.stdin.end();
    });
  }
}

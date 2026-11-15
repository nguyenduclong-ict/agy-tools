import os from 'node:os';
import { AppError } from '../../core/errors.js';
import { FileFallbackKeyringAdapter } from './file-fallback.js';
import { LinuxKeyringAdapter } from './linux.js';
import { MacosKeyringAdapter } from './macos.js';
import type { KeyringAdapter } from './types.js';
import { WindowsKeyringAdapter } from './windows.js';

export interface KeyringResolverOptions {
  fileFallback?: boolean;
  homeDir?: string;
}

function getNativeAdapter(): KeyringAdapter | null {
  switch (process.platform) {
    case 'win32':
      return new WindowsKeyringAdapter();
    case 'darwin':
      return new MacosKeyringAdapter();
    case 'linux':
      return new LinuxKeyringAdapter();
    default:
      return null;
  }
}

/**
 * Resolves the active credential adapter for the current OS, falling back to file storage on headless systems.
 */
export async function resolveKeyringAdapter(options: KeyringResolverOptions = {}): Promise<KeyringAdapter> {
  const homeDir = options.homeDir ?? os.homedir();
  const fallback = new FileFallbackKeyringAdapter(homeDir);

  if (options.fileFallback) {
    return fallback;
  }

  const native = getNativeAdapter();
  if (native && (await native.isAvailable())) {
    return native;
  }

  return fallback;
}

/**
 * Reads credential JSON from primary OS keyring, falling back to file storage if absent or unavailable.
 */
export async function readCredentialWithFallback(
  options: KeyringResolverOptions = {},
): Promise<{ rawJson: string; adapter: KeyringAdapter } | null> {
  const homeDir = options.homeDir ?? os.homedir();
  const fallback = new FileFallbackKeyringAdapter(homeDir);

  if (options.fileFallback) {
    const raw = await fallback.read();
    return raw ? { rawJson: raw, adapter: fallback } : null;
  }

  const native = getNativeAdapter();
  if (native && (await native.isAvailable())) {
    try {
      const raw = await native.read();
      if (raw) {
        return { rawJson: raw, adapter: native };
      }
    } catch (err) {
      if (!(err instanceof AppError) || err.code !== 'AUTH_KEYRING_UNAVAILABLE') {
        throw err;
      }
    }
  }

  const fallbackRaw = await fallback.read();
  return fallbackRaw ? { rawJson: fallbackRaw, adapter: fallback } : null;
}

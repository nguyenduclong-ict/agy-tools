import type { AuthSourceKind } from '../types.js';

export const KEYRING_SERVICE = 'gemini';
export const KEYRING_ACCOUNT = 'antigravity';
export const WINDOWS_CRED_TARGET = `${KEYRING_SERVICE}:${KEYRING_ACCOUNT}`;

export interface KeyringAdapter {
  readonly sourceKind: AuthSourceKind;
  isAvailable(): Promise<boolean>;
  read(): Promise<string | null>;
  write(payloadUtf8: string): Promise<void>;
}

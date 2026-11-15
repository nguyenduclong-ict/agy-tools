import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir, writeFileAtomic } from '../../core/fs-atomic.js';
import type { KeyringAdapter } from './types.js';

/**
 * File-based token adapter reading/writing `~/.gemini/antigravity-cli/antigravity-oauth-token`.
 */
export class FileFallbackKeyringAdapter implements KeyringAdapter {
  public readonly sourceKind = 'file-fallback' as const;
  public readonly tokenPath: string;

  constructor(homeDir: string = os.homedir()) {
    this.tokenPath = path.join(homeDir, '.gemini', 'antigravity-cli', 'antigravity-oauth-token');
  }

  public async isAvailable(): Promise<boolean> {
    return true;
  }

  public async read(): Promise<string | null> {
    if (!fs.existsSync(this.tokenPath)) {
      return null;
    }
    const content = fs.readFileSync(this.tokenPath, 'utf8').trim();
    return content.length > 0 ? content : null;
  }

  public async write(payloadUtf8: string): Promise<void> {
    ensureDir(path.dirname(this.tokenPath), 0o700);
    writeFileAtomic(this.tokenPath, payloadUtf8, { mode: 0o600 });
  }
}

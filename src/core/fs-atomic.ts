import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { AppError } from './errors.js';

export interface WriteOptions {
  mode?: number;
}

/**
 * Ensures a directory exists, creating missing parent directories recursively.
 */
export function ensureDir(dirPath: string, mode?: number): void {
  fs.mkdirSync(dirPath, { recursive: true, ...(mode !== undefined ? { mode } : {}) });
}

/**
 * Atomically writes text or binary content to targetPath using a temporary sibling file.
 */
export function writeFileAtomic(targetPath: string, content: string | Buffer, options: WriteOptions = {}): void {
  const dir = path.dirname(targetPath);
  ensureDir(dir);

  const tmpName = `.tmp-${process.pid}-${crypto.randomBytes(6).toString('hex')}`;
  const tmpPath = path.join(dir, tmpName);

  try {
    fs.writeFileSync(tmpPath, content, options.mode !== undefined ? { mode: options.mode } : undefined);
    fs.renameSync(tmpPath, targetPath);
    if (options.mode !== undefined && process.platform !== 'win32') {
      fs.chmodSync(targetPath, options.mode);
    }
  } catch (err) {
    if (fs.existsSync(tmpPath)) {
      fs.rmSync(tmpPath, { force: true });
    }
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EACCES' || code === 'EPERM') {
      throw new AppError('FS_PERMISSION_DENIED', `Permission denied writing ${targetPath}`, err);
    }
    throw err;
  }
}

/**
 * Reads and parses a JSON file safely, returning null when the file does not exist.
 */
export function readJsonIfExists<T = unknown>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw) as T;
}

/**
 * Formats local timestamp compactly for fallback .bak.<timestamp> suffixes.
 */
function formatTimestamp(date: Date): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-` +
    `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

/**
 * Creates a backup copy of targetPath before overwriting it.
 * Uses `<target>.bak` if available, or `<target>.bak.<timestamp>` if `.bak` already exists.
 */
export function createBackupFile(targetPath: string, now: Date = new Date()): string | null {
  if (!fs.existsSync(targetPath)) {
    return null;
  }
  let backupPath = `${targetPath}.bak`;
  if (fs.existsSync(backupPath)) {
    backupPath = `${targetPath}.bak.${formatTimestamp(now)}`;
    let counter = 1;
    while (fs.existsSync(backupPath)) {
      backupPath = `${targetPath}.bak.${formatTimestamp(now)}-${counter}`;
      counter += 1;
    }
  }
  fs.copyFileSync(targetPath, backupPath);
  return backupPath;
}

/**
 * Normalizes line endings to LF before hashing so CRLF/LF differences do not cause false conflicts.
 */
export function sha256Normalized(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}

/**
 * Lists all files under rootDir recursively as POSIX relative paths.
 */
export function listFilesRecursive(rootDir: string): string[] {
  if (!fs.existsSync(rootDir)) {
    return [];
  }
  const results: string[] = [];

  const walk = (current: string, relBase: string): void => {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;
      const isDir = entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(fullPath).isDirectory());
      const isFile = entry.isFile() || (entry.isSymbolicLink() && fs.statSync(fullPath).isFile());
      if (isDir) {
        walk(fullPath, relPath);
      } else if (isFile) {
        results.push(relPath);
      }
    }
  };

  walk(rootDir, '');
  return results.sort();
}

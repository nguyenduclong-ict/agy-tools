import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { resolveProjectRoot } from '../adapters/paths.js';
import {
  ALL_SYNC_CATEGORIES,
  type SyncCategory,
  type SyncMode,
  type SyncPlatform,
} from '../adapters/types.js';
import {
  applyImportedCredential,
  backupAuth,
  getAuthStatus,
  inspectImportFile,
} from '../auth/service.js';
import { AppError, normalizeError } from '../core/errors.js';
import { executeSync } from '../sync/runner.js';
import { formatAccountSummary, printAuthStatus, printSyncResult } from './formatters.js';
import {
  promptBackupPassphrase,
  promptConfirm,
  promptImportPassphrase,
  promptInputPath,
  promptMainMenu,
  promptResolveConflicts,
  promptSyncCategories,
  promptSyncDirection,
  promptSyncMode,
} from './prompts.js';

function isInteractiveTty(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

function parseCategoriesFlag(raw: string): SyncCategory[] {
  const parts = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (parts.length === 0) {
    throw new AppError('CLI_INVALID_ARGS', 'Categories list cannot be empty.');
  }
  if (parts.includes('all')) {
    return [...ALL_SYNC_CATEGORIES];
  }

  const valid = new Set<string>(ALL_SYNC_CATEGORIES);
  const selected: SyncCategory[] = [];
  for (const part of parts) {
    if (!valid.has(part)) {
      throw new AppError(
        'CLI_INVALID_ARGS',
        `Unknown category "${part}". Valid values: ${ALL_SYNC_CATEGORIES.join(', ')}, all`,
      );
    }
    if (!selected.includes(part as SyncCategory)) {
      selected.push(part as SyncCategory);
    }
  }
  return selected;
}

function parsePlatform(val: string, flagName: string): SyncPlatform {
  const normalized = val.trim().toLowerCase();
  if (normalized === 'claude') return 'claude';
  if (normalized === 'agy' || normalized === 'antigravity') return 'agy';
  throw new AppError('CLI_INVALID_ARGS', `Invalid ${flagName} value "${val}". Use "claude" or "agy".`);
}

function parseMode(val: string): SyncMode {
  const normalized = val.trim().toLowerCase();
  if (normalized === 'project' || normalized === 'global') return normalized;
  throw new AppError('CLI_INVALID_ARGS', `Invalid --mode value "${val}". Use "project" or "global".`);
}

async function handleAuthBackup(opts: {
  output?: string;
  encrypt?: boolean;
  passphrase?: string;
  force?: boolean;
  fileFallback?: boolean;
}): Promise<void> {
  let outputPath = opts.output;
  if (!outputPath) {
    outputPath = isInteractiveTty()
      ? await promptInputPath('Output backup JSON path:', './agy-auth-backup.json')
      : './agy-auth-backup.json';
  }
  outputPath = path.resolve(outputPath);

  let force = Boolean(opts.force);
  if (!force && fs.existsSync(outputPath) && isInteractiveTty()) {
    force = await promptConfirm(`File ${outputPath} already exists. Overwrite?`, false);
    if (!force) {
      throw new AppError('SYNC_CONFLICT_ABORTED', 'Backup cancelled by user.');
    }
  }

  let passphrase = opts.passphrase;
  if (opts.encrypt && !passphrase) {
    if (!isInteractiveTty()) {
      throw new AppError('CLI_INVALID_ARGS', 'Passphrase is required in non-interactive mode (--passphrase).');
    }
    passphrase = await promptBackupPassphrase();
  }

  const res = await backupAuth({
    outputPath,
    encrypt: Boolean(opts.encrypt),
    passphrase,
    force,
    fileFallback: Boolean(opts.fileFallback),
  });

  console.log(
    pc.green(
      `Backed up agy auth for ${formatAccountSummary(res.account)} from ${res.source} -> ${res.outputPath}` +
        (res.encrypted ? ' (encrypted)' : ' (plain JSON)'),
    ),
  );
  if (!res.encrypted) {
    console.log(
      pc.yellow('Warning: Backup file contains live OAuth tokens. Keep it private and never commit it to Git.'),
    );
  }
}

async function handleAuthImport(
  fileArg: string | undefined,
  opts: {
    passphrase?: string;
    dryRun?: boolean;
    fileFallback?: boolean;
    yes?: boolean;
  },
): Promise<void> {
  let inputPath = fileArg;
  if (!inputPath) {
    if (!isInteractiveTty()) {
      throw new AppError('CLI_INVALID_ARGS', 'Backup JSON file path is required.');
    }
    inputPath = await promptInputPath('Path to auth backup JSON file:', './agy-auth-backup.json');
  }
  inputPath = path.resolve(inputPath);

  const inspected = inspectImportFile(inputPath);
  let passphrase = opts.passphrase;
  if (inspected.encrypted && !passphrase) {
    if (!isInteractiveTty()) {
      throw new AppError('CRYPTO_DECRYPT_FAILED', 'Passphrase is required to decrypt backup (--passphrase).');
    }
    passphrase = await promptImportPassphrase();
  }

  const { credential, account } = inspected.resolveCredential(passphrase);
  const currentStatus = await getAuthStatus({ fileFallback: Boolean(opts.fileFallback) });

  if (!opts.dryRun && currentStatus.authenticated && !opts.yes && isInteractiveTty()) {
    const ok = await promptConfirm(
      `Overwrite active credential (${formatAccountSummary(currentStatus.account)}) with ${formatAccountSummary(account)}?`,
      false,
    );
    if (!ok) {
      throw new AppError('SYNC_CONFLICT_ABORTED', 'Auth import cancelled by user.');
    }
  }

  const res = await applyImportedCredential(credential, {
    dryRun: Boolean(opts.dryRun),
    fileFallback: Boolean(opts.fileFallback),
  });

  if (!res.applied) {
    console.log(
      pc.cyan(`[Dry Run] Verified valid backup for ${formatAccountSummary(res.importedAccount)}. No keyring changes made.`),
    );
    return;
  }

  console.log(
    pc.green(`Imported agy auth for ${formatAccountSummary(res.importedAccount)} into ${res.targetSource}.`),
  );
}

async function handleAuthStatus(opts: { fileFallback?: boolean; json?: boolean }): Promise<void> {
  const status = await getAuthStatus({ fileFallback: Boolean(opts.fileFallback) });
  if (opts.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }
  printAuthStatus(status);
}

async function handleSync(opts: {
  from?: string;
  to?: string;
  mode?: string;
  projectDir?: string;
  categories?: string;
  dryRun?: boolean;
  force?: boolean;
  skipExisting?: boolean;
  backup?: boolean;
  strictConflicts?: boolean;
  yes?: boolean;
  json?: boolean;
}): Promise<void> {
  let from: SyncPlatform;
  let to: SyncPlatform;

  if (opts.from && opts.to) {
    from = parsePlatform(opts.from, '--from');
    to = parsePlatform(opts.to, '--to');
  } else if (opts.from && !opts.to) {
    from = parsePlatform(opts.from, '--from');
    to = from === 'claude' ? 'agy' : 'claude';
  } else if (!opts.from && opts.to) {
    to = parsePlatform(opts.to, '--to');
    from = to === 'claude' ? 'agy' : 'claude';
  } else if (isInteractiveTty()) {
    const chosen = await promptSyncDirection();
    from = chosen.from;
    to = chosen.to;
  } else {
    throw new AppError('CLI_INVALID_ARGS', 'Missing --from and --to in non-interactive mode.');
  }

  if (from === to) {
    throw new AppError('CLI_INVALID_ARGS', 'Source and target platforms must differ.');
  }

  const mode: SyncMode = opts.mode
    ? parseMode(opts.mode)
    : isInteractiveTty()
      ? await promptSyncMode()
      : (() => {
          throw new AppError('CLI_INVALID_ARGS', 'Missing --mode <project|global> in non-interactive mode.');
        })();

  const categories: SyncCategory[] = opts.categories
    ? parseCategoriesFlag(opts.categories)
    : isInteractiveTty()
      ? await promptSyncCategories()
      : ['agents', 'skills', 'rules'];

  const rootOrHome = mode === 'global' ? os.homedir() : resolveProjectRoot(opts.projectDir);

  const result = await executeSync({
    from,
    to,
    mode,
    rootOrHome,
    categories,
    dryRun: Boolean(opts.dryRun),
    force: Boolean(opts.force),
    skipExisting: Boolean(opts.skipExisting),
    noBackup: opts.backup === false,
    strictConflicts: Boolean(opts.strictConflicts),
    resolveConflicts:
      !opts.force && !opts.skipExisting && !opts.yes && isInteractiveTty() ? promptResolveConflicts : undefined,
  });

  if (opts.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  printSyncResult(result, Boolean(opts.dryRun));
}

async function runCli(): Promise<void> {
  const program = new Command();
  program
    .name('agy-tools')
    .description('CLI toolkit for agy auth backup/import and Claude Code <-> Antigravity config sync')
    .version('1.0.0');

  const authCmd = program.command('auth').description('Backup, import, and inspect agy OAuth authentication');

  authCmd
    .command('backup')
    .description('Export active agy OAuth credential into a single JSON file')
    .option('-o, --output <path>', 'Output JSON file path')
    .option('--encrypt', 'Encrypt credential payload using AES-256-GCM')
    .option('--passphrase <str>', 'Encryption passphrase (prefer interactive prompt)')
    .option('--force', 'Overwrite output file if it already exists')
    .option('--file-fallback', 'Read credential from fallback token file instead of OS keyring')
    .action(async (opts) => {
      await handleAuthBackup(opts);
    });

  authCmd
    .command('import [file]')
    .description('Import a single-account JSON backup into agy OS keyring')
    .option('--passphrase <str>', 'Decryption passphrase for encrypted backup')
    .option('--dry-run', 'Validate and decrypt backup without modifying keyring')
    .option('--file-fallback', 'Write credential to fallback token file instead of OS keyring')
    .option('-y, --yes', 'Skip overwrite confirmation prompt')
    .action(async (file: string | undefined, opts) => {
      await handleAuthImport(file, opts);
    });

  authCmd
    .command('status')
    .description('Inspect current agy authentication status without revealing secrets')
    .option('--file-fallback', 'Check fallback token file instead of OS keyring')
    .option('--json', 'Output status as JSON')
    .action(async (opts) => {
      await handleAuthStatus(opts);
    });

  program
    .command('sync')
    .description('Sync agent configurations between Claude Code and Antigravity')
    .option('--from <platform>', 'Source platform: claude | agy')
    .option('--to <platform>', 'Target platform: claude | agy')
    .option('--mode <scope>', 'Sync scope: project | global')
    .option('--project-dir <path>', 'Explicit project root directory (for project mode)')
    .option('-c, --categories <list>', 'Comma-separated: agents,skills,rules,mcp,commands,hooks,all')
    .option('--dry-run', 'Preview sync plan and warnings without writing files')
    .option('--force', 'Overwrite conflicting files automatically (creates .bak)')
    .option('--skip-existing', 'Skip conflicting files without modifying them')
    .option('--no-backup', 'Disable automatic .bak backups before overwriting')
    .option('--strict-conflicts', 'Abort with exit code 7 when conflicts exist without --force/--skip-existing')
    .option('-y, --yes', 'Non-interactive mode (skips conflicts unless --force is passed)')
    .option('--json', 'Output sync report as JSON')
    .action(async (opts) => {
      await handleSync(opts);
    });

  if (process.argv.length <= 2) {
    if (!isInteractiveTty()) {
      program.help();
      return;
    }
    const action = await promptMainMenu();
    if (action === 'auth-backup') {
      const encrypt = await promptConfirm('Encrypt backup with AES-256-GCM passphrase?', false);
      await handleAuthBackup({ encrypt });
    } else if (action === 'auth-import') {
      await handleAuthImport(undefined, {});
    } else if (action === 'auth-status') {
      await handleAuthStatus({});
    } else if (action === 'sync') {
      await handleSync({});
    }
    return;
  }

  await program.parseAsync(process.argv);
}

runCli().catch((err) => {
  const appErr = normalizeError(err);
  console.error(pc.red(`[${appErr.code}] ${appErr.message}`));
  process.exit(appErr.exitCode);
});

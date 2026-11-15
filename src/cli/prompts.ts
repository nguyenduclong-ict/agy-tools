import { checkbox, confirm, input, password, select } from '@inquirer/prompts';
import pc from 'picocolors';
import {
  DEFAULT_RECOMMENDED_CATEGORIES,
  type SyncCategory,
  type SyncMode,
  type SyncPlanItem,
  type SyncPlatform,
} from '../adapters/types.js';
import type { ConflictDecision } from '../sync/runner.js';
import { printDiffText } from './formatters.js';

export type MainMenuAction = 'auth-backup' | 'auth-import' | 'auth-status' | 'sync';

export async function promptMainMenu(): Promise<MainMenuAction> {
  return select<MainMenuAction>({
    message: 'Select an agy-tools operation:',
    choices: [
      { name: 'Sync agent configs (Claude Code <-> Antigravity)', value: 'sync' },
      { name: 'Backup agy authentication to JSON', value: 'auth-backup' },
      { name: 'Import agy authentication from JSON', value: 'auth-import' },
      { name: 'Check agy authentication status', value: 'auth-status' },
    ],
  });
}

export async function promptBackupPassphrase(): Promise<string> {
  const first = await password({
    message: 'Enter passphrase to encrypt auth backup:',
    mask: '*',
    validate: (val) => (val.length >= 1 ? true : 'Passphrase cannot be empty.'),
  });
  const second = await password({
    message: 'Confirm passphrase:',
    mask: '*',
    validate: (val) => (val === first ? true : 'Passphrases do not match.'),
  });
  return second;
}

export async function promptImportPassphrase(): Promise<string> {
  return password({
    message: 'Enter passphrase to decrypt auth backup:',
    mask: '*',
    validate: (val) => (val.length >= 1 ? true : 'Passphrase cannot be empty.'),
  });
}

export async function promptInputPath(message: string, defaultValue?: string): Promise<string> {
  return input({
    message,
    default: defaultValue,
    validate: (val) => (val.trim().length > 0 ? true : 'Path cannot be empty.'),
  });
}

export async function promptConfirm(message: string, defaultValue = false): Promise<boolean> {
  return confirm({ message, default: defaultValue });
}

export async function promptSyncDirection(): Promise<{ from: SyncPlatform; to: SyncPlatform }> {
  const direction = await select<'claude-to-agy' | 'agy-to-claude'>({
    message: 'Select sync direction:',
    choices: [
      { name: 'Claude Code -> Antigravity (agy)', value: 'claude-to-agy' },
      { name: 'Antigravity (agy) -> Claude Code', value: 'agy-to-claude' },
    ],
  });
  return direction === 'claude-to-agy' ? { from: 'claude', to: 'agy' } : { from: 'agy', to: 'claude' };
}

export async function promptSyncMode(): Promise<SyncMode> {
  return select<SyncMode>({
    message: 'Select configuration scope:',
    choices: [
      { name: 'Project scope (.claude / .agents in project directory)', value: 'project' },
      { name: 'Global scope (~/.claude / ~/.gemini/config)', value: 'global' },
    ],
  });
}

export async function promptSyncCategories(): Promise<SyncCategory[]> {
  const recSet = new Set<SyncCategory>(DEFAULT_RECOMMENDED_CATEGORIES);
  return checkbox<SyncCategory>({
    message: 'Select configuration categories to sync:',
    required: true,
    choices: [
      {
        name: 'Agents / Subagents (Recommended)',
        value: 'agents',
        checked: recSet.has('agents'),
      },
      {
        name: 'Skills (Recommended)',
        value: 'skills',
        checked: recSet.has('skills'),
      },
      {
        name: 'Rules / Instructions (Recommended)',
        value: 'rules',
        checked: recSet.has('rules'),
      },
      {
        name: 'MCP Servers (Project -> .agents/plugins/project-scope/)',
        value: 'mcp',
        checked: recSet.has('mcp'),
      },
      {
        name: 'Slash Commands (Claude commands -> Antigravity skills)',
        value: 'commands',
        checked: recSet.has('commands'),
      },
      {
        name: 'Hooks (Best-effort command hook mapping)',
        value: 'hooks',
        checked: recSet.has('hooks'),
      },
    ],
  });
}

export async function promptResolveConflicts(
  conflicts: SyncPlanItem[],
): Promise<Map<SyncPlanItem, ConflictDecision> | 'abort'> {
  console.log(pc.yellow(`\nDetected ${conflicts.length} existing target file(s) with differences:`));
  for (const c of conflicts) {
    console.log(`  - [${c.artifact.category}] ${c.artifact.targetPath}`);
  }

  const strategy = await select<'overwrite-all' | 'skip-all' | 'review-each' | 'abort'>({
    message: 'How do you want to handle conflicting files? (Overwrites create .bak backups automatically)',
    choices: [
      { name: 'Review each conflict with diff preview', value: 'review-each' },
      { name: 'Overwrite all (create .bak backups)', value: 'overwrite-all' },
      { name: 'Skip all existing conflicting files', value: 'skip-all' },
      { name: 'Abort sync', value: 'abort' },
    ],
  });

  if (strategy === 'abort') {
    return 'abort';
  }

  const map = new Map<SyncPlanItem, ConflictDecision>();
  if (strategy === 'overwrite-all') {
    for (const c of conflicts) map.set(c, 'overwrite');
    return map;
  }
  if (strategy === 'skip-all') {
    for (const c of conflicts) map.set(c, 'skip');
    return map;
  }

  for (const c of conflicts) {
    console.log(`\n${pc.bold(c.artifact.targetPath)}`);
    if (c.diffText) {
      printDiffText(c.diffText);
    }
    const overwrite = await confirm({
      message: `Overwrite ${c.artifact.itemName}? (creates .bak backup)`,
      default: false,
    });
    map.set(c, overwrite ? 'overwrite' : 'skip');
  }

  return map;
}

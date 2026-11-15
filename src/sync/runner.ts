import fs from 'node:fs';
import { buildAntigravityTargetArtifacts, readAntigravityBundle } from '../adapters/antigravity.js';
import { buildClaudeTargetArtifacts, readClaudeBundle } from '../adapters/claude.js';
import type {
  ConversionIssue,
  PlanAction,
  SyncCategory,
  SyncExecutionResult,
  SyncMode,
  SyncPlanItem,
  SyncPlatform,
} from '../adapters/types.js';
import { AppError } from '../core/errors.js';
import { createBackupFile, readJsonIfExists, writeFileAtomic } from '../core/fs-atomic.js';
import { buildSyncPlan } from './planner.js';

export type ConflictDecision = 'overwrite' | 'skip';

export interface RunSyncOptions {
  from: SyncPlatform;
  to: SyncPlatform;
  mode: SyncMode;
  rootOrHome: string;
  categories: SyncCategory[];
  dryRun?: boolean;
  force?: boolean;
  skipExisting?: boolean;
  noBackup?: boolean;
  strictConflicts?: boolean;
  resolveConflicts?: (conflicts: SyncPlanItem[]) => Promise<Map<SyncPlanItem, ConflictDecision> | 'abort'>;
}

export interface PreparedSyncPlan {
  plan: SyncPlanItem[];
  issues: ConversionIssue[];
}

/**
 * Reads source configurations, converts schemas, and generates a diff-aware plan without writing to disk.
 */
export function prepareSyncPlan(options: {
  from: SyncPlatform;
  to: SyncPlatform;
  mode: SyncMode;
  rootOrHome: string;
  categories: SyncCategory[];
}): PreparedSyncPlan {
  if (options.from === options.to) {
    throw new AppError('CLI_INVALID_ARGS', 'Source (--from) and target (--to) platforms must be different.');
  }

  const categorySet = new Set(options.categories);
  const bundle =
    options.from === 'claude'
      ? readClaudeBundle(options.mode, options.rootOrHome, categorySet)
      : readAntigravityBundle(options.mode, options.rootOrHome, categorySet);

  const built =
    options.to === 'agy'
      ? buildAntigravityTargetArtifacts(bundle, options.mode, options.rootOrHome, categorySet)
      : buildClaudeTargetArtifacts(bundle, options.mode, options.rootOrHome, categorySet);

  const plan = buildSyncPlan(built.artifacts);
  return {
    plan,
    issues: built.issues,
  };
}

/**
 * Executes a sync plan with conflict detection, automatic `.bak` creation, and atomic writes.
 */
export async function executeSync(options: RunSyncOptions): Promise<SyncExecutionResult> {
  const { plan, issues } = prepareSyncPlan(options);

  const conflicts = plan.filter((item) => item.action === 'update');
  const decisions = new Map<SyncPlanItem, ConflictDecision>();

  if (!options.dryRun && conflicts.length > 0) {
    if (options.force) {
      for (const item of conflicts) decisions.set(item, 'overwrite');
    } else if (options.skipExisting) {
      for (const item of conflicts) decisions.set(item, 'skip');
    } else if (options.resolveConflicts) {
      const resolved = await options.resolveConflicts(conflicts);
      if (resolved === 'abort') {
        throw new AppError('SYNC_CONFLICT_ABORTED', 'Sync aborted by user during conflict resolution.');
      }
      for (const [k, v] of resolved.entries()) {
        decisions.set(k, v);
      }
    } else if (options.strictConflicts) {
      throw new AppError(
        'SYNC_CONFLICT_ABORTED',
        `Detected ${conflicts.length} conflicting target file(s). Pass --force or --skip-existing.`,
      );
    } else {
      for (const item of conflicts) decisions.set(item, 'skip');
    }
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let skipped = 0;
  const backups: Array<{ targetPath: string; backupPath: string }> = [];
  const items: SyncExecutionResult['items'] = [];

  for (const planItem of plan) {
    let finalAction: PlanAction = planItem.action;

    if (planItem.action === 'update' && !options.dryRun) {
      const decision = decisions.get(planItem) ?? 'skip';
      if (decision === 'skip') {
        finalAction = 'skipped';
      }
    }

    if (!options.dryRun && (finalAction === 'create' || finalAction === 'update')) {
      const targetPath = planItem.artifact.targetPath;
      if (finalAction === 'update' && !options.noBackup && fs.existsSync(targetPath)) {
        const backupPath = createBackupFile(targetPath);
        if (backupPath) {
          backups.push({ targetPath, backupPath });
        }
      }

      if (planItem.artifact.kind === 'text') {
        writeFileAtomic(targetPath, planItem.artifact.content);
      } else {
        const existingObj = fs.existsSync(targetPath)
          ? (readJsonIfExists<Record<string, unknown>>(targetPath) ?? {})
          : {};
        const merged = planItem.artifact.merge(existingObj);
        writeFileAtomic(targetPath, `${JSON.stringify(merged, null, 2)}\n`);
      }
    }

    if (finalAction === 'create') created += 1;
    else if (finalAction === 'update') updated += 1;
    else if (finalAction === 'unchanged') unchanged += 1;
    else if (finalAction === 'skipped') skipped += 1;

    items.push({
      category: planItem.artifact.category,
      itemName: planItem.artifact.itemName,
      targetPath: planItem.artifact.targetPath,
      action: finalAction,
    });
  }

  return {
    created,
    updated,
    unchanged,
    skipped,
    backups,
    items,
    issues,
  };
}

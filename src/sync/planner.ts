import crypto from 'node:crypto';
import fs from 'node:fs';
import { createPatch } from 'diff';
import type { SyncPlanItem, TargetArtifact } from '../adapters/types.js';
import { readJsonIfExists, sha256Normalized } from '../core/fs-atomic.js';

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function isProbablyUtf8Text(buf: Buffer): boolean {
  return !buf.includes(0);
}

function planTextArtifact(artifact: Extract<TargetArtifact, { kind: 'text' }>): SyncPlanItem {
  const exists = fs.existsSync(artifact.targetPath);
  if (!exists) {
    const nextPreview = isProbablyUtf8Text(artifact.content)
      ? artifact.content.toString('utf8')
      : `<binary ${artifact.content.length} bytes>`;
    return {
      artifact,
      action: 'create',
      existingPreview: '',
      nextPreview,
      diffText: '',
    };
  }

  const existingBuf = fs.readFileSync(artifact.targetPath);
  const bothText = isProbablyUtf8Text(existingBuf) && isProbablyUtf8Text(artifact.content);

  if (bothText) {
    const existingText = existingBuf.toString('utf8');
    const nextText = artifact.content.toString('utf8');
    if (sha256Normalized(existingText) === sha256Normalized(nextText)) {
      return {
        artifact,
        action: 'unchanged',
        existingPreview: existingText,
        nextPreview: nextText,
        diffText: '',
      };
    }
    const diffText = createPatch(artifact.targetPath, existingText, nextText, 'existing', 'incoming');
    return {
      artifact,
      action: 'update',
      existingPreview: existingText,
      nextPreview: nextText,
      diffText,
    };
  }

  const hashA = crypto.createHash('sha256').update(existingBuf).digest('hex');
  const hashB = crypto.createHash('sha256').update(artifact.content).digest('hex');
  if (hashA === hashB) {
    return {
      artifact,
      action: 'unchanged',
      existingPreview: `<binary ${existingBuf.length} bytes>`,
      nextPreview: `<binary ${artifact.content.length} bytes>`,
      diffText: '',
    };
  }

  return {
    artifact,
    action: 'update',
    existingPreview: `<binary ${existingBuf.length} bytes>`,
    nextPreview: `<binary ${artifact.content.length} bytes>`,
    diffText: `Binary file differs (${existingBuf.length} bytes -> ${artifact.content.length} bytes)`,
  };
}

function planJsonMergeArtifact(artifact: Extract<TargetArtifact, { kind: 'json-merge' }>): SyncPlanItem {
  const exists = fs.existsSync(artifact.targetPath);
  const existingObj = exists ? (readJsonIfExists<Record<string, unknown>>(artifact.targetPath) ?? {}) : {};
  const nextFull = artifact.merge(existingObj);

  const prevSlice = artifact.extractSlice(existingObj);
  const nextSlice = artifact.extractSlice(nextFull);

  const prevPreviewObj = artifact.redactSlice ? artifact.redactSlice(prevSlice) : prevSlice;
  const nextPreviewObj = artifact.redactSlice ? artifact.redactSlice(nextSlice) : nextSlice;

  const existingPreview = `${JSON.stringify(prevPreviewObj, null, 2)}\n`;
  const nextPreview = `${JSON.stringify(nextPreviewObj, null, 2)}\n`;

  if (!exists) {
    return {
      artifact,
      action: 'create',
      existingPreview: '',
      nextPreview,
      diffText: '',
    };
  }

  if (stableStringify(prevSlice) === stableStringify(nextSlice)) {
    return {
      artifact,
      action: 'unchanged',
      existingPreview,
      nextPreview,
      diffText: '',
    };
  }

  const diffText = createPatch(artifact.targetPath, existingPreview, nextPreview, 'existing', 'incoming');
  return {
    artifact,
    action: 'update',
    existingPreview,
    nextPreview,
    diffText,
  };
}

/**
 * Inspects target paths and generates a conflict-aware execution plan.
 */
export function buildSyncPlan(artifacts: TargetArtifact[]): SyncPlanItem[] {
  return artifacts.map((artifact) =>
    artifact.kind === 'text' ? planTextArtifact(artifact) : planJsonMergeArtifact(artifact),
  );
}

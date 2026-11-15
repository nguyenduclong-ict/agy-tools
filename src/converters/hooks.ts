import type { ConversionIssue } from '../adapters/types.js';
import { translateHookMatcher } from './tools-map.js';

const SUPPORTED_EVENTS = new Set(['SessionStart', 'PreToolUse', 'PostToolUse', 'Stop']);
const TOOL_SCOPED_EVENTS = new Set(['PreToolUse', 'PostToolUse']);

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Converts Claude Code `settings.json` `hooks` section into Antigravity `hooks.json` format.
 */
export function convertHooksToAgy(claudeHooks: unknown): {
  hooksJson: Record<string, unknown>;
  issues: ConversionIssue[];
} {
  const issues: ConversionIssue[] = [];
  if (!isRecord(claudeHooks)) {
    return { hooksJson: {}, issues };
  }

  const syncedGroup: Record<string, unknown[]> = {};

  for (const [eventName, entries] of Object.entries(claudeHooks)) {
    if (!SUPPORTED_EVENTS.has(eventName)) {
      issues.push({
        category: 'hooks',
        item: eventName,
        severity: 'skipped',
        reason: `Claude hook event "${eventName}" has no Antigravity equivalent.`,
      });
      continue;
    }

    if (!Array.isArray(entries)) {
      continue;
    }

    const outEntries: unknown[] = [];
    for (const entry of entries) {
      if (!isRecord(entry)) continue;
      const matcher = typeof entry.matcher === 'string' ? entry.matcher : undefined;
      const rawHandlers = Array.isArray(entry.hooks) ? entry.hooks : [];
      const commandHandlers: Array<Record<string, unknown>> = [];

      for (const h of rawHandlers) {
        if (!isRecord(h)) continue;
        const hType = typeof h.type === 'string' ? h.type : 'command';
        if (hType !== 'command' || typeof h.command !== 'string') {
          issues.push({
            category: 'hooks',
            item: eventName,
            severity: 'skipped',
            reason: `Skipped non-command hook handler (type="${hType}").`,
          });
          continue;
        }
        commandHandlers.push({
          type: 'command',
          command: h.command,
          ...(typeof h.timeout === 'number' ? { timeout: h.timeout } : {}),
        });
      }

      if (commandHandlers.length === 0) continue;

      if (TOOL_SCOPED_EVENTS.has(eventName)) {
        outEntries.push({
          matcher: translateHookMatcher(matcher, 'claude-to-agy'),
          hooks: commandHandlers,
        });
      } else {
        outEntries.push(...commandHandlers);
      }
    }

    if (outEntries.length > 0) {
      syncedGroup[eventName] = outEntries;
    }
  }

  if (Object.keys(syncedGroup).length === 0) {
    return { hooksJson: {}, issues };
  }

  return {
    hooksJson: { 'synced-from-claude': syncedGroup },
    issues,
  };
}

/**
 * Converts Antigravity `hooks.json` into Claude Code `settings.json` `hooks` section.
 */
export function convertHooksToClaude(agyHooks: unknown): {
  claudeHooks: Record<string, unknown[]>;
  issues: ConversionIssue[];
} {
  const issues: ConversionIssue[] = [];
  if (!isRecord(agyHooks)) {
    return { claudeHooks: {}, issues };
  }

  const out: Record<string, unknown[]> = {};

  for (const [groupName, groupSpec] of Object.entries(agyHooks)) {
    if (!isRecord(groupSpec)) continue;
    if (groupSpec.enabled === false) {
      issues.push({
        category: 'hooks',
        item: groupName,
        severity: 'skipped',
        reason: `Disabled Antigravity hook group "${groupName}" was skipped.`,
      });
      continue;
    }

    for (const [eventName, entries] of Object.entries(groupSpec)) {
      if (eventName === 'enabled') continue;
      if (!SUPPORTED_EVENTS.has(eventName)) {
        issues.push({
          category: 'hooks',
          item: `${groupName}.${eventName}`,
          severity: 'skipped',
          reason: `Antigravity hook event "${eventName}" has no Claude Code equivalent.`,
        });
        continue;
      }
      if (!Array.isArray(entries)) continue;

      const targetList = (out[eventName] ??= []);

      if (TOOL_SCOPED_EVENTS.has(eventName)) {
        for (const entry of entries) {
          if (!isRecord(entry)) continue;
          const matcher = typeof entry.matcher === 'string' ? entry.matcher : '*';
          const handlers = Array.isArray(entry.hooks) ? entry.hooks : [];
          const mappedHandlers = handlers
            .filter((h): h is Record<string, unknown> => isRecord(h) && typeof h.command === 'string')
            .map((h) => ({
              type: 'command',
              command: h.command,
              ...(typeof h.timeout === 'number' ? { timeout: h.timeout } : {}),
            }));

          if (mappedHandlers.length > 0) {
            targetList.push({
              matcher: translateHookMatcher(matcher, 'agy-to-claude'),
              hooks: mappedHandlers,
            });
          }
        }
      } else {
        const mappedHandlers = entries
          .filter((h): h is Record<string, unknown> => isRecord(h) && typeof h.command === 'string')
          .map((h) => ({
            type: 'command',
            command: h.command,
            ...(typeof h.timeout === 'number' ? { timeout: h.timeout } : {}),
          }));
        if (mappedHandlers.length > 0) {
          targetList.push({ hooks: mappedHandlers });
        }
      }
    }
  }

  return { claudeHooks: out, issues };
}

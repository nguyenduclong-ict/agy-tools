import type { ConversionIssue, RuleFile } from '../adapters/types.js';
import { parseFrontmatter, stringifyFrontmatter } from '../core/frontmatter.js';

const ANTIGRAVITY_RULE_MAX_BYTES = 24000;

/**
 * Checks root instruction file size against Antigravity's 24 KB cap when syncing to Antigravity.
 */
export function convertRootRule(
  rawContent: string,
  direction: 'claude-to-agy' | 'agy-to-claude',
  itemLabel: string,
): { content: string; issues: ConversionIssue[] } {
  const issues: ConversionIssue[] = [];
  if (direction === 'claude-to-agy' && Buffer.byteLength(rawContent, 'utf8') > ANTIGRAVITY_RULE_MAX_BYTES) {
    issues.push({
      category: 'rules',
      item: itemLabel,
      severity: 'warning',
      reason: `File exceeds Antigravity's 24,000-byte per-file rule cap (${Buffer.byteLength(rawContent, 'utf8')} bytes) and may be truncated at runtime.`,
    });
  }
  return { content: rawContent, issues };
}

/**
 * Converts a Claude Code modular rule (`.claude/rules/*.md`) to Antigravity rule format.
 */
export function convertModularRuleToAgy(rule: RuleFile): {
  content: string;
  issues: ConversionIssue[];
} {
  const issues: ConversionIssue[] = [];
  const parsed = parseFrontmatter(rule.rawContent);

  let globsStr: string | undefined;
  if (Array.isArray(parsed.data.paths)) {
    globsStr = parsed.data.paths.map((p) => String(p).trim()).filter(Boolean).join(', ');
  } else if (typeof parsed.data.paths === 'string' && parsed.data.paths.trim()) {
    globsStr = parsed.data.paths.trim();
  }

  const targetFm: Record<string, unknown> = globsStr
    ? { trigger: 'glob', globs: globsStr }
    : { trigger: 'always_on' };

  const out = stringifyFrontmatter(targetFm, parsed.body);
  if (Buffer.byteLength(out, 'utf8') > ANTIGRAVITY_RULE_MAX_BYTES) {
    issues.push({
      category: 'rules',
      item: rule.name,
      severity: 'warning',
      reason: `Rule exceeds Antigravity's 24,000-byte cap (${Buffer.byteLength(out, 'utf8')} bytes).`,
    });
  }

  return { content: out, issues };
}

/**
 * Converts an Antigravity modular rule to Claude Code's `.claude/rules/*.md` format.
 */
export function convertModularRuleToClaude(rule: RuleFile): {
  content: string;
  issues: ConversionIssue[];
} {
  const issues: ConversionIssue[] = [];
  const parsed = parseFrontmatter(rule.rawContent);
  const trigger = typeof parsed.data.trigger === 'string' ? parsed.data.trigger : 'always_on';

  const targetFm: Record<string, unknown> = {};
  if (trigger === 'glob' && typeof parsed.data.globs === 'string' && parsed.data.globs.trim()) {
    targetFm.paths = parsed.data.globs
      .split(',')
      .map((g) => g.trim())
      .filter(Boolean);
  } else if (trigger === 'model_decision' || trigger === 'manual') {
    issues.push({
      category: 'rules',
      item: rule.name,
      severity: 'warning',
      reason: `Antigravity trigger "${trigger}" has no Claude Code equivalent; converted as unconditional rule.`,
    });
  }

  const descriptionPrefix =
    typeof parsed.data.description === 'string' && parsed.data.description.trim() && (trigger === 'model_decision' || trigger === 'manual')
      ? `<!-- Antigravity trigger: ${trigger} | description: ${parsed.data.description.trim()} -->\n\n`
      : '';

  return {
    content: stringifyFrontmatter(targetFm, `${descriptionPrefix}${parsed.body}`),
    issues,
  };
}

import type { CommandFile, ConversionIssue, SkillFolder } from '../adapters/types.js';
import { extractFirstParagraph, parseFrontmatter, stringifyFrontmatter } from '../core/frontmatter.js';

const COMMAND_MARKER_KEY = 'x-synced-from';
const COMMAND_MARKER_VALUE = 'claude-command';

/**
 * Ensures SKILL.md has Antigravity-required `name` and `description` YAML frontmatter.
 */
export function convertSkillMdForAgy(skillName: string, rawSkillMd: string): {
  content: string;
  issues: ConversionIssue[];
} {
  const issues: ConversionIssue[] = [];
  const parsed = parseFrontmatter(rawSkillMd);
  const existingName = typeof parsed.data.name === 'string' ? parsed.data.name.trim() : '';
  const existingDesc = typeof parsed.data.description === 'string' ? parsed.data.description.trim() : '';

  if (existingName === skillName && existingDesc.length > 0 && parsed.hasFrontmatter) {
    return { content: rawSkillMd, issues };
  }

  const description = existingDesc || extractFirstParagraph(parsed.body) || `Skill ${skillName} synced from Claude Code.`;
  if (!existingDesc) {
    issues.push({
      category: 'skills',
      item: skillName,
      severity: 'warning',
      reason: 'SKILL.md lacked frontmatter description; synthesized from content.',
    });
  }

  const nextFm: Record<string, unknown> = {
    ...parsed.data,
    name: skillName,
    description,
  };

  return {
    content: stringifyFrontmatter(nextFm, parsed.body),
    issues,
  };
}

/**
 * Normalizes an Antigravity skill for Claude Code (strips agy-only marker if desired, preserves metadata).
 */
export function convertSkillMdForClaude(skill: SkillFolder, rawSkillMd: string): {
  content: string;
  issues: ConversionIssue[];
} {
  const parsed = parseFrontmatter(rawSkillMd);
  if (parsed.data[COMMAND_MARKER_KEY] === undefined) {
    return { content: rawSkillMd, issues: [] };
  }
  const rest = { ...parsed.data };
  delete rest[COMMAND_MARKER_KEY];
  return {
    content: stringifyFrontmatter(rest, parsed.body),
    issues: [],
  };
}

/**
 * Converts a Claude Code slash command (`commands/git/commit.md`) into an Antigravity skill (`git-commit/SKILL.md`).
 */
export function convertClaudeCommandToAgySkill(cmd: CommandFile): {
  skillName: string;
  skillMdContent: string;
  issues: ConversionIssue[];
} {
  const issues: ConversionIssue[] = [];
  const parsed = parseFrontmatter(cmd.rawContent);

  const description =
    (typeof parsed.data.description === 'string' && parsed.data.description.trim()) ||
    extractFirstParagraph(parsed.body) ||
    `Slash command /${cmd.slug} synced from Claude Code.`;

  let body = parsed.body;
  const hasArgPlaceholders = /\$ARGUMENTS|\$\d+/.test(body);
  if (hasArgPlaceholders) {
    body = body
      .replace(/\$ARGUMENTS/g, 'the arguments or target provided by the user')
      .replace(/\$(\d+)/g, 'argument #$1 provided by the user');
    issues.push({
      category: 'commands',
      item: cmd.slug,
      severity: 'warning',
      reason: 'Rewrote Claude $ARGUMENTS/$N placeholders to plain instructions for Antigravity.',
    });
  }

  const fm: Record<string, unknown> = {
    name: cmd.slug,
    description,
    [COMMAND_MARKER_KEY]: COMMAND_MARKER_VALUE,
  };

  return {
    skillName: cmd.slug,
    skillMdContent: stringifyFrontmatter(fm, body),
    issues,
  };
}

/**
 * Converts an Antigravity skill back to a Claude Code slash command ONLY if marked as command-origin.
 */
export function convertAgySkillToClaudeCommand(skill: SkillFolder, rawSkillMd: string): {
  isCommandOrigin: boolean;
  commandRelPath: string;
  content: string;
} {
  const parsed = parseFrontmatter(rawSkillMd);
  if (parsed.data[COMMAND_MARKER_KEY] !== COMMAND_MARKER_VALUE) {
    return { isCommandOrigin: false, commandRelPath: '', content: '' };
  }
  const fm: Record<string, unknown> = {};
  if (typeof parsed.data.description === 'string' && parsed.data.description.trim()) {
    fm.description = parsed.data.description.trim();
  }
  return {
    isCommandOrigin: true,
    commandRelPath: `${skill.name}.md`,
    content: stringifyFrontmatter(fm, parsed.body),
  };
}

import type { AgentFile, ConversionIssue } from '../adapters/types.js';
import { extractFirstParagraph, parseFrontmatter, stringifyFrontmatter } from '../core/frontmatter.js';
import { mapAgyToolsToClaude, mapClaudeToolsToAgy, parseToolList } from './tools-map.js';

const CLAUDE_DROPPED_FIELDS = ['model', 'color', 'permissionMode', 'maxTurns', 'disallowedTools'] as const;

/**
 * Converts a Claude Code agent definition to Antigravity's `.agents/agents/*.md` format.
 */
export function convertAgentToAgy(agent: AgentFile): {
  content: string;
  issues: ConversionIssue[];
} {
  const issues: ConversionIssue[] = [];
  const parsed = parseFrontmatter(agent.rawContent);
  const name = typeof parsed.data.name === 'string' && parsed.data.name.trim() ? parsed.data.name.trim() : agent.slug;

  let description =
    typeof parsed.data.description === 'string' && parsed.data.description.trim()
      ? parsed.data.description.trim()
      : extractFirstParagraph(parsed.body);

  if (!description) {
    description = `Subagent ${name} synced from Claude Code.`;
    issues.push({
      category: 'agents',
      item: agent.slug,
      severity: 'warning',
      reason: 'Missing description in source agent; generated fallback description.',
    });
  }

  const rawTools = parseToolList(parsed.data.tools);
  const { mapped, unmapped } = mapClaudeToolsToAgy(rawTools);
  if (unmapped.length > 0) {
    issues.push({
      category: 'agents',
      item: agent.slug,
      severity: 'warning',
      reason: `Skipped unmapped Claude tools: ${unmapped.join(', ')}`,
    });
  }

  const dropped: string[] = [];
  for (const field of CLAUDE_DROPPED_FIELDS) {
    if (parsed.data[field] !== undefined) {
      dropped.push(field);
    }
  }
  if (dropped.length > 0) {
    issues.push({
      category: 'agents',
      item: agent.slug,
      severity: 'warning',
      reason: `Dropped Claude-specific frontmatter fields: ${dropped.join(', ')}`,
    });
  }

  const targetFm: Record<string, unknown> = {
    name,
    description,
    subagent: true,
    mainAgent: false,
    tools: mapped,
  };

  return {
    content: stringifyFrontmatter(targetFm, parsed.body),
    issues,
  };
}

/**
 * Converts an Antigravity agent definition to Claude Code's `.claude/agents/*.md` format.
 */
export function convertAgentToClaude(agent: AgentFile): {
  content: string;
  issues: ConversionIssue[];
} {
  const issues: ConversionIssue[] = [];
  const parsed = parseFrontmatter(agent.rawContent);
  const name = typeof parsed.data.name === 'string' && parsed.data.name.trim() ? parsed.data.name.trim() : agent.slug;

  let description =
    typeof parsed.data.description === 'string' && parsed.data.description.trim()
      ? parsed.data.description.trim()
      : extractFirstParagraph(parsed.body);

  if (!description) {
    description = `Subagent ${name} synced from Antigravity.`;
    issues.push({
      category: 'agents',
      item: agent.slug,
      severity: 'warning',
      reason: 'Missing description in source agent; generated fallback description.',
    });
  }

  const rawTools = parseToolList(parsed.data.tools);
  const { mapped, unmapped } = mapAgyToolsToClaude(rawTools);
  if (unmapped.length > 0) {
    issues.push({
      category: 'agents',
      item: agent.slug,
      severity: 'warning',
      reason: `Skipped Antigravity-only tools: ${unmapped.join(', ')}`,
    });
  }

  if (typeof parsed.data.model === 'string' && parsed.data.model.toLowerCase().includes('gemini')) {
    issues.push({
      category: 'agents',
      item: agent.slug,
      severity: 'warning',
      reason: `Dropped Antigravity model "${parsed.data.model}" when syncing to Claude Code.`,
    });
  }

  const targetFm: Record<string, unknown> = {
    name,
    description,
  };
  if (mapped !== null && mapped.length > 0) {
    targetFm.tools = mapped.join(', ');
  }

  return {
    content: stringifyFrontmatter(targetFm, parsed.body),
    issues,
  };
}

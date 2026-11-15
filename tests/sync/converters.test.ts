import { describe, expect, it } from 'vitest';
import { convertAgentToAgy, convertAgentToClaude } from '../../src/converters/agents.js';
import { convertHooksToAgy, convertHooksToClaude } from '../../src/converters/hooks.js';
import { convertMcpToAgy, convertMcpToClaude } from '../../src/converters/mcp.js';
import { convertModularRuleToAgy, convertModularRuleToClaude, convertRootRule } from '../../src/converters/rules.js';
import { convertClaudeCommandToAgySkill, convertSkillMdForAgy } from '../../src/converters/skills.js';
import { parseFrontmatter } from '../../src/core/frontmatter.js';

describe('schema converters (Claude Code <-> Antigravity)', () => {
  it('converts agents both ways with tool mapping and frontmatter warnings', () => {
    const claudeMd = `---
name: reviewer
description: Reviews TypeScript PRs
tools: Read, Grep, Edit, Bash, NotebookEdit
model: sonnet
color: blue
---

Review code carefully.
`;
    const toAgy = convertAgentToAgy({ slug: 'reviewer', sourcePath: 'reviewer.md', rawContent: claudeMd });
    const parsedAgy = parseFrontmatter(toAgy.content);
    expect(parsedAgy.data.name).toBe('reviewer');
    expect(parsedAgy.data.subagent).toBe(true);
    expect(parsedAgy.data.mainAgent).toBe(false);
    expect(parsedAgy.data.tools).toEqual(['read_file', 'edit_file', 'run_command', 'manage_task']);
    expect(parsedAgy.data.model).toBeUndefined();
    expect(toAgy.issues.some((i) => i.reason.includes('NotebookEdit'))).toBe(true);
    expect(toAgy.issues.some((i) => i.reason.includes('model, color'))).toBe(true);

    const toClaude = convertAgentToClaude({
      slug: 'reviewer',
      sourcePath: 'reviewer.md',
      rawContent: toAgy.content,
    });
    const parsedClaude = parseFrontmatter(toClaude.content);
    expect(parsedClaude.data.name).toBe('reviewer');
    expect(parsedClaude.data.subagent).toBeUndefined();
    expect(parsedClaude.data.tools).toBe('Read, Grep, Glob, Edit, Bash');
    expect(toClaude.issues.some((i) => i.reason.includes('manage_task'))).toBe(true);
  });

  it('normalizes SKILL.md lacking frontmatter and converts slash commands with $ARGUMENTS (AC-208)', () => {
    const skillRes = convertSkillMdForAgy('my-skill', '# Title\n\nHelpful workflow for testing.');
    const parsedSkill = parseFrontmatter(skillRes.content);
    expect(parsedSkill.data.name).toBe('my-skill');
    expect(parsedSkill.data.description).toBe('Helpful workflow for testing.');

    const cmdRes = convertClaudeCommandToAgySkill({
      slug: 'git-commit',
      relPath: 'git/commit.md',
      sourcePath: 'commands/git/commit.md',
      rawContent: 'Create a commit for $ARGUMENTS using $1.',
    });
    expect(cmdRes.skillName).toBe('git-commit');
    const parsedCmd = parseFrontmatter(cmdRes.skillMdContent);
    expect(parsedCmd.data.name).toBe('git-commit');
    expect(parsedCmd.data['x-synced-from']).toBe('claude-command');
    expect(parsedCmd.body).not.toContain('$ARGUMENTS');
    expect(parsedCmd.body).not.toContain('$1');
  });

  it('converts modular rules and warns when root rule exceeds 24KB', () => {
    const claudeRule = `---
paths:
  - "src/**/*.ts"
  - "tests/**/*.ts"
---

Use strict TypeScript.
`;
    const agyRule = convertModularRuleToAgy({ name: 'ts.md', sourcePath: 'ts.md', rawContent: claudeRule });
    const parsedAgyRule = parseFrontmatter(agyRule.content);
    expect(parsedAgyRule.data.trigger).toBe('glob');
    expect(parsedAgyRule.data.globs).toBe('src/**/*.ts, tests/**/*.ts');

    const backToClaude = convertModularRuleToClaude({
      name: 'ts.md',
      sourcePath: 'ts.md',
      rawContent: agyRule.content,
    });
    const parsedBack = parseFrontmatter(backToClaude.content);
    expect(parsedBack.data.paths).toEqual(['src/**/*.ts', 'tests/**/*.ts']);

    const oversized = convertRootRule('a'.repeat(25000), 'claude-to-agy', 'GEMINI.md');
    expect(oversized.issues).toHaveLength(1);
  });

  it('converts MCP servers and skips legacy SSE (AC-204)', () => {
    const res = convertMcpToAgy({
      fs: { type: 'stdio', command: 'npx', args: ['-y', 'mcp-fs'], env: { TOKEN: 'secret' } },
      legacy: { type: 'sse', url: 'https://example.com/sse' },
      remote: { type: 'http', url: 'https://example.com/mcp' },
    });

    expect(res.servers.fs).toEqual({ command: 'npx', args: ['-y', 'mcp-fs'], env: { TOKEN: 'secret' } });
    expect(res.servers.remote).toEqual({ url: 'https://example.com/mcp' });
    expect(res.servers.legacy).toBeUndefined();
    expect(res.issues.some((i) => i.item === 'legacy' && i.severity === 'skipped')).toBe(true);

    const back = convertMcpToClaude(res.servers);
    expect(back.servers.remote?.type).toBe('http');
  });

  it('converts compatible command hooks and skips unsupported events/types', () => {
    const claudeHooks = {
      PreToolUse: [
        {
          matcher: 'Edit|Write',
          hooks: [{ type: 'command', command: './lint.sh', timeout: 10 }],
        },
      ],
      PreCompact: [{ hooks: [{ type: 'command', command: './noop.sh' }] }],
    };

    const agyRes = convertHooksToAgy(claudeHooks);
    expect(agyRes.hooksJson['synced-from-claude']).toBeDefined();
    expect(agyRes.issues.some((i) => i.item === 'PreCompact' && i.severity === 'skipped')).toBe(true);

    const backRes = convertHooksToClaude(agyRes.hooksJson);
    expect(backRes.claudeHooks.PreToolUse).toHaveLength(1);
  });
});

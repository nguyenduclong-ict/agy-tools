import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AppError } from '../../src/core/errors.js';
import { parseFrontmatter } from '../../src/core/frontmatter.js';
import { executeSync } from '../../src/sync/runner.js';

describe('sync integration (project & global modes)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tempDirs.length = 0;
  });

  function makeTempDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agy-tools-sync-'));
    tempDirs.push(dir);
    return dir;
  }

  function write(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  it('syncs claude -> agy in project mode with project-scope plugin MCP and commands (AC-202, AC-208)', async () => {
    const projectDir = makeTempDir();
    write(
      path.join(projectDir, '.claude/agents/reviewer.md'),
      `---\nname: reviewer\ndescription: Code reviewer\ntools: Read, Bash\n---\nCheck diffs.`,
    );
    write(
      path.join(projectDir, '.claude/skills/deploy/SKILL.md'),
      `---\nname: deploy\ndescription: Deploy app\n---\nRun deploy.`,
    );
    write(path.join(projectDir, '.claude/skills/deploy/scripts/run.sh'), '#!/bin/sh\necho ok\n');
    write(path.join(projectDir, 'CLAUDE.md'), '# Project Rules\nFollow strict mode.\n');
    write(path.join(projectDir, '.claude/rules/ts.md'), `---\npaths: ["src/**/*.ts"]\n---\nNo any.\n`);
    write(path.join(projectDir, '.claude/commands/git/commit.md'), 'Commit $ARGUMENTS cleanly.');
    write(
      path.join(projectDir, '.mcp.json'),
      JSON.stringify({ mcpServers: { sqlite: { command: 'npx', args: ['sqlite-mcp'] } } }),
    );

    const result = await executeSync({
      from: 'claude',
      to: 'agy',
      mode: 'project',
      rootOrHome: projectDir,
      categories: ['agents', 'skills', 'rules', 'mcp', 'commands'],
      force: true,
    });

    expect(result.created).toBeGreaterThanOrEqual(7);
    expect(fs.existsSync(path.join(projectDir, '.agents/agents/reviewer.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.agents/skills/deploy/scripts/run.sh'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, 'GEMINI.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.agents/rules/ts.md'))).toBe(true);
    expect(fs.existsSync(path.join(projectDir, '.agents/skills/git-commit/SKILL.md'))).toBe(true);

    const pluginJson = JSON.parse(
      fs.readFileSync(path.join(projectDir, '.agents/plugins/project-scope/plugin.json'), 'utf8'),
    );
    expect(pluginJson.name).toBe('project-scope');

    const mcpJson = JSON.parse(
      fs.readFileSync(path.join(projectDir, '.agents/plugins/project-scope/mcp_config.json'), 'utf8'),
    );
    expect(mcpJson.mcpServers.sqlite.command).toBe('npx');
  });

  it('syncs agy -> claude in project mode falling back to AGENTS.md when GEMINI.md is absent (AC-203)', async () => {
    const projectDir = makeTempDir();
    write(path.join(projectDir, 'AGENTS.md'), '# Shared Agent Instructions\nBe concise.\n');
    write(
      path.join(projectDir, '.agents/agents/helper.md'),
      `---\nname: helper\ndescription: Helps\nsubagent: true\nmainAgent: false\ntools: [read_file, edit_file, run_command]\n---\nBody`,
    );

    await executeSync({
      from: 'agy',
      to: 'claude',
      mode: 'project',
      rootOrHome: projectDir,
      categories: ['agents', 'rules'],
      force: true,
    });

    expect(fs.readFileSync(path.join(projectDir, 'CLAUDE.md'), 'utf8')).toContain('Shared Agent Instructions');
    const claudeAgent = parseFrontmatter(
      fs.readFileSync(path.join(projectDir, '.claude/agents/helper.md'), 'utf8'),
    );
    expect(claudeAgent.data.tools).toBe('Read, Grep, Glob, Edit, Bash');
  });

  it('merges MCP in global mode without clobbering ~/.claude.json unrelated keys and creates .bak (AC-204, AC-205, AC-206, AC-207)', async () => {
    const fakeHome = makeTempDir();
    const claudeJsonPath = path.join(fakeHome, '.claude.json');
    const agyMcpPath = path.join(fakeHome, '.gemini/config/mcp_config.json');

    write(
      claudeJsonPath,
      JSON.stringify({
        numStartups: 42,
        userID: 'keep-me',
        mcpServers: {
          existingClaude: { command: 'node', args: ['a.js'] },
        },
      }),
    );
    write(
      agyMcpPath,
      JSON.stringify({
        mcpServers: {
          newFromAgy: { url: 'https://mcp.example.com/mcp' },
        },
      }),
    );

    // Dry run writes nothing (AC-207)
    const dryRes = await executeSync({
      from: 'agy',
      to: 'claude',
      mode: 'global',
      rootOrHome: fakeHome,
      categories: ['mcp'],
      dryRun: true,
    });
    expect(dryRes.updated).toBe(1);
    expect(fs.existsSync(`${claudeJsonPath}.bak`)).toBe(false);

    // Skip existing keeps original untouched (AC-206)
    const skipRes = await executeSync({
      from: 'agy',
      to: 'claude',
      mode: 'global',
      rootOrHome: fakeHome,
      categories: ['mcp'],
      skipExisting: true,
    });
    expect(skipRes.skipped).toBe(1);

    // Force creates .bak and preserves unrelated keys in ~/.claude.json
    const forceRes = await executeSync({
      from: 'agy',
      to: 'claude',
      mode: 'global',
      rootOrHome: fakeHome,
      categories: ['mcp'],
      force: true,
    });
    expect(forceRes.updated).toBe(1);
    expect(fs.existsSync(`${claudeJsonPath}.bak`)).toBe(true);

    const updatedClaudeJson = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8'));
    expect(updatedClaudeJson.numStartups).toBe(42);
    expect(updatedClaudeJson.userID).toBe('keep-me');
    expect(updatedClaudeJson.mcpServers.existingClaude).toBeDefined();
    expect(updatedClaudeJson.mcpServers.newFromAgy.type).toBe('http');

    // Strict conflict aborts with SYNC_CONFLICT_ABORTED
    write(path.join(fakeHome, '.gemini/GEMINI.md'), '# Updated\n');
    write(path.join(fakeHome, '.claude/CLAUDE.md'), '# Old\n');
    await expect(
      executeSync({
        from: 'agy',
        to: 'claude',
        mode: 'global',
        rootOrHome: fakeHome,
        categories: ['rules'],
        strictConflicts: true,
      }),
    ).rejects.toThrowError(AppError);
  });
});

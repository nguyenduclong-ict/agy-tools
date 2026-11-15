import fs from 'node:fs';
import path from 'node:path';
import { convertAgentToAgy } from '../converters/agents.js';
import { convertHooksToAgy } from '../converters/hooks.js';
import { convertMcpToAgy } from '../converters/mcp.js';
import { convertModularRuleToAgy, convertRootRule } from '../converters/rules.js';
import { convertClaudeCommandToAgySkill, convertSkillMdForAgy } from '../converters/skills.js';
import { readJsonIfExists } from '../core/fs-atomic.js';
import { redactMcpConfigForPreview } from '../core/logger.js';
import { getAntigravityPaths } from './paths.js';
import { readAgentsFromDir, readRulesFromDir, readSkillsFromDir } from './shared-reader.js';
import type {
  ConversionIssue,
  McpServersMap,
  RuleFile,
  SourceBundle,
  SyncCategory,
  SyncMode,
  TargetArtifact,
} from './types.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === 'object' && !Array.isArray(v);
}

const PROJECT_SCOPE_PLUGIN_MANIFEST = {
  name: 'project-scope',
  displayName: 'Project Scope MCP',
  version: '1.0.0',
  description: 'Project-scoped MCP servers synced via agy-tools',
};

/**
 * Reads Antigravity configurations for the requested categories and mode.
 */
export function readAntigravityBundle(
  mode: SyncMode,
  rootOrHome: string,
  categories: Set<SyncCategory>,
): SourceBundle {
  const paths = getAntigravityPaths(mode, rootOrHome);
  const issues: ConversionIssue[] = [];

  const agents = categories.has('agents') ? readAgentsFromDir(paths.agentsDir) : [];
  const skills = categories.has('skills') || categories.has('commands') ? readSkillsFromDir(paths.skillsDir) : [];

  let rootRule: { sourcePath: string; rawContent: string } | null = null;
  let modularRules: RuleFile[] = [];
  if (categories.has('rules')) {
    if (fs.existsSync(paths.rootRuleFile)) {
      rootRule = {
        sourcePath: paths.rootRuleFile,
        rawContent: fs.readFileSync(paths.rootRuleFile, 'utf8'),
      };
    } else if (paths.fallbackRootRuleFile && fs.existsSync(paths.fallbackRootRuleFile)) {
      rootRule = {
        sourcePath: paths.fallbackRootRuleFile,
        rawContent: fs.readFileSync(paths.fallbackRootRuleFile, 'utf8'),
      };
    }
    modularRules = readRulesFromDir(paths.rulesDir);
  }

  let mcpServers: McpServersMap = {};
  let mcpSourcePath: string | null = null;
  if (categories.has('mcp')) {
    if (fs.existsSync(paths.mcpFile)) {
      mcpSourcePath = paths.mcpFile;
      const rawMcp = readJsonIfExists<Record<string, unknown>>(paths.mcpFile);
      if (rawMcp && isRecord(rawMcp.mcpServers)) {
        mcpServers = rawMcp.mcpServers as McpServersMap;
      }
    }
    if (mode === 'project') {
      const pluginsDir = path.join(paths.baseDir, 'plugins');
      if (fs.existsSync(pluginsDir)) {
        for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
          if (
            entry.isDirectory() &&
            entry.name !== 'project-scope' &&
            fs.existsSync(path.join(pluginsDir, entry.name, 'mcp_config.json'))
          ) {
            issues.push({
              category: 'mcp',
              item: entry.name,
              severity: 'warning',
              reason: `Found MCP config in extra plugin "${entry.name}"; only "project-scope" is synced automatically.`,
            });
          }
        }
      }
    }
  }

  let hooksData: unknown = null;
  let hooksSourcePath: string | null = null;
  if (categories.has('hooks') && fs.existsSync(paths.hooksFile)) {
    hooksSourcePath = paths.hooksFile;
    hooksData = readJsonIfExists<Record<string, unknown>>(paths.hooksFile);
  }

  return {
    platform: 'agy',
    mode,
    agents,
    skills,
    rootRule,
    modularRules,
    mcpServers,
    mcpSourcePath,
    commands: [],
    hooksData,
    hooksSourcePath,
    issues,
  };
}

/**
 * Builds target Antigravity artifacts from a Claude Code SourceBundle.
 */
export function buildAntigravityTargetArtifacts(
  bundle: SourceBundle,
  mode: SyncMode,
  rootOrHome: string,
  categories: Set<SyncCategory>,
): { artifacts: TargetArtifact[]; issues: ConversionIssue[] } {
  const paths = getAntigravityPaths(mode, rootOrHome);
  const artifacts: TargetArtifact[] = [];
  const issues: ConversionIssue[] = [...bundle.issues];

  if (categories.has('agents')) {
    for (const agent of bundle.agents) {
      const converted = convertAgentToAgy(agent);
      issues.push(...converted.issues);
      artifacts.push({
        kind: 'text',
        category: 'agents',
        itemName: agent.slug,
        sourcePath: agent.sourcePath,
        targetPath: path.join(paths.agentsDir, `${agent.slug}.md`),
        content: Buffer.from(converted.content, 'utf8'),
      });
    }
  }

  if (categories.has('skills')) {
    for (const skill of bundle.skills) {
      for (const file of skill.files) {
        let outBuffer = file.content;
        if (file.isSkillMd) {
          const converted = convertSkillMdForAgy(skill.name, file.content.toString('utf8'));
          issues.push(...converted.issues);
          outBuffer = Buffer.from(converted.content, 'utf8');
        }
        artifacts.push({
          kind: 'text',
          category: 'skills',
          itemName: `${skill.name}/${file.relPath}`,
          sourcePath: path.join(skill.sourceDir, file.relPath),
          targetPath: path.join(paths.skillsDir, skill.name, file.relPath),
          content: outBuffer,
        });
      }
    }
  }

  if (categories.has('commands')) {
    for (const cmd of bundle.commands) {
      const converted = convertClaudeCommandToAgySkill(cmd);
      issues.push(...converted.issues);
      artifacts.push({
        kind: 'text',
        category: 'commands',
        itemName: `${converted.skillName}/SKILL.md`,
        sourcePath: cmd.sourcePath,
        targetPath: path.join(paths.skillsDir, converted.skillName, 'SKILL.md'),
        content: Buffer.from(converted.skillMdContent, 'utf8'),
      });
    }
  }

  if (categories.has('rules')) {
    if (bundle.rootRule) {
      const converted = convertRootRule(bundle.rootRule.rawContent, 'claude-to-agy', 'GEMINI.md');
      issues.push(...converted.issues);
      artifacts.push({
        kind: 'text',
        category: 'rules',
        itemName: 'GEMINI.md',
        sourcePath: bundle.rootRule.sourcePath,
        targetPath: paths.rootRuleFile,
        content: Buffer.from(converted.content, 'utf8'),
      });
    }
    for (const rule of bundle.modularRules) {
      const converted = convertModularRuleToAgy(rule);
      issues.push(...converted.issues);
      artifacts.push({
        kind: 'text',
        category: 'rules',
        itemName: rule.name,
        sourcePath: rule.sourcePath,
        targetPath: path.join(paths.rulesDir, rule.name),
        content: Buffer.from(converted.content, 'utf8'),
      });
    }
  }

  if (categories.has('mcp') && Object.keys(bundle.mcpServers).length > 0) {
    const converted = convertMcpToAgy(bundle.mcpServers);
    issues.push(...converted.issues);

    if (Object.keys(converted.servers).length > 0) {
      if (mode === 'project' && paths.projectScopePluginJson) {
        artifacts.push({
          kind: 'text',
          category: 'mcp',
          itemName: 'project-scope/plugin.json',
          sourcePath: bundle.mcpSourcePath ?? '.mcp.json',
          targetPath: paths.projectScopePluginJson,
          content: Buffer.from(`${JSON.stringify(PROJECT_SCOPE_PLUGIN_MANIFEST, null, 2)}\n`, 'utf8'),
        });
      }

      const serverNames = Object.keys(converted.servers);
      artifacts.push({
        kind: 'json-merge',
        category: 'mcp',
        itemName: `mcpServers (${serverNames.join(', ')})`,
        sourcePath: bundle.mcpSourcePath ?? 'claude-mcp',
        targetPath: paths.mcpFile,
        merge: (existing) => {
          const prevServers = isRecord(existing.mcpServers) ? { ...existing.mcpServers } : {};
          return {
            ...existing,
            mcpServers: {
              ...prevServers,
              ...converted.servers,
            },
          };
        },
        extractSlice: (full) => {
          const all = isRecord(full.mcpServers) ? full.mcpServers : {};
          const slice: Record<string, unknown> = {};
          for (const name of serverNames) {
            if (all[name] !== undefined) {
              slice[name] = all[name];
            }
          }
          return slice;
        },
        redactSlice: (slice) => {
          if (!isRecord(slice)) return slice;
          const out: Record<string, unknown> = {};
          for (const [name, cfg] of Object.entries(slice)) {
            out[name] = isRecord(cfg) ? redactMcpConfigForPreview(cfg) : cfg;
          }
          return out;
        },
      });
    }
  }

  if (categories.has('hooks') && bundle.hooksData) {
    const converted = convertHooksToAgy(bundle.hooksData);
    issues.push(...converted.issues);

    if (Object.keys(converted.hooksJson).length > 0) {
      artifacts.push({
        kind: 'json-merge',
        category: 'hooks',
        itemName: 'hooks.json',
        sourcePath: bundle.hooksSourcePath ?? 'settings.json',
        targetPath: paths.hooksFile,
        merge: (existing) => ({
          ...existing,
          ...converted.hooksJson,
        }),
        extractSlice: (full) => ({
          'synced-from-claude': full['synced-from-claude'] ?? null,
        }),
      });
    }
  }

  return { artifacts, issues };
}

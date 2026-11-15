import fs from 'node:fs';
import path from 'node:path';
import { convertAgentToClaude } from '../converters/agents.js';
import { convertHooksToClaude } from '../converters/hooks.js';
import { convertMcpToClaude } from '../converters/mcp.js';
import { convertModularRuleToClaude, convertRootRule } from '../converters/rules.js';
import { convertAgySkillToClaudeCommand, convertSkillMdForClaude } from '../converters/skills.js';
import { readJsonIfExists } from '../core/fs-atomic.js';
import { redactMcpConfigForPreview } from '../core/logger.js';
import { getClaudePaths } from './paths.js';
import {
  readAgentsFromDir,
  readCommandsFromDir,
  readRulesFromDir,
  readSkillsFromDir,
} from './shared-reader.js';
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

/**
 * Reads Claude Code configurations for the requested categories and mode.
 */
export function readClaudeBundle(
  mode: SyncMode,
  rootOrHome: string,
  categories: Set<SyncCategory>,
): SourceBundle {
  const paths = getClaudePaths(mode, rootOrHome);
  const issues: ConversionIssue[] = [];

  const agents = categories.has('agents') ? readAgentsFromDir(paths.agentsDir) : [];
  const skills = categories.has('skills') ? readSkillsFromDir(paths.skillsDir) : [];
  const commands = categories.has('commands') ? readCommandsFromDir(paths.commandsDir) : [];

  let rootRule: { sourcePath: string; rawContent: string } | null = null;
  let modularRules: RuleFile[] = [];
  if (categories.has('rules')) {
    if (fs.existsSync(paths.rootRuleFile)) {
      rootRule = {
        sourcePath: paths.rootRuleFile,
        rawContent: fs.readFileSync(paths.rootRuleFile, 'utf8'),
      };
    }
    modularRules = readRulesFromDir(paths.rulesDir);
  }

  let mcpServers: McpServersMap = {};
  let mcpSourcePath: string | null = null;
  if (categories.has('mcp') && fs.existsSync(paths.mcpFile)) {
    mcpSourcePath = paths.mcpFile;
    const rawMcp = readJsonIfExists<Record<string, unknown>>(paths.mcpFile);
    if (rawMcp && isRecord(rawMcp.mcpServers)) {
      mcpServers = rawMcp.mcpServers as McpServersMap;
    }
  }

  let hooksData: unknown = null;
  let hooksSourcePath: string | null = null;
  if (categories.has('hooks') && fs.existsSync(paths.hooksSettingsFile)) {
    const rawSettings = readJsonIfExists<Record<string, unknown>>(paths.hooksSettingsFile);
    if (rawSettings && isRecord(rawSettings.hooks)) {
      hooksData = rawSettings.hooks;
      hooksSourcePath = paths.hooksSettingsFile;
    }
  }

  return {
    platform: 'claude',
    mode,
    agents,
    skills,
    rootRule,
    modularRules,
    mcpServers,
    mcpSourcePath,
    commands,
    hooksData,
    hooksSourcePath,
    issues,
  };
}

/**
 * Builds target Claude Code artifacts from an Antigravity SourceBundle.
 */
export function buildClaudeTargetArtifacts(
  bundle: SourceBundle,
  mode: SyncMode,
  rootOrHome: string,
  categories: Set<SyncCategory>,
): { artifacts: TargetArtifact[]; issues: ConversionIssue[] } {
  const paths = getClaudePaths(mode, rootOrHome);
  const artifacts: TargetArtifact[] = [];
  const issues: ConversionIssue[] = [...bundle.issues];

  if (categories.has('agents')) {
    for (const agent of bundle.agents) {
      const converted = convertAgentToClaude(agent);
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
          const converted = convertSkillMdForClaude(skill, file.content.toString('utf8'));
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
    for (const skill of bundle.skills) {
      const skillMd = skill.files.find((f) => f.isSkillMd);
      if (!skillMd) continue;
      const extracted = convertAgySkillToClaudeCommand(skill, skillMd.content.toString('utf8'));
      if (extracted.isCommandOrigin) {
        artifacts.push({
          kind: 'text',
          category: 'commands',
          itemName: extracted.commandRelPath,
          sourcePath: path.join(skill.sourceDir, 'SKILL.md'),
          targetPath: path.join(paths.commandsDir, extracted.commandRelPath),
          content: Buffer.from(extracted.content, 'utf8'),
        });
      }
    }
  }

  if (categories.has('rules')) {
    if (bundle.rootRule) {
      const converted = convertRootRule(bundle.rootRule.rawContent, 'agy-to-claude', path.basename(bundle.rootRule.sourcePath));
      issues.push(...converted.issues);
      artifacts.push({
        kind: 'text',
        category: 'rules',
        itemName: 'CLAUDE.md',
        sourcePath: bundle.rootRule.sourcePath,
        targetPath: paths.rootRuleFile,
        content: Buffer.from(converted.content, 'utf8'),
      });
    }
    for (const rule of bundle.modularRules) {
      const converted = convertModularRuleToClaude(rule);
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
    const converted = convertMcpToClaude(bundle.mcpServers);
    issues.push(...converted.issues);

    if (Object.keys(converted.servers).length > 0) {
      const serverNames = Object.keys(converted.servers);
      artifacts.push({
        kind: 'json-merge',
        category: 'mcp',
        itemName: `mcpServers (${serverNames.join(', ')})`,
        sourcePath: bundle.mcpSourcePath ?? 'antigravity-mcp',
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
    const converted = convertHooksToClaude(bundle.hooksData);
    issues.push(...converted.issues);

    if (Object.keys(converted.claudeHooks).length > 0) {
      artifacts.push({
        kind: 'json-merge',
        category: 'hooks',
        itemName: 'settings.json (hooks)',
        sourcePath: bundle.hooksSourcePath ?? 'hooks.json',
        targetPath: paths.hooksSettingsFile,
        merge: (existing) => {
          const prevHooks = isRecord(existing.hooks) ? { ...existing.hooks } : {};
          return {
            ...existing,
            hooks: {
              ...prevHooks,
              ...converted.claudeHooks,
            },
          };
        },
        extractSlice: (full) => (isRecord(full.hooks) ? full.hooks : {}),
      });
    }
  }

  return { artifacts, issues };
}

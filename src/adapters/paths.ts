import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { SyncMode } from './types.js';

export interface ClaudePaths {
  baseDir: string;
  agentsDir: string;
  skillsDir: string;
  rootRuleFile: string;
  rulesDir: string;
  mcpFile: string;
  commandsDir: string;
  hooksSettingsFile: string;
}

export interface AntigravityPaths {
  baseDir: string;
  agentsDir: string;
  skillsDir: string;
  rootRuleFile: string;
  fallbackRootRuleFile: string | null;
  rulesDir: string;
  mcpFile: string;
  projectScopePluginJson: string | null;
  hooksFile: string;
}

/**
 * Resolves the project root by checking explicit path or walking up to `.git`, `.claude`, or `.agents`.
 */
export function resolveProjectRoot(explicitDir?: string, cwd: string = process.cwd()): string {
  if (explicitDir) {
    return path.resolve(explicitDir);
  }
  let current = path.resolve(cwd);
  while (true) {
    if (
      fs.existsSync(path.join(current, '.git')) ||
      fs.existsSync(path.join(current, '.claude')) ||
      fs.existsSync(path.join(current, '.agents'))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return path.resolve(cwd);
    }
    current = parent;
  }
}

/**
 * Computes Claude Code configuration paths for project or global scope.
 */
export function getClaudePaths(mode: SyncMode, rootOrHome: string = os.homedir()): ClaudePaths {
  if (mode === 'global') {
    const claudeDir = path.join(rootOrHome, '.claude');
    return {
      baseDir: claudeDir,
      agentsDir: path.join(claudeDir, 'agents'),
      skillsDir: path.join(claudeDir, 'skills'),
      rootRuleFile: path.join(claudeDir, 'CLAUDE.md'),
      rulesDir: path.join(claudeDir, 'rules'),
      mcpFile: path.join(rootOrHome, '.claude.json'),
      commandsDir: path.join(claudeDir, 'commands'),
      hooksSettingsFile: path.join(claudeDir, 'settings.json'),
    };
  }

  const claudeDir = path.join(rootOrHome, '.claude');
  return {
    baseDir: claudeDir,
    agentsDir: path.join(claudeDir, 'agents'),
    skillsDir: path.join(claudeDir, 'skills'),
    rootRuleFile: path.join(rootOrHome, 'CLAUDE.md'),
    rulesDir: path.join(claudeDir, 'rules'),
    mcpFile: path.join(rootOrHome, '.mcp.json'),
    commandsDir: path.join(claudeDir, 'commands'),
    hooksSettingsFile: path.join(claudeDir, 'settings.json'),
  };
}

/**
 * Computes Antigravity configuration paths for project or global scope.
 */
export function getAntigravityPaths(mode: SyncMode, rootOrHome: string = os.homedir()): AntigravityPaths {
  if (mode === 'global') {
    const configDir = path.join(rootOrHome, '.gemini', 'config');
    return {
      baseDir: configDir,
      agentsDir: path.join(configDir, 'agents'),
      skillsDir: path.join(configDir, 'skills'),
      rootRuleFile: path.join(rootOrHome, '.gemini', 'GEMINI.md'),
      fallbackRootRuleFile: null,
      rulesDir: path.join(configDir, 'rules'),
      mcpFile: path.join(configDir, 'mcp_config.json'),
      projectScopePluginJson: null,
      hooksFile: path.join(configDir, 'hooks.json'),
    };
  }

  const agentsRoot = path.join(rootOrHome, '.agents');
  const projectScopePluginDir = path.join(agentsRoot, 'plugins', 'project-scope');
  return {
    baseDir: agentsRoot,
    agentsDir: path.join(agentsRoot, 'agents'),
    skillsDir: path.join(agentsRoot, 'skills'),
    rootRuleFile: path.join(rootOrHome, 'GEMINI.md'),
    fallbackRootRuleFile: path.join(rootOrHome, 'AGENTS.md'),
    rulesDir: path.join(agentsRoot, 'rules'),
    mcpFile: path.join(projectScopePluginDir, 'mcp_config.json'),
    projectScopePluginJson: path.join(projectScopePluginDir, 'plugin.json'),
    hooksFile: path.join(agentsRoot, 'hooks.json'),
  };
}

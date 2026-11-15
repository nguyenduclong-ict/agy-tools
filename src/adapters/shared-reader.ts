import fs from 'node:fs';
import path from 'node:path';
import { listFilesRecursive } from '../core/fs-atomic.js';
import type { AgentFile, CommandFile, RuleFile, SkillFileEntry, SkillFolder } from './types.js';

/**
 * Reads all `*.md` agent definitions one level deep from a directory.
 */
export function readAgentsFromDir(agentsDir: string): AgentFile[] {
  if (!fs.existsSync(agentsDir)) {
    return [];
  }
  const entries = fs.readdirSync(agentsDir, { withFileTypes: true });
  return entries
    .filter((e) => {
      if (!e.name.endsWith('.md')) return false;
      const fullPath = path.join(agentsDir, e.name);
      return e.isFile() || (e.isSymbolicLink() && fs.statSync(fullPath).isFile());
    })
    .map((e) => {
      const sourcePath = path.join(agentsDir, e.name);
      return {
        slug: e.name.slice(0, -3),
        sourcePath,
        rawContent: fs.readFileSync(sourcePath, 'utf8'),
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/**
 * Reads all skill directories containing a `SKILL.md` file along with all nested asset files.
 */
export function readSkillsFromDir(skillsDir: string): SkillFolder[] {
  if (!fs.existsSync(skillsDir)) {
    return [];
  }
  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  const skills: SkillFolder[] = [];

  for (const entry of entries) {
    const skillDir = path.join(skillsDir, entry.name);
    const isDir = entry.isDirectory() || (entry.isSymbolicLink() && fs.statSync(skillDir).isDirectory());
    if (!isDir) continue;
    const skillMdPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillMdPath)) continue;

    const relFiles = listFilesRecursive(skillDir);
    const files: SkillFileEntry[] = relFiles.map((relPath) => ({
      relPath,
      content: fs.readFileSync(path.join(skillDir, relPath)),
      isSkillMd: relPath === 'SKILL.md',
    }));

    skills.push({
      name: entry.name,
      sourceDir: skillDir,
      files,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Reads all `*.md` rule files from a `rules/` directory recursively.
 */
export function readRulesFromDir(rulesDir: string): RuleFile[] {
  if (!fs.existsSync(rulesDir)) {
    return [];
  }
  return listFilesRecursive(rulesDir)
    .filter((rel) => rel.endsWith('.md'))
    .map((rel) => {
      const sourcePath = path.join(rulesDir, rel);
      return {
        name: rel,
        sourcePath,
        rawContent: fs.readFileSync(sourcePath, 'utf8'),
      };
    });
}

/**
 * Reads all `*.md` slash commands recursively and computes hyphenated slugs.
 */
export function readCommandsFromDir(commandsDir: string): CommandFile[] {
  if (!fs.existsSync(commandsDir)) {
    return [];
  }
  return listFilesRecursive(commandsDir)
    .filter((rel) => rel.endsWith('.md'))
    .map((rel) => {
      const sourcePath = path.join(commandsDir, rel);
      const withoutExt = rel.slice(0, -3);
      const slug = withoutExt.replace(/\//g, '-');
      return {
        slug,
        relPath: rel,
        sourcePath,
        rawContent: fs.readFileSync(sourcePath, 'utf8'),
      };
    });
}

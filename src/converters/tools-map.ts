const CLAUDE_TO_AGY_TOOLS: Record<string, string[]> = {
  Read: ['read_file'],
  Glob: ['read_file'],
  Grep: ['read_file'],
  Edit: ['edit_file'],
  MultiEdit: ['edit_file'],
  Write: ['write_file'],
  Bash: ['run_command', 'manage_task'],
  WebSearch: ['search_web'],
  WebFetch: ['search_web'],
};

const AGY_TO_CLAUDE_TOOLS: Record<string, string[]> = {
  read_file: ['Read', 'Grep', 'Glob'],
  edit_file: ['Edit'],
  write_file: ['Write'],
  run_command: ['Bash'],
  search_web: ['WebSearch', 'WebFetch'],
};

export const AGY_ALL_DEFAULT_TOOLS: readonly string[] = [
  'read_file',
  'edit_file',
  'write_file',
  'run_command',
  'manage_task',
  'search_web',
];

/**
 * Parses tool list from YAML frontmatter (supports array or comma-separated string).
 */
export function parseToolList(raw: unknown): string[] | null {
  if (raw === undefined || raw === null) {
    return null;
  }
  if (Array.isArray(raw)) {
    return raw.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof raw === 'string') {
    const items = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return items.length > 0 ? items : [];
  }
  return null;
}

/**
 * Maps Claude Code tool names to Antigravity native tool names.
 */
export function mapClaudeToolsToAgy(claudeTools: string[] | null): {
  mapped: string[];
  unmapped: string[];
} {
  if (claudeTools === null) {
    return { mapped: [...AGY_ALL_DEFAULT_TOOLS], unmapped: [] };
  }
  const out = new Set<string>();
  const unmapped: string[] = [];

  for (const tool of claudeTools) {
    const targets = CLAUDE_TO_AGY_TOOLS[tool];
    if (targets) {
      for (const t of targets) {
        out.add(t);
      }
    } else {
      unmapped.push(tool);
    }
  }
  return { mapped: Array.from(out), unmapped };
}

/**
 * Maps Antigravity native tool names to Claude Code tool names.
 */
export function mapAgyToolsToClaude(agyTools: string[] | null): {
  mapped: string[] | null;
  unmapped: string[];
} {
  if (agyTools === null) {
    return { mapped: null, unmapped: [] };
  }
  const out = new Set<string>();
  const unmapped: string[] = [];

  for (const tool of agyTools) {
    const targets = AGY_TO_CLAUDE_TOOLS[tool];
    if (targets) {
      for (const t of targets) {
        out.add(t);
      }
    } else {
      unmapped.push(tool);
    }
  }
  return { mapped: Array.from(out), unmapped };
}

/**
 * Translates tool names inside a hook matcher regex between Claude Code and Antigravity.
 */
export function translateHookMatcher(matcher: string | undefined, direction: 'claude-to-agy' | 'agy-to-claude'): string {
  if (!matcher || matcher === '*') {
    return matcher ?? '*';
  }
  const parts = matcher.split('|').map((p) => p.trim()).filter(Boolean);
  const translated = new Set<string>();

  for (const part of parts) {
    if (direction === 'claude-to-agy') {
      const mapped = CLAUDE_TO_AGY_TOOLS[part];
      if (mapped && mapped[0]) {
        translated.add(mapped[0]);
      } else {
        translated.add(part);
      }
    } else {
      const mapped = AGY_TO_CLAUDE_TOOLS[part];
      if (mapped) {
        for (const m of mapped) {
          translated.add(m);
        }
      } else {
        translated.add(part);
      }
    }
  }

  return Array.from(translated).join('|');
}

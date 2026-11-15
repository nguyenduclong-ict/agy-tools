import type { ConversionIssue, McpServersMap } from '../adapters/types.js';

const ANTIGRAVITY_ALLOWED_MCP_KEYS = new Set([
  'command',
  'args',
  'env',
  'cwd',
  'url',
  'headers',
  'disabled',
  'variables',
]);

/**
 * Converts Claude Code mcpServers entries to Antigravity mcp_config.json schema.
 */
export function convertMcpToAgy(servers: McpServersMap): {
  servers: McpServersMap;
  issues: ConversionIssue[];
} {
  const result: McpServersMap = {};
  const issues: ConversionIssue[] = [];

  for (const [name, raw] of Object.entries(servers)) {
    const type = typeof raw.type === 'string' ? raw.type : undefined;
    const url = typeof raw.url === 'string' ? raw.url : undefined;

    if (type === 'sse' || (url && url.endsWith('/sse'))) {
      issues.push({
        category: 'mcp',
        item: name,
        severity: 'skipped',
        reason: 'Legacy SSE transport is not supported by Antigravity; wrap with mcp-remote stdio bridge if needed.',
      });
      continue;
    }

    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(raw)) {
      if (ANTIGRAVITY_ALLOWED_MCP_KEYS.has(k)) {
        clean[k] = v;
      }
    }

    if (!clean.command && !clean.url) {
      issues.push({
        category: 'mcp',
        item: name,
        severity: 'skipped',
        reason: 'MCP server lacks both "command" and "url".',
      });
      continue;
    }

    result[name] = clean;
  }

  return { servers: result, issues };
}

/**
 * Converts Antigravity mcp_config.json mcpServers entries to Claude Code format.
 */
export function convertMcpToClaude(servers: McpServersMap): {
  servers: McpServersMap;
  issues: ConversionIssue[];
} {
  const result: McpServersMap = {};
  const issues: ConversionIssue[] = [];

  for (const [name, raw] of Object.entries(servers)) {
    const clean: Record<string, unknown> = { ...raw };

    if (typeof clean.serverUrl === 'string' && !clean.url) {
      clean.url = clean.serverUrl;
      delete clean.serverUrl;
    }

    if (typeof clean.url === 'string' && !clean.type) {
      clean.type = 'http';
    }

    if (Array.isArray(clean.variables) && clean.variables.length > 0) {
      issues.push({
        category: 'mcp',
        item: name,
        severity: 'warning',
        reason: 'Server uses Antigravity plugin "variables"; ensure matching OS env vars are set when running Claude Code.',
      });
      delete clean.variables;
    }

    delete clean.disabled;
    result[name] = clean;
  }

  return { servers: result, issues };
}

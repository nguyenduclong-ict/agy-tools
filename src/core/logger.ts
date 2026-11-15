const SENSITIVE_KEY_PATTERN = /token|secret|key|password|passphrase|auth|credential|cookie/i;

/**
 * Masks sensitive environment variables or HTTP headers before displaying diffs or reports.
 */
export function maskSensitiveMap(
  record: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!record) {
    return undefined;
  }
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    if (v.startsWith('${') && v.endsWith('}')) {
      masked[k] = v;
    } else if (SENSITIVE_KEY_PATTERN.test(k) || v.length > 0) {
      masked[k] = '***';
    } else {
      masked[k] = '';
    }
  }
  return masked;
}

/**
 * Produces a secret-redacted copy of MCP server definitions safe for console diff previews.
 */
export function redactMcpConfigForPreview(config: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...config };
  if (clone.env && typeof clone.env === 'object' && !Array.isArray(clone.env)) {
    clone.env = maskSensitiveMap(clone.env as Record<string, string>);
  }
  if (clone.headers && typeof clone.headers === 'object' && !Array.isArray(clone.headers)) {
    clone.headers = maskSensitiveMap(clone.headers as Record<string, string>);
  }
  return clone;
}

import YAML from 'yaml';

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  body: string;
  hasFrontmatter: boolean;
}

const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/**
 * Parses YAML frontmatter and Markdown body without mutating body content beyond line splitting.
 */
export function parseFrontmatter(markdown: string): ParsedFrontmatter {
  const normalized = markdown.replace(/^\uFEFF/, '');
  const match = FRONTMATTER_REGEX.exec(normalized);
  if (!match) {
    return {
      data: {},
      body: normalized,
      hasFrontmatter: false,
    };
  }

  const yamlSource = match[1] ?? '';
  let parsed: unknown = {};
  if (yamlSource.trim().length > 0) {
    parsed = YAML.parse(yamlSource);
  }

  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};

  const body = normalized.slice(match[0].length);
  return {
    data,
    body,
    hasFrontmatter: true,
  };
}

/**
 * Serializes frontmatter object and Markdown body cleanly.
 * Omits frontmatter delimiters when data has no defined entries.
 */
export function stringifyFrontmatter(data: Record<string, unknown>, body: string): string {
  const cleanEntries = Object.entries(data).filter(([, value]) => value !== undefined);
  const normalizedBody = body.replace(/^\r?\n+/, '');

  if (cleanEntries.length === 0) {
    return normalizedBody.endsWith('\n') || normalizedBody.length === 0 ? normalizedBody : `${normalizedBody}\n`;
  }

  const cleanObj = Object.fromEntries(cleanEntries);
  const yamlText = YAML.stringify(cleanObj, { lineWidth: 0 }).trimEnd();
  const bodyOut = normalizedBody.length > 0 ? `\n${normalizedBody}` : '';
  const result = `---\n${yamlText}\n---\n${bodyOut}`;
  return result.endsWith('\n') ? result : `${result}\n`;
}

/**
 * Extracts the first non-empty plain text line/paragraph from Markdown body as a fallback description.
 */
export function extractFirstParagraph(body: string, maxLen = 160): string {
  const lines = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith('```'));

  const first = lines[0] ?? '';
  if (first.length <= maxLen) {
    return first;
  }
  return `${first.slice(0, maxLen - 3).trimEnd()}...`;
}

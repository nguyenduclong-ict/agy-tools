export type SyncPlatform = 'claude' | 'agy';
export type SyncMode = 'project' | 'global';
export type SyncCategory = 'agents' | 'skills' | 'rules' | 'mcp' | 'commands' | 'hooks';

export const ALL_SYNC_CATEGORIES: readonly SyncCategory[] = [
  'agents',
  'skills',
  'rules',
  'mcp',
  'commands',
  'hooks',
] as const;

export const DEFAULT_RECOMMENDED_CATEGORIES: readonly SyncCategory[] = [
  'agents',
  'skills',
  'rules',
] as const;

export interface ConversionIssue {
  category: SyncCategory;
  item: string;
  severity: 'warning' | 'skipped';
  reason: string;
}

export interface AgentFile {
  slug: string;
  sourcePath: string;
  rawContent: string;
}

export interface SkillFileEntry {
  relPath: string;
  content: Buffer;
  isSkillMd: boolean;
}

export interface SkillFolder {
  name: string;
  sourceDir: string;
  files: SkillFileEntry[];
}

export interface RuleFile {
  name: string;
  sourcePath: string;
  rawContent: string;
}

export interface CommandFile {
  slug: string;
  relPath: string;
  sourcePath: string;
  rawContent: string;
}

export type McpServersMap = Record<string, Record<string, unknown>>;

export interface SourceBundle {
  platform: SyncPlatform;
  mode: SyncMode;
  agents: AgentFile[];
  skills: SkillFolder[];
  rootRule: { sourcePath: string; rawContent: string } | null;
  modularRules: RuleFile[];
  mcpServers: McpServersMap;
  mcpSourcePath: string | null;
  commands: CommandFile[];
  hooksData: unknown;
  hooksSourcePath: string | null;
  issues: ConversionIssue[];
}

export interface TextWriteArtifact {
  kind: 'text';
  category: SyncCategory;
  itemName: string;
  sourcePath: string;
  targetPath: string;
  content: Buffer;
  previewText?: string;
}

export interface JsonMergeArtifact {
  kind: 'json-merge';
  category: SyncCategory;
  itemName: string;
  sourcePath: string;
  targetPath: string;
  merge: (existingObj: Record<string, unknown>) => Record<string, unknown>;
  extractSlice: (fullObj: Record<string, unknown>) => unknown;
  redactSlice?: (slice: unknown) => unknown;
}

export type TargetArtifact = TextWriteArtifact | JsonMergeArtifact;

export type PlanAction = 'create' | 'update' | 'unchanged' | 'skipped';

export interface SyncPlanItem {
  artifact: TargetArtifact;
  action: PlanAction;
  existingPreview: string;
  nextPreview: string;
  diffText: string;
}

export interface SyncExecutionResult {
  created: number;
  updated: number;
  unchanged: number;
  skipped: number;
  backups: Array<{ targetPath: string; backupPath: string }>;
  items: Array<{
    category: SyncCategory;
    itemName: string;
    targetPath: string;
    action: PlanAction;
  }>;
  issues: ConversionIssue[];
}

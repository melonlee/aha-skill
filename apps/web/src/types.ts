export type SourceType = 'mcp' | 'rest-api' | 'openapi';

// Claude Skill 结构 (基于 SKILL.md 规范)
export interface SkillMetadata {
  name: string;
  description: string;
  'allowed-tools'?: string[];
  model?: string;
}

export interface SkillFile {
  path: string;
  content: string;
}

export interface ClaudeSkill {
  metadata: SkillMetadata;
  instructions: string;
  supportingFiles?: SkillFile[];
}

export interface ConvertResponse {
  success: boolean;
  skill?: ClaudeSkill;
  skillMd?: string;
  errors?: string[];
}

export interface PackageResponse {
  success: boolean;
  files?: Record<string, string>;
  installPath?: string;
  instructions?: string;
  errors?: string[];
}

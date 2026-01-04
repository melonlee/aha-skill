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

// API 请求/响应
export interface ConvertRequest {
  sourceType: 'mcp' | 'rest-api' | 'openapi';
  source: string | Record<string, unknown>;
  options?: {
    generateDocs?: boolean;
  };
}

export interface ConvertResponse {
  success: boolean;
  skill?: ClaudeSkill;
  skillMd?: string;
  errors?: string[];
}

// REST API 类型
export interface RestEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description?: string;
  parameters?: RestParameter[];
  requestBody?: Record<string, unknown>;
  responses?: Record<string, unknown>;
}

export interface RestParameter {
  name: string;
  in: 'query' | 'path' | 'header';
  required?: boolean;
  schema?: Record<string, unknown>;
  description?: string;
}

export interface RestApiConfig {
  baseUrl: string;
  name?: string;
  description?: string;
  endpoints: RestEndpoint[];
  auth?: {
    type: 'bearer' | 'api-key' | 'basic';
    config: Record<string, string>;
  };
}

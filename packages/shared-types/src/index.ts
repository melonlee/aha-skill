// Skill Manifest
export interface SkillManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  sourceType: 'mcp' | 'rest-api' | 'openapi';
  tools: string[];
  permissions: string[];
}

// Tool Definition
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  handler: ToolHandler;
}

export interface ToolHandler {
  type: 'http' | 'mcp' | 'function';
  config: HttpHandlerConfig | McpHandlerConfig | FunctionHandlerConfig;
}

export interface HttpHandlerConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  bodyMapping?: Record<string, string>;
}

export interface McpHandlerConfig {
  serverName: string;
  toolName: string;
}

export interface FunctionHandlerConfig {
  runtime: 'node' | 'python';
  entrypoint: string;
}

// Prompt Configuration
export interface PromptConfig {
  system?: string;
  examples?: PromptExample[];
  templates?: Record<string, PromptTemplate>;
}

export interface PromptExample {
  user: string;
  assistant: string;
}

export interface PromptTemplate {
  content: string;
  variables?: string[];
}

// Skill Package
export interface SkillPackage {
  manifest: SkillManifest;
  tools: ToolDefinition[];
  prompts: PromptConfig;
  resources?: Record<string, unknown>;
}

// Converter Types
export interface ConvertRequest {
  sourceType: 'mcp' | 'rest-api' | 'openapi';
  source: string | Record<string, unknown>;
  options?: ConvertOptions;
}

export interface ConvertOptions {
  generatePrompts?: boolean;
  includeExamples?: boolean;
}

export interface ConvertResponse {
  success: boolean;
  package?: SkillPackage;
  errors?: string[];
}

import { BaseConverter } from './base';
import { SkillFile } from '../types';

interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info: {
    title: string;
    description?: string;
    version: string;
  };
  servers?: Array<{ url: string; description?: string }>;
  paths: Record<string, Record<string, OpenApiOperation>>;
}

interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: {
    content?: Record<string, { schema?: Record<string, unknown> }>;
    required?: boolean;
  };
  responses?: Record<string, unknown>;
}

interface OpenApiParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required?: boolean;
  description?: string;
  schema?: Record<string, unknown>;
}

export class OpenApiConverter extends BaseConverter {
  readonly sourceType = 'openapi' as const;

  parse(source: string | Record<string, unknown>): Record<string, unknown> {
    const spec = (typeof source === 'string' ? JSON.parse(source) : source) as OpenApiSpec;

    const operations = this.extractOperations(spec);
    const baseUrl = spec.servers?.[0]?.url || '';
    const tags = this.extractTags(operations);

    return {
      title: spec.info.title,
      description: spec.info.description,
      version: spec.info.version,
      baseUrl,
      operations,
      tags,
    };
  }

  generateSkillName(schema: Record<string, unknown>): string {
    const title = schema.title as string || 'openapi';
    return this.toSkillId(title);
  }

  generateDescription(schema: Record<string, unknown>): string {
    const title = schema.title as string;
    const description = schema.description as string;
    const operations = schema.operations as Array<{ summary?: string }>;
    const tags = schema.tags as string[];

    let desc = `Use this skill when working with the ${title} API. `;

    if (description) {
      desc += description.slice(0, 200);
      if (description.length > 200) desc += '...';
      desc += ' ';
    }

    if (tags.length > 0) {
      desc += `Categories: ${tags.slice(0, 5).join(', ')}.`;
    } else if (operations.length > 0) {
      const summaries = operations
        .slice(0, 3)
        .map(op => op.summary)
        .filter(Boolean)
        .join(', ');
      if (summaries) {
        desc += `Supports: ${summaries}.`;
      }
    }

    return desc.slice(0, 1024);
  }

  generateInstructions(schema: Record<string, unknown>): string {
    const title = schema.title as string;
    const description = schema.description as string;
    const version = schema.version as string;
    const baseUrl = schema.baseUrl as string;
    const operations = schema.operations as Array<{
      path: string;
      method: string;
      operationId?: string;
      summary?: string;
      description?: string;
      tags?: string[];
      parameters?: OpenApiParameter[];
      requestBody?: Record<string, unknown>;
    }>;
    const tags = schema.tags as string[];

    const lines: string[] = [];

    lines.push(`# ${title} Skill`);
    lines.push('');

    if (description) {
      lines.push(description);
      lines.push('');
    }

    lines.push(`**Version:** ${version}`);
    if (baseUrl) {
      lines.push(`**Base URL:** \`${baseUrl}\``);
    }
    lines.push('');

    // Group by tags
    if (tags.length > 0) {
      lines.push('## API Categories');
      lines.push('');
      for (const tag of tags) {
        const tagOps = operations.filter(op => op.tags?.includes(tag));
        lines.push(`- **${tag}**: ${tagOps.length} operations`);
      }
      lines.push('');
    }

    // Operations
    lines.push('## Operations');
    lines.push('');

    for (const op of operations.slice(0, 20)) {
      const opName = op.operationId || `${op.method.toUpperCase()} ${op.path}`;
      lines.push(`### ${opName}`);
      lines.push('');
      lines.push(`\`${op.method.toUpperCase()} ${op.path}\``);
      lines.push('');

      if (op.summary) {
        lines.push(op.summary);
        lines.push('');
      }

      if (op.description && op.description !== op.summary) {
        lines.push(op.description);
        lines.push('');
      }

      // Parameters
      if (op.parameters && op.parameters.length > 0) {
        lines.push('**Parameters:**');
        for (const param of op.parameters) {
          const required = param.required ? ' (required)' : '';
          const type = (param.schema as Record<string, unknown>)?.type || 'string';
          lines.push(`- \`${param.name}\` (${param.in}): ${type}${required}`);
        }
        lines.push('');
      }
    }

    if (operations.length > 20) {
      lines.push(`*... and ${operations.length - 20} more operations. See docs/full-api.md for complete reference.*`);
      lines.push('');
    }

    // Usage
    lines.push('## Usage Guidelines');
    lines.push('');
    lines.push('When helping users with this API:');
    lines.push('');
    lines.push('1. Match user requests to the appropriate operation');
    lines.push('2. Construct requests with required parameters');
    lines.push('3. Explain the expected response format');
    lines.push('4. Handle errors and edge cases appropriately');
    lines.push('');

    return lines.join('\n');
  }

  generateSupportingFiles(schema: Record<string, unknown>): SkillFile[] {
    const operations = schema.operations as Array<{
      path: string;
      method: string;
      operationId?: string;
      summary?: string;
      parameters?: OpenApiParameter[];
    }>;

    if (operations.length <= 20) return [];

    // Full API reference for large specs
    let fullRef = '# Complete API Reference\n\n';

    for (const op of operations) {
      fullRef += `## ${op.operationId || `${op.method.toUpperCase()} ${op.path}`}\n\n`;
      fullRef += `\`${op.method.toUpperCase()} ${op.path}\`\n\n`;
      if (op.summary) {
        fullRef += `${op.summary}\n\n`;
      }
    }

    return [
      { path: 'docs/full-api.md', content: fullRef }
    ];
  }

  private extractOperations(spec: OpenApiSpec) {
    const operations: Array<{
      path: string;
      method: string;
      operationId?: string;
      summary?: string;
      description?: string;
      tags?: string[];
      parameters?: OpenApiParameter[];
      requestBody?: Record<string, unknown>;
    }> = [];

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        if (['get', 'post', 'put', 'delete', 'patch'].includes(method)) {
          operations.push({
            path,
            method,
            operationId: operation.operationId,
            summary: operation.summary,
            description: operation.description,
            tags: operation.tags,
            parameters: operation.parameters,
            requestBody: this.extractRequestBody(operation.requestBody),
          });
        }
      }
    }

    return operations;
  }

  private extractRequestBody(requestBody?: OpenApiOperation['requestBody']): Record<string, unknown> | undefined {
    if (!requestBody?.content) return undefined;
    const jsonContent = requestBody.content['application/json'];
    return jsonContent?.schema as Record<string, unknown>;
  }

  private extractTags(operations: Array<{ tags?: string[] }>): string[] {
    const tagSet = new Set<string>();
    for (const op of operations) {
      for (const tag of op.tags || []) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }
}

import { BaseConverter } from './base';
import { SkillFile, RestApiConfig, RestEndpoint } from '../types';

export class RestApiConverter extends BaseConverter {
  readonly sourceType = 'rest-api' as const;

  parse(source: string | Record<string, unknown>): Record<string, unknown> {
    const data = typeof source === 'string' ? JSON.parse(source) : source;
    const config = data as RestApiConfig;

    return {
      name: config.name || this.extractNameFromUrl(config.baseUrl),
      description: config.description,
      baseUrl: config.baseUrl,
      endpoints: config.endpoints || [],
      auth: config.auth,
    };
  }

  generateSkillName(schema: Record<string, unknown>): string {
    const name = schema.name as string || 'rest-api';
    return this.toSkillId(name + '-api');
  }

  generateDescription(schema: Record<string, unknown>): string {
    const name = schema.name as string;
    const endpoints = schema.endpoints as RestEndpoint[];
    const baseUrl = schema.baseUrl as string;

    let desc = `Use this skill when working with the ${name} API (${baseUrl}). `;

    if (endpoints.length > 0) {
      const actions = endpoints
        .slice(0, 3)
        .map(e => e.description || `${e.method} ${e.path}`)
        .join(', ');
      desc += `Supports: ${actions}`;
      if (endpoints.length > 3) {
        desc += ` and ${endpoints.length - 3} more endpoints`;
      }
      desc += '.';
    }

    return desc.slice(0, 1024);
  }

  generateInstructions(schema: Record<string, unknown>): string {
    const name = schema.name as string;
    const baseUrl = schema.baseUrl as string;
    const endpoints = schema.endpoints as RestEndpoint[];
    const auth = schema.auth as RestApiConfig['auth'];

    const lines: string[] = [];

    lines.push(`# ${this.toTitle(name)} API Skill`);
    lines.push('');
    lines.push(`This skill provides guidance for working with the ${name} REST API.`);
    lines.push('');
    lines.push(`**Base URL:** \`${baseUrl}\``);
    lines.push('');

    // Authentication
    if (auth) {
      lines.push('## Authentication');
      lines.push('');
      if (auth.type === 'bearer') {
        lines.push('This API uses Bearer token authentication.');
        lines.push('Include the header: `Authorization: Bearer <token>`');
      } else if (auth.type === 'api-key') {
        lines.push('This API uses API key authentication.');
      } else if (auth.type === 'basic') {
        lines.push('This API uses Basic authentication.');
      }
      lines.push('');
    }

    // Endpoints
    if (endpoints.length > 0) {
      lines.push('## Available Endpoints');
      lines.push('');

      for (const endpoint of endpoints) {
        lines.push(`### ${endpoint.method} \`${endpoint.path}\``);
        lines.push('');

        if (endpoint.description) {
          lines.push(endpoint.description);
          lines.push('');
        }

        // Parameters
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          lines.push('**Parameters:**');
          lines.push('');
          for (const param of endpoint.parameters) {
            const required = param.required ? ' (required)' : '';
            const type = param.schema?.type || 'string';
            lines.push(`- \`${param.name}\` (${param.in}): ${type}${required}`);
            if (param.description) {
              lines.push(`  - ${param.description}`);
            }
          }
          lines.push('');
        }

        // Request body
        if (endpoint.requestBody) {
          lines.push('**Request Body:**');
          lines.push('');
          lines.push('```json');
          lines.push(JSON.stringify(endpoint.requestBody, null, 2));
          lines.push('```');
          lines.push('');
        }
      }
    }

    // Usage
    lines.push('## Usage Guidelines');
    lines.push('');
    lines.push('When helping users with this API:');
    lines.push('');
    lines.push('1. Construct the full URL by combining the base URL with the endpoint path');
    lines.push('2. Include required parameters and authentication headers');
    lines.push('3. Use appropriate HTTP methods for each operation');
    lines.push('4. Handle errors gracefully and explain any issues to the user');
    lines.push('');

    return lines.join('\n');
  }

  generateSupportingFiles(schema: Record<string, unknown>): SkillFile[] {
    const endpoints = schema.endpoints as RestEndpoint[];

    if (endpoints.length === 0) return [];

    // Generate example requests file
    let examples = '# API Examples\n\n';

    for (const endpoint of endpoints.slice(0, 5)) {
      examples += `## ${endpoint.method} ${endpoint.path}\n\n`;
      examples += '```bash\n';
      examples += `curl -X ${endpoint.method} "${schema.baseUrl}${endpoint.path}"`;

      if (endpoint.method !== 'GET' && endpoint.requestBody) {
        examples += ` \\\n  -H "Content-Type: application/json" \\\n`;
        examples += `  -d '${JSON.stringify(endpoint.requestBody)}'`;
      }

      examples += '\n```\n\n';
    }

    return [
      { path: 'docs/examples.md', content: examples }
    ];
  }

  private extractNameFromUrl(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.split('.')[0] || 'api';
    } catch {
      return 'rest-api';
    }
  }
}

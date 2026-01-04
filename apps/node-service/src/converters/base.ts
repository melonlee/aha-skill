import { ClaudeSkill, SkillMetadata, SkillFile } from '../types';

export abstract class BaseConverter {
  abstract readonly sourceType: 'rest-api' | 'openapi';

  abstract parse(source: string | Record<string, unknown>): Record<string, unknown>;
  abstract generateSkillName(schema: Record<string, unknown>): string;
  abstract generateDescription(schema: Record<string, unknown>): string;
  abstract generateInstructions(schema: Record<string, unknown>): string;

  generateAllowedTools(schema: Record<string, unknown>): string[] | undefined {
    return undefined;
  }

  generateSupportingFiles(schema: Record<string, unknown>): SkillFile[] {
    return [];
  }

  convert(source: string | Record<string, unknown>, options?: Record<string, unknown>): ClaudeSkill {
    const schema = this.parse(source);

    const metadata: SkillMetadata = {
      name: this.generateSkillName(schema),
      description: this.generateDescription(schema),
    };

    const allowedTools = this.generateAllowedTools(schema);
    if (allowedTools) {
      metadata['allowed-tools'] = allowedTools;
    }

    return {
      metadata,
      instructions: this.generateInstructions(schema),
      supportingFiles: this.generateSupportingFiles(schema),
    };
  }

  toSkillMd(skill: ClaudeSkill): string {
    const lines: string[] = ['---'];
    lines.push(`name: ${skill.metadata.name}`);
    lines.push(`description: ${skill.metadata.description}`);

    if (skill.metadata['allowed-tools']) {
      lines.push('allowed-tools:');
      for (const tool of skill.metadata['allowed-tools']) {
        lines.push(`  - ${tool}`);
      }
    }

    if (skill.metadata.model) {
      lines.push(`model: ${skill.metadata.model}`);
    }

    lines.push('---');
    lines.push('');
    lines.push(skill.instructions);

    return lines.join('\n');
  }

  protected toSkillId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);
  }

  protected toTitle(name: string): string {
    return name.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
}

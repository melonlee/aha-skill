import { SourceType } from '../types';

interface Props {
  value: SourceType;
  onChange: (type: SourceType) => void;
}

const sourceTypes: { value: SourceType; label: string; icon: string }[] = [
  { value: 'mcp', label: 'MCP Server', icon: '🔌' },
  { value: 'rest-api', label: 'REST API', icon: '🔗' },
  { value: 'openapi', label: 'OpenAPI', icon: '📄' },
];

export function SourceTypeSelector({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {sourceTypes.map((type) => (
        <button
          key={type.value}
          onClick={() => onChange(type.value)}
          className={`tag ${value === type.value ? 'active' : ''}`}
        >
          <span>{type.icon}</span>
          <span>{type.label}</span>
        </button>
      ))}
    </div>
  );
}

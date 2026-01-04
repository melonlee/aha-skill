import Editor from '@monaco-editor/react';
import { SourceType } from '../types';

interface Props {
  sourceType: SourceType;
  value: string;
  onChange: (value: string) => void;
}

const placeholders: Record<SourceType, string> = {
  mcp: `{
  "mcpServers": {
    "weather-server": {
      "command": "npx",
      "args": ["-y", "weather-mcp-server"],
      "tools": [
        {
          "name": "get_weather",
          "description": "Get current weather",
          "inputSchema": {
            "type": "object",
            "properties": {
              "location": { "type": "string" }
            }
          }
        }
      ]
    }
  }
}`,
  'rest-api': `{
  "name": "users-api",
  "baseUrl": "https://api.example.com",
  "endpoints": [
    {
      "path": "/users",
      "method": "GET",
      "description": "List all users"
    }
  ]
}`,
  openapi: `{
  "openapi": "3.0.0",
  "info": {
    "title": "Pet Store",
    "version": "1.0.0"
  },
  "paths": {
    "/pets": {
      "get": {
        "summary": "List pets"
      }
    }
  }
}`,
};

export function SourceEditor({ sourceType, value, onChange }: Props) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="dot dot-red"></div>
        <div className="dot dot-yellow"></div>
        <div className="dot dot-green"></div>
        <span className="text-gray-500 text-xs ml-2 font-mono">
          {sourceType === 'mcp' ? 'mcp-config.json' : sourceType === 'rest-api' ? 'api-config.json' : 'openapi.json'}
        </span>
      </div>
      <Editor
        height="320px"
        language="json"
        theme="vs-dark"
        value={value || placeholders[sourceType]}
        onChange={(v) => onChange(v || '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          renderLineHighlight: 'none',
        }}
      />
    </div>
  );
}

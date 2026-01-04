import { SourceType, ConvertResponse, ClaudeSkill, PackageResponse } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function convertSource(
  sourceType: SourceType,
  source: string | Record<string, unknown>
): Promise<ConvertResponse> {
  const endpoint = `${API_URL}/api/convert/${sourceType === 'rest-api' ? 'rest' : sourceType}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceType, source }),
  });

  return response.json();
}

export async function packageSkill(skill: ClaudeSkill, skillMd: string): Promise<PackageResponse> {
  const response = await fetch(`${API_URL}/api/skill/package`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skill, skillMd }),
  });

  return response.json();
}

export async function checkHealth(): Promise<Record<string, string>> {
  const response = await fetch(`${API_URL}/api/health`);
  return response.json();
}

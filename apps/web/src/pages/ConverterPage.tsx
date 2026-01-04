import { useState } from 'react';
import { SourceTypeSelector } from '../components/SourceTypeSelector';
import { SourceEditor } from '../components/SourceEditor';
import { SkillPreview } from '../components/SkillPreview';
import { convertSource, packageSkill } from '../lib/api';
import { SourceType, ClaudeSkill } from '../types';

export function ConverterPage() {
  const [sourceType, setSourceType] = useState<SourceType>('mcp');
  const [sourceCode, setSourceCode] = useState('');
  const [skill, setSkill] = useState<ClaudeSkill | null>(null);
  const [skillMd, setSkillMd] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPlaceholder = (type: SourceType): string => {
    const placeholders: Record<SourceType, string> = {
      mcp: `{"mcpServers":{"weather-server":{"command":"npx","args":["-y","weather-mcp-server"],"tools":[{"name":"get_weather","description":"Get current weather for a location","inputSchema":{"type":"object","properties":{"location":{"type":"string","description":"City name"}},"required":["location"]}}]}}}`,
      'rest-api': `{"name":"users","baseUrl":"https://api.example.com","endpoints":[{"path":"/users","method":"GET","description":"List all users"}]}`,
      openapi: `{}`,
    };
    return placeholders[type];
  };

  const handleConvert = async () => {
    setLoading(true);
    setError(null);
    try {
      const codeToConvert = sourceCode || getPlaceholder(sourceType);
      const source = JSON.parse(codeToConvert);
      const result = await convertSource(sourceType, source);
      if (result.success && result.skill && result.skillMd) {
        setSkill(result.skill);
        setSkillMd(result.skillMd);
      } else {
        setError(result.errors?.join(', ') || 'Conversion failed');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!skill || !skillMd) return;
    try {
      const result = await packageSkill(skill, skillMd);
      if (result.success && result.files) {
        const blob = new Blob([JSON.stringify(result.files, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${skill.metadata.name}-skill.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed');
    }
  };

  const asciiTitle = `
 █████╗ ██╗  ██╗ █████╗       ███████╗██╗  ██╗██╗██╗     ██╗     
██╔══██╗██║  ██║██╔══██╗      ██╔════╝██║ ██╔╝██║██║     ██║     
███████║███████║███████║█████╗███████╗█████╔╝ ██║██║     ██║     
██╔══██║██╔══██║██╔══██║╚════╝╚════██║██╔═██╗ ██║██║     ██║     
██║  ██║██║  ██║██║  ██║      ███████║██║  ██╗██║███████╗███████╗
╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝      ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝
  `.trim();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* ASCII Header */}
      <div className="text-center mb-8">
        <pre className="ascii-title inline-block text-[8px] md:text-[10px]">{asciiTitle}</pre>
        <div className="flex items-center justify-center gap-2 mt-4 text-gray-400">
          <span className="status-dot"></span>
          <span>Transform MCP servers and APIs into Claude Skills</span>
        </div>
      </div>

      {/* Command preview */}
      <div className="cmd max-w-2xl mx-auto mb-10">
        <span className="cmd-prefix">$</span>
        <span className="text-white font-mono text-sm">
          aha-skill convert --from {sourceType} --to SKILL.md
        </span>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <section>
          <div className="flex items-center gap-2 text-accent-orange mb-4">
            <span>*</span>
            <span className="font-mono">Select Source Type</span>
          </div>
          <SourceTypeSelector value={sourceType} onChange={setSourceType} />
        </section>

        {/* Step 2 */}
        <section>
          <div className="flex items-center gap-2 text-accent-orange mb-4">
            <span>*</span>
            <span className="font-mono">Configure Source</span>
          </div>
          <SourceEditor sourceType={sourceType} value={sourceCode} onChange={setSourceCode} />
        </section>

        {/* Convert Button */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleConvert}
            disabled={loading}
            className="px-6 py-2.5 bg-accent-orange text-black rounded hover:bg-accent-orange-light disabled:opacity-50 transition-all font-medium"
          >
            {loading ? 'Converting...' : 'Generate SKILL.md'}
          </button>
          {error && (
            <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 px-4 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Step 3 */}
        {skill && skillMd && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-accent-orange">
                <span>*</span>
                <span className="font-mono">Generated Skill</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(skillMd)}
                  className="px-4 py-2 bg-dark-card border border-dark-border text-white rounded hover:border-accent-orange text-sm font-medium"
                >
                  Copy SKILL.md
                </button>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-accent-orange text-black rounded hover:bg-accent-orange-light text-sm font-medium"
                >
                  Download
                </button>
              </div>
            </div>
            <SkillPreview skill={skill} skillMd={skillMd} />
          </section>
        )}
      </div>
    </div>
  );
}

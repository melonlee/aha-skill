import { ClaudeSkill } from '../types';

interface Props {
  skill: ClaudeSkill;
  skillMd: string;
}

export function SkillPreview({ skill, skillMd }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Metadata */}
        <div className="card">
          <div className="card-header">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
            <span className="text-gray-500 text-xs ml-2 font-mono">metadata</span>
          </div>
          <div className="p-4 font-mono text-sm space-y-3">
            <div>
              <span className="text-gray-500">name: </span>
              <span className="text-accent-orange">{skill.metadata.name}</span>
            </div>
            <div>
              <span className="text-gray-500">description:</span>
              <p className="text-gray-300 text-xs mt-1 leading-relaxed">
                {skill.metadata.description}
              </p>
            </div>
          </div>
        </div>

        {/* Install */}
        <div className="card">
          <div className="card-header">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
            <span className="text-gray-500 text-xs ml-2 font-mono">install</span>
          </div>
          <div className="p-4 font-mono text-xs space-y-3">
            <div>
              <span className="text-gray-500">Project:</span>
              <code className="block text-accent-orange mt-1">
                .claude/skills/{skill.metadata.name}/
              </code>
            </div>
            <div>
              <span className="text-gray-500">Personal:</span>
              <code className="block text-accent-orange mt-1">
                ~/.claude/skills/{skill.metadata.name}/
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* SKILL.md */}
      <div className="card">
        <div className="card-header">
          <div className="dot dot-red"></div>
          <div className="dot dot-yellow"></div>
          <div className="dot dot-green"></div>
          <span className="text-gray-500 text-xs ml-2 font-mono">SKILL.md</span>
        </div>
        <div className="p-4 max-h-[350px] overflow-y-auto">
          <pre className="text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed">
            {skillMd}
          </pre>
        </div>
      </div>
    </div>
  );
}

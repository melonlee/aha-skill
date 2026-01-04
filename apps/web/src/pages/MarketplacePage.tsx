import { useState } from 'react';

interface Skill {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  author: string;
  category: string;
  stars: number;
}

const mockSkills: Skill[] = [
  { id: 'code-reviewer', name: 'Code', subtitle: 'Reviewer', description: 'Automated code review with best practices', author: 'anthropic', category: 'AGENT', stars: 1250 },
  { id: 'git-automation', name: 'Git', subtitle: 'Automation', description: 'Automate git workflows and commits', author: 'community', category: 'SKILL', stars: 890 },
  { id: 'api-tester', name: 'API', subtitle: 'Tester', description: 'Test REST APIs automatically', author: 'aha-skill', category: 'MCP', stars: 720 },
  { id: 'doc-generator', name: 'Doc', subtitle: 'Generator', description: 'Generate docs from code', author: 'community', category: 'SKILL', stars: 650 },
  { id: 'data-analyzer', name: 'Data', subtitle: 'Analyzer', description: 'Analyze CSV and JSON data', author: 'anthropic', category: 'AGENT', stars: 980 },
  { id: 'sql-helper', name: 'SQL', subtitle: 'Helper', description: 'Generate SQL from natural language', author: 'community', category: 'MCP', stars: 540 },
];

const categories = ['All', 'AGENT', 'SKILL', 'MCP'];

export function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = mockSkills.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || s.category === category;
    return matchSearch && matchCat;
  });

  const asciiTitle = `
███╗   ███╗ █████╗ ██████╗ ██╗  ██╗███████╗████████╗
████╗ ████║██╔══██╗██╔══██╗██║ ██╔╝██╔════╝╚══██╔══╝
██╔████╔██║███████║██████╔╝█████╔╝ █████╗     ██║   
██║╚██╔╝██║██╔══██║██╔══██╗██╔═██╗ ██╔══╝     ██║   
██║ ╚═╝ ██║██║  ██║██║  ██║██║  ██╗███████╗   ██║   
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   
  `.trim();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* ASCII Header */}
      <div className="text-center mb-8">
        <pre className="ascii-title inline-block">{asciiTitle}</pre>
        <div className="flex items-center justify-center gap-2 mt-4 text-gray-400">
          <span className="status-dot"></span>
          <span>Discover community-built Claude Skills</span>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-4 mb-8">
        <input
          type="text"
          placeholder="Search skills..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-dark-card border border-dark-border rounded text-white placeholder-gray-500 focus:outline-none focus:border-accent-orange font-mono"
        />
        <div className="flex gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`tag ${category === cat ? 'active' : ''}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-3 gap-4">
        {filtered.map((skill) => (
          <div key={skill.id} className="card card-orange cursor-pointer">
            {/* Card Preview */}
            <div className="bg-dark-bg p-4 border-b border-dark-border">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-accent-orange font-bold text-xs tracking-wider mb-1">
                    AHA-SKILL
                  </div>
                  <div className="text-white font-bold">{skill.name}</div>
                </div>
                <span className="badge-orange">{skill.category}</span>
              </div>
              <div className="text-gray-400 text-sm mt-1">{skill.subtitle}</div>
            </div>
            
            {/* Card Content */}
            <div className="p-4">
              <p className="text-gray-500 text-sm mb-3">{skill.description}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">by {skill.author}</span>
                <span className="text-accent-orange">* {skill.stars}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

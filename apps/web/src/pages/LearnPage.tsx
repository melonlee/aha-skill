interface Article {
  id: string;
  title: string;
  subtitle: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
}

const articles: Article[] = [
  {
    id: 'getting-started-claude-skills',
    title: 'Getting Started',
    subtitle: 'Claude Skills',
    excerpt: 'Complete guide to creating and using Claude Skills in your development workflow.',
    category: 'SKILL',
    date: '2025-01-02',
    readTime: '12 min read',
  },
  {
    id: 'mcp-server-guide',
    title: 'MCP Server',
    subtitle: 'Development Guide',
    excerpt: 'Complete guide to creating Model Context Protocol servers from scratch.',
    category: 'MCP',
    date: '2025-01-01',
    readTime: '14 min read',
  },
  {
    id: 'skill-best-practices',
    title: 'Best Practices',
    subtitle: 'Skill Development',
    excerpt: 'Tips and patterns for writing effective, maintainable Claude Skills.',
    category: 'SKILL',
    date: '2024-12-28',
    readTime: '12 min read',
  },
  {
    id: 'rest-api-to-skill',
    title: 'REST API',
    subtitle: 'Converter Guide',
    excerpt: 'Transform any REST API into a Claude-compatible skill with our converter.',
    category: 'AGENT',
    date: '2024-12-25',
    readTime: '15 min read',
  },
  {
    id: 'skill-security',
    title: 'Security',
    subtitle: 'Guidelines',
    excerpt: 'Important security considerations when building and sharing Claude Skills.',
    category: 'SKILL',
    date: '2024-12-20',
    readTime: '6 min read',
  },
];

interface Props {
  onSelectArticle: (id: string) => void;
}

export function LearnPage({ onSelectArticle }: Props) {
  const asciiTitle = `
██████╗ ██╗      ██████╗  ██████╗ 
██╔══██╗██║     ██╔═══██╗██╔════╝ 
██████╔╝██║     ██║   ██║██║  ███╗
██╔══██╗██║     ██║   ██║██║   ██║
██████╔╝███████╗╚██████╔╝╚██████╔╝
╚═════╝ ╚══════╝ ╚═════╝  ╚═════╝ 
  `.trim();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* ASCII Header */}
      <div className="text-center mb-8">
        <pre className="ascii-title inline-block">{asciiTitle}</pre>
        <div className="flex items-center justify-center gap-2 mt-4 text-gray-400">
          <span className="status-dot"></span>
          <span>Latest articles about Claude Code and AI development</span>
        </div>
      </div>

      {/* Section Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-accent-orange mb-2">
          <span>*</span>
          <span className="font-mono">Blog (articles/tutorials/guides)</span>
        </div>
        <div className="tree-line text-gray-500 text-sm">
          Learn how to maximize your AI-powered development with Claude Code
        </div>
      </div>

      {/* Featured Posts */}
      <div className="mb-8">
        <h2 className="flex items-center gap-2 text-white font-medium mb-4">
          <span className="text-accent-orange">*</span> Featured Posts
        </h2>
        
        <div className="grid grid-cols-4 gap-4">
          {articles.slice(0, 4).map((article) => (
            <div
              key={article.id}
              className="card card-orange cursor-pointer"
              onClick={() => onSelectArticle(article.id)}
            >
              {/* Card Preview */}
              <div className="bg-dark-bg p-4 border-b border-dark-border">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-accent-orange font-bold text-xs tracking-wider mb-1">
                      AHA-SKILL
                    </div>
                    <div className="text-white font-bold">{article.title}</div>
                  </div>
                  <span className="badge-orange">{article.category}</span>
                </div>
                <div className="text-gray-400 text-sm mt-1">{article.subtitle}</div>
              </div>
              
              {/* Card Content */}
              <div className="p-4">
                <div className="text-gray-500 text-xs mb-2">{article.readTime}</div>
                <h3 className="text-white font-medium text-sm mb-2">
                  {article.title}: {article.subtitle}
                </h3>
                <p className="text-gray-500 text-xs line-clamp-2">{article.excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* All Articles */}
      <div>
        <h2 className="flex items-center gap-2 text-white font-medium mb-4">
          <span className="text-accent-orange">*</span> All Articles
        </h2>
        
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="card p-4 cursor-pointer flex items-center gap-4"
              onClick={() => onSelectArticle(article.id)}
            >
              <div className="w-16 h-16 bg-dark-bg border border-dark-border rounded flex items-center justify-center">
                <div className="text-center">
                  <div className="text-accent-orange font-bold text-[8px]">AHA</div>
                  <div className="text-accent-orange font-bold text-[8px]">SKILL</div>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge-orange">{article.category}</span>
                  <span className="text-gray-500 text-xs">{article.readTime}</span>
                </div>
                <h3 className="text-white font-medium">{article.title}: {article.subtitle}</h3>
                <p className="text-gray-500 text-sm">{article.excerpt}</p>
              </div>
              <div className="text-gray-500 text-xs">{article.date}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface Props {
  articleId: string;
  onBack: () => void;
}

const articleContent: Record<string, { title: string; subtitle: string; content: string; category: string; date: string }> = {
  'getting-started-claude-skills': {
    title: 'Getting Started',
    subtitle: 'Claude Skills',
    category: 'SKILL',
    date: '2025-01-02',
    content: `
## What are Claude Skills?

Claude Skills are markdown files that teach Claude how to perform specific tasks. They follow the SKILL.md format and are automatically invoked by Claude when relevant to your request.

## Creating Your First Skill

1. Create a directory: \`.claude/skills/my-skill/\`
2. Add a \`SKILL.md\` file with YAML frontmatter
3. Write instructions in markdown

## Example SKILL.md

\`\`\`markdown
---
name: code-reviewer
description: Reviews code for best practices
---

# Code Reviewer

When asked to review code, analyze it for:
- Code quality and readability
- Potential bugs or issues
- Performance considerations
\`\`\`

## Where to Store Skills

| Location | Path | Scope |
|----------|------|-------|
| Personal | ~/.claude/skills/ | All projects |
| Project | .claude/skills/ | Current repo |
    `,
  },
  'mcp-server-guide': {
    title: 'MCP Server',
    subtitle: 'Development Guide',
    category: 'MCP',
    date: '2025-01-01',
    content: `
## What is MCP?

Model Context Protocol (MCP) is a standard for connecting AI assistants to external tools and data sources.

## Basic MCP Server Structure

An MCP server exposes tools that Claude can invoke. Each tool has:
- A name
- A description
- An input schema (JSON Schema)

## Creating a Simple Server

\`\`\`javascript
const tools = [
  {
    name: "get_time",
    description: "Get the current time",
    inputSchema: {
      type: "object",
      properties: {}
    }
  }
];
\`\`\`

## Converting to a Skill

Use our Skill Converter to transform your MCP server configuration into a SKILL.md file.
    `,
  },
  'skill-best-practices': {
    title: 'Best Practices',
    subtitle: 'Skill Development',
    category: 'SKILL',
    date: '2024-12-28',
    content: `
## Writing Effective Descriptions

The description field is crucial - Claude uses it to decide when to apply your skill.

**Good description:**
> Reviews pull requests for code quality and security issues

**Bad description:**
> Helps with code

## Using allowed-tools

Restrict which tools Claude can use:

\`\`\`yaml
---
name: safe-reader
description: Reads files without modifications
allowed-tools:
  - Read
  - Grep
---
\`\`\`
    `,
  },
  'rest-api-to-skill': {
    title: 'REST API',
    subtitle: 'Converter Guide',
    category: 'AGENT',
    date: '2024-12-25',
    content: `
## Why Convert APIs to Skills?

Skills teach Claude how to use APIs effectively, including:
- Endpoint documentation
- Authentication patterns
- Error handling

## Using the Converter

1. Go to the Converter page
2. Select "REST API" as source type
3. Paste your API configuration
4. Click "Generate SKILL.md"
    `,
  },
  'skill-security': {
    title: 'Security',
    subtitle: 'Guidelines',
    category: 'SKILL',
    date: '2024-12-20',
    content: `
## Security Considerations

### 1. Tool Restrictions

Use \`allowed-tools\` to limit what Claude can do:

\`\`\`yaml
allowed-tools:
  - Read
  - Grep
\`\`\`

### 2. Sensitive Data

Never include in skills:
- API keys or secrets
- Personal information
- Internal URLs

### 3. Third-Party Skills

Before installing community skills:
- Review the SKILL.md content
- Check the author's reputation
    `,
  },
};

export function ArticlePage({ articleId, onBack }: Props) {
  const article = articleContent[articleId];

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <button onClick={onBack} className="text-accent-orange hover:underline mb-4">
          ← Back to Blog
        </button>
        <p className="text-gray-400">Article not found</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <button 
        onClick={onBack} 
        className="text-accent-orange hover:underline mb-6 flex items-center gap-2 font-mono"
      >
        ← Back to Blog
      </button>

      <div className="card">
        <div className="card-header">
          <div className="dot dot-red"></div>
          <div className="dot dot-yellow"></div>
          <div className="dot dot-green"></div>
          <span className="text-gray-500 text-xs ml-2 font-mono">{articleId}.md</span>
        </div>
        
        {/* Article Header */}
        <div className="bg-dark-bg p-6 border-b border-dark-border">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-accent-orange font-bold text-xs tracking-wider mb-2">
                AHA-SKILL
              </div>
              <h1 className="text-3xl font-bold text-white">{article.title}</h1>
              <div className="text-gray-400 text-lg">{article.subtitle}</div>
            </div>
            <span className="badge-orange">{article.category}</span>
          </div>
          <div className="text-gray-500 text-sm">{article.date}</div>
        </div>

        {/* Article Content */}
        <div className="p-6">
          <div 
            className="text-gray-300 leading-relaxed space-y-4"
            dangerouslySetInnerHTML={{ 
              __html: article.content
                .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-accent-orange mt-8 mb-4">$1</h2>')
                .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-6 mb-3">$1</h3>')
                .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>')
                .replace(/`([^`]+)`/g, '<code class="bg-dark-bg px-1.5 py-0.5 rounded text-accent-orange text-sm font-mono">$1</code>')
                .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-dark-bg border border-dark-border rounded p-4 overflow-x-auto my-4"><code class="text-sm font-mono text-gray-300">$2</code></pre>')
                .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-accent-orange pl-4 italic text-gray-400 my-4">$1</blockquote>')
                .replace(/^(\d+)\. (.+)$/gm, '<div class="flex gap-3 my-2"><span class="text-accent-orange font-mono">$1.</span><span>$2</span></div>')
                .replace(/^- (.+)$/gm, '<div class="flex gap-3 my-2"><span class="text-accent-orange">•</span><span>$1</span></div>')
                .replace(/\n\n/g, '</p><p class="my-4">')
            }}
          />
        </div>
      </div>
    </div>
  );
}

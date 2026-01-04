import { useState } from 'react';
import Editor from '@monaco-editor/react';

interface Message {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  toolName?: string;
}

const sampleSkill = `---
name: weather-skill
description: Get weather information for any location
---

# Weather Skill

Provides weather data for locations worldwide.

## Tools
- get_weather: Get current weather
`;

export function PlaygroundPage() {
  const [skillConfig, setSkillConfig] = useState(sampleSkill);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Skill loaded! Try asking about the weather.' },
  ]);
  const [input, setInput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    setInput('');
    setIsRunning(true);

    setTimeout(() => {
      setMessages((prev) => [...prev, {
        role: 'tool',
        content: '{"temp": 22, "condition": "sunny"}',
        toolName: 'get_weather',
      }]);
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: "It's 22C and sunny. Great weather!",
        }]);
        setIsRunning(false);
      }, 400);
    }, 600);
  };

  const asciiTitle = `
██████╗ ██╗      █████╗ ██╗   ██╗
██╔══██╗██║     ██╔══██╗╚██╗ ██╔╝
██████╔╝██║     ███████║ ╚████╔╝ 
██╔═══╝ ██║     ██╔══██║  ╚██╔╝  
██║     ███████╗██║  ██║   ██║   
╚═╝     ╚══════╝╚═╝  ╚═╝   ╚═╝   
  `.trim();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* ASCII Header */}
      <div className="text-center mb-8">
        <pre className="ascii-title inline-block">{asciiTitle}</pre>
        <div className="flex items-center justify-center gap-2 mt-4 text-gray-400">
          <span className="status-dot"></span>
          <span>Test and debug your Claude Skills</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 h-[550px]">
        {/* Editor */}
        <div className="card flex flex-col">
          <div className="card-header">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
            <span className="text-gray-500 text-xs ml-2 font-mono">SKILL.md</span>
          </div>
          <div className="flex-1">
            <Editor
              height="100%"
              language="markdown"
              theme="vs-dark"
              value={skillConfig}
              onChange={(v) => setSkillConfig(v || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                padding: { top: 12 },
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </div>
        </div>

        {/* Chat */}
        <div className="card flex flex-col">
          <div className="card-header">
            <div className="dot dot-red"></div>
            <div className="dot dot-yellow"></div>
            <div className="dot dot-green"></div>
            <span className="text-gray-500 text-xs ml-2 font-mono">sandbox</span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-accent-orange">
              <span className="status-dot"></span>
              Connected
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'tool' ? (
                  <div className="bg-accent-orange/10 border border-accent-orange/30 rounded p-3 max-w-[85%]">
                    <div className="text-xs text-accent-orange mb-1">[tool] {msg.toolName}</div>
                    <pre className="text-xs text-gray-300 font-mono">{msg.content}</pre>
                  </div>
                ) : (
                  <div className={`rounded p-3 max-w-[80%] ${
                    msg.role === 'user' ? 'bg-accent-orange text-black' : 'bg-dark-card text-white'
                  }`}>
                    <p className="text-sm">{msg.content}</p>
                  </div>
                )}
              </div>
            ))}
            {isRunning && (
              <div className="flex gap-1 p-3">
                <span className="w-2 h-2 bg-accent-orange rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                <span className="w-2 h-2 bg-accent-orange rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-dark-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Test your skill..."
                className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded text-white placeholder-gray-500 text-sm focus:outline-none focus:border-accent-orange font-mono"
              />
              <button
                onClick={handleSend}
                disabled={isRunning}
                className="px-4 py-2 bg-accent-orange text-black rounded hover:bg-accent-orange-light disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

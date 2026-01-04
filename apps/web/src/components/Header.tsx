type Page = 'converter' | 'marketplace' | 'playground' | 'learn';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
}

const navItems: { page: Page; label: string }[] = [
  { page: 'converter', label: 'Converter' },
  { page: 'marketplace', label: 'Marketplace' },
  { page: 'playground', label: 'Playground' },
  { page: 'learn', label: 'Blog' },
];

export function Header({ currentPage, onNavigate }: Props) {
  return (
    <header className="border-b border-dark-border sticky top-0 bg-dark-bg/95 backdrop-blur z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer group" 
            onClick={() => onNavigate('converter')}
          >
            <div className="w-8 h-8 rounded bg-accent-orange flex items-center justify-center">
              <span className="text-black font-bold text-sm">A</span>
            </div>
            <span className="font-bold text-accent-orange group-hover:text-accent-orange-light transition-colors">
              aha-skill
            </span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className={`px-4 py-1.5 rounded text-sm transition-all font-medium ${
                  currentPage === item.page
                    ? 'bg-accent-orange text-black'
                    : 'text-accent-orange hover:text-accent-orange-light hover:bg-accent-orange/10'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          <a href="#" className="px-3 py-1.5 text-sm text-accent-orange hover:text-accent-orange-light border border-dark-border rounded hover:border-accent-orange transition-all">
            Home
          </a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm text-accent-orange hover:text-accent-orange-light border border-dark-border rounded hover:border-accent-orange transition-all">
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
}

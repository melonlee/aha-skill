import { useState } from 'react';
import { Header } from './components/Header';
import { ConverterPage } from './pages/ConverterPage';
import { MarketplacePage } from './pages/MarketplacePage';
import { PlaygroundPage } from './pages/PlaygroundPage';
import { LearnPage } from './pages/LearnPage';
import { ArticlePage } from './pages/ArticlePage';

type Page = 'converter' | 'marketplace' | 'playground' | 'learn';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('converter');
  const [selectedArticle, setSelectedArticle] = useState<string | null>(null);

  const handleNavigate = (page: Page) => {
    setCurrentPage(page);
    setSelectedArticle(null);
  };

  const renderPage = () => {
    if (selectedArticle) {
      return <ArticlePage articleId={selectedArticle} onBack={() => setSelectedArticle(null)} />;
    }

    switch (currentPage) {
      case 'converter':
        return <ConverterPage />;
      case 'marketplace':
        return <MarketplacePage />;
      case 'playground':
        return <PlaygroundPage />;
      case 'learn':
        return <LearnPage onSelectArticle={setSelectedArticle} />;
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg grid-bg flex flex-col">
      <Header currentPage={currentPage} onNavigate={handleNavigate} />
      <main className="flex-1">{renderPage()}</main>
      <footer className="border-t border-dark-border">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between text-gray-500 text-sm">
          <span>Built for Aha Skills</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">GitHub</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
            <a href="#" className="hover:text-white transition-colors">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;

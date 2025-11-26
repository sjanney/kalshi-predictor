import { lazy, Suspense, useState } from 'react';
import { GameContextProvider } from './contexts/GameContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';

// Lazy load Dashboard for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));

function App() {
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);

  // Handle loading screen completion
  const handleLoadingComplete = () => {
    // Add a small delay before hiding to ensure smooth transition
    setTimeout(() => {
      setShowLoadingScreen(false);
    }, 200);
  };

  return (
    <>
      {/* Show loading screen during initialization */}
      {showLoadingScreen && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}

      {/* Main app content */}
      <div className={`transition-opacity duration-300 ${showLoadingScreen ? 'opacity-0' : 'opacity-100'}`}>
        <GameContextProvider>
          <ErrorBoundary>
            <Suspense fallback={
              <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-white text-lg">Loading dashboard...</div>
              </div>
            }>
              <Dashboard />
            </Suspense>
          </ErrorBoundary>
        </GameContextProvider>
      </div>
    </>
  );
}

export default App;

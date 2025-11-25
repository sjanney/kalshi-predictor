import { lazy, Suspense } from 'react';
import { GameContextProvider } from './contexts/GameContext';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load Dashboard for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));

function App() {
  return (
    <GameContextProvider>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-white text-lg">Loading...</div>
          </div>
        }>
          <Dashboard />
        </Suspense>
      </ErrorBoundary>
    </GameContextProvider>
  );
}

export default App;

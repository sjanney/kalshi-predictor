import { lazy, Suspense, useState, useEffect } from 'react';
import OnboardingModal from './components/OnboardingModal';
import { GameContextProvider } from './contexts/GameContext';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingScreen from './components/LoadingScreen';
import LicenseActivation from './components/LicenseActivation';

// Lazy load Dashboard for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));

function App() {
  const [showLoadingScreen, setShowLoadingScreen] = useState(true);
  const [licenseValid, setLicenseValid] = useState<boolean | null>(null);
  const [onboardingCompleted, setOnboardingCompleted] = useState(() => {
    return localStorage.getItem('onboardingCompleted') === 'true';
  });

  // Check license on startup
  useEffect(() => {
    const checkLicense = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/license/status');
        const data = await response.json();
        if (data.status === 'valid') {
          setLicenseValid(true);
        } else {
          setLicenseValid(false);
        }
      } catch (error) {
        console.error("Failed to check license:", error);
        // If backend is down, we might default to false or retry. 
        // For security, default to false.
        setLicenseValid(false);
      }
    };

    checkLicense();
  }, []);

  // Handle loading screen completion
  const handleOnboardingComplete = () => {
    setOnboardingCompleted(true);
    // After onboarding, we still want the loading screen flow to run
    handleLoadingComplete();
  };

  const handleLoadingComplete = () => {
    // Add a small delay before hiding to ensure smooth transition
    setTimeout(() => {
      setShowLoadingScreen(false);
    }, 200);
  };

  const handleLicenseSuccess = () => {
    setLicenseValid(true);
  };

  // If license check is still running, keep loading screen (or show nothing if you prefer)
  // But we have showLoadingScreen for that.

  // Logic:
  // 1. Loading Screen shows initially.
  // 2. In background, check license.
  // 3. If license invalid -> Hide loading screen, Show License Activation.
  // 4. If license valid -> Proceed to Onboarding/Dashboard logic.

  useEffect(() => {
    if (licenseValid === false) {
      // If license is definitely invalid, stop loading screen so user can see activation
      setShowLoadingScreen(false);
    }
  }, [licenseValid]);

  if (licenseValid === false) {
    return <LicenseActivation onSuccess={handleLicenseSuccess} />;
  }

  return (
    <>
      {/* Onboarding modal - Only show if license is valid (implied by not returning above) */}
      {!onboardingCompleted && licenseValid === true && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}

      {/* Show loading screen during initialization */}
      {showLoadingScreen && (
        <LoadingScreen onComplete={handleLoadingComplete} />
      )}

      {/* Main app content */}
      {!showLoadingScreen && licenseValid === true && (
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
      )}
    </>
  );
}

export default App;

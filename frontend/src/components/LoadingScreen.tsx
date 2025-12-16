import { useEffect, useState } from 'react';

interface LoadingScreenProps {
    onComplete?: () => void;
    minDisplayTime?: number; // Minimum time to show loading screen in ms (default: 2000)
}

interface LoadingStep {
    id: string;
    label: string;
    duration: number; // milliseconds
}

// Adjust these durations to control how long the loading screen displays
// Total time = sum of all durations + transition delays
const LOADING_STEPS: LoadingStep[] = [
    { id: 'init', label: 'Initializing application...', duration: 400 },
    { id: 'backend', label: 'Connecting to prediction engine...', duration: 600 },
    { id: 'data', label: 'Loading market data...', duration: 800 },
    { id: 'ui', label: 'Preparing dashboard...', duration: 500 },
];

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout>;
        let startTime = Date.now();
        const currentStep = LOADING_STEPS[currentStepIndex];

        if (currentStepIndex < LOADING_STEPS.length) {
            // Animate progress for current step
            const animateProgress = () => {
                const elapsed = Date.now() - startTime;
                const stepProgress = Math.min(elapsed / currentStep.duration, 1);

                // Calculate overall progress
                const completedSteps = currentStepIndex;
                const totalSteps = LOADING_STEPS.length;
                const overallProgress = ((completedSteps + stepProgress) / totalSteps) * 100;

                setProgress(overallProgress);

                if (stepProgress < 1) {
                    requestAnimationFrame(animateProgress);
                } else {
                    // Move to next step
                    if (currentStepIndex < LOADING_STEPS.length - 1) {
                        timeoutId = setTimeout(() => {
                            setCurrentStepIndex(prev => prev + 1);
                        }, 100);
                    } else {
                        // All steps complete
                        timeoutId = setTimeout(() => {
                            setIsComplete(true);
                            onComplete?.();
                        }, 300);
                    }
                }
            };

            requestAnimationFrame(animateProgress);
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [currentStepIndex, onComplete]);

    const currentStep = LOADING_STEPS[currentStepIndex];

    return (
        <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${isComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
        >
            {/* Animated background gradient */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-kalshi-green/5 via-transparent to-primary/5 animate-pulse"
                    style={{ animationDuration: '3s' }}
                />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-kalshi-green/10 rounded-full blur-3xl animate-pulse"
                    style={{ animationDuration: '4s', animationDelay: '0.5s' }}
                />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"
                    style={{ animationDuration: '5s', animationDelay: '1s' }}
                />
            </div>

            {/* Loading content */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-8 max-w-md w-full">
                {/* Logo/Icon */}
                <div className="relative">
                    <div className="absolute inset-0 bg-kalshi-green/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-kalshi-green to-primary flex items-center justify-center">
                        <svg
                            className="w-10 h-10 text-white animate-pulse"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                        </svg>
                    </div>
                </div>

                {/* App Title */}
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                        Kalshi Predictor
                    </h1>
                    <p className="text-sm text-zinc-400">
                        AI-Powered Market Intelligence
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="w-full space-y-3">
                    {/* Current step label */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-300 font-medium animate-pulse">
                            {currentStep?.label}
                        </span>
                        <span className="text-kalshi-green font-mono font-semibold">
                            {Math.round(progress)}%
                        </span>
                    </div>

                    {/* Progress bar container */}
                    <div className="relative h-2 bg-surface rounded-full overflow-hidden">
                        {/* Background shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"
                            style={{
                                animation: 'shimmer 2s infinite',
                                backgroundSize: '200% 100%'
                            }}
                        />

                        {/* Actual progress */}
                        <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-kalshi-green to-primary rounded-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        >
                            {/* Glow effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-kalshi-green/50 to-primary/50 blur-sm" />
                        </div>
                    </div>

                    {/* Step indicators */}
                    <div className="flex justify-between gap-2 pt-2">
                        {LOADING_STEPS.map((step, index) => (
                            <div
                                key={step.id}
                                className="flex-1 h-1 rounded-full bg-surface overflow-hidden"
                            >
                                <div
                                    className={`h-full transition-all duration-500 ${index < currentStepIndex
                                        ? 'bg-kalshi-green w-full'
                                        : index === currentStepIndex
                                            ? 'bg-kalshi-green/50 w-full animate-pulse'
                                            : 'bg-transparent w-0'
                                        }`}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Subtle loading dots */}
                <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="w-2 h-2 rounded-full bg-kalshi-green/50 animate-pulse"
                            style={{
                                animationDelay: `${i * 0.2}s`,
                                animationDuration: '1.5s'
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

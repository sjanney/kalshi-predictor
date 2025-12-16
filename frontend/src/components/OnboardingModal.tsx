import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Key, Globe, Database, CheckCircle, ArrowRight } from 'lucide-react';

interface OnboardingModalProps {
    onComplete: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
    const [apiKey, setApiKey] = useState('');
    const [apiBaseUrl, setApiBaseUrl] = useState('https://api.elections.kalshi.com');
    const [useMock, setUseMock] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Check if config already exists
    useEffect(() => {
        const existingConfig = localStorage.getItem('kalshiConfig');
        if (existingConfig) {
            try {
                const config = JSON.parse(existingConfig);
                setApiKey(config.kalshiApiKey || '');
                setApiBaseUrl(config.kalshiBaseUrl || 'https://api.elections.kalshi.com');
                setUseMock(config.useMockData || false);
            } catch (e) {
                console.error('Failed to parse existing config:', e);
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        // Simulate a brief save operation for smooth UX
        await new Promise(resolve => setTimeout(resolve, 800));

        const config = {
            kalshiApiKey: apiKey,
            kalshiBaseUrl: apiBaseUrl,
            useMockData: useMock,
        };

        // Store in localStorage (in production, use Electron's secure storage)
        localStorage.setItem('kalshiConfig', JSON.stringify(config));
        localStorage.setItem('onboardingCompleted', 'true');

        setIsSubmitting(false);
        onComplete();
    };

    const canProceed = useMock || apiKey.trim().length > 0;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 flex items-center justify-center bg-background/95 backdrop-blur-xl z-50"
            >
                {/* Animated background elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse"
                        style={{ animationDuration: '4s' }}
                    />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-kalshi-green/10 rounded-full blur-3xl animate-pulse"
                        style={{ animationDuration: '5s', animationDelay: '1s' }}
                    />
                </div>

                {/* Modal content */}
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                    className="relative w-full max-w-lg mx-4"
                >
                    {/* Glass card */}
                    <div className="glass-panel rounded-3xl p-8 shadow-2xl border border-white/10">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-kalshi-green to-primary mb-4 relative">
                                <div className="absolute inset-0 bg-kalshi-green/20 rounded-2xl blur-xl animate-pulse" />
                                <Zap className="w-8 h-8 text-white relative z-10" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
                                Welcome to Kalshi Predictor
                            </h1>
                            <p className="text-zinc-400 text-sm">
                                AI-Powered Market Intelligence Platform
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* API Key Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300" htmlFor="apiKey">
                                    <Key className="w-4 h-4 text-kalshi-green" />
                                    Kalshi API Key
                                    {!useMock && <span className="text-danger text-xs">*</span>}
                                </label>
                                <div className="relative">
                                    <input
                                        id="apiKey"
                                        type="password"
                                        required={!useMock}
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        disabled={useMock}
                                        placeholder={useMock ? "Not required in mock mode" : "Enter your API key"}
                                        className="w-full px-4 py-3 bg-surface/50 backdrop-blur-sm text-white rounded-xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-kalshi-green/50 focus:border-kalshi-green/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-zinc-600"
                                    />
                                </div>
                                <p className="text-xs text-zinc-500 flex items-center gap-1">
                                    <Database className="w-3 h-3" />
                                    Your API key is stored securely on your device
                                </p>
                            </div>

                            {/* API Base URL Input */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm font-medium text-zinc-300" htmlFor="apiBaseUrl">
                                    <Globe className="w-4 h-4 text-primary" />
                                    API Base URL
                                    <span className="text-zinc-500 text-xs font-normal">(optional)</span>
                                </label>
                                <input
                                    id="apiBaseUrl"
                                    type="text"
                                    value={apiBaseUrl}
                                    onChange={(e) => setApiBaseUrl(e.target.value)}
                                    placeholder="https://api.elections.kalshi.com"
                                    className="w-full px-4 py-3 bg-surface/50 backdrop-blur-sm text-white rounded-xl border border-white/5 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all placeholder:text-zinc-600"
                                />
                            </div>

                            {/* Mock Data Toggle */}
                            <div className="relative">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-surface/30 border border-white/5 hover:border-kalshi-green/30 transition-all cursor-pointer"
                                    onClick={() => setUseMock(!useMock)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${useMock
                                            ? 'bg-kalshi-green border-kalshi-green'
                                            : 'border-zinc-600 bg-transparent'
                                            }`}>
                                            {useMock && <CheckCircle className="w-4 h-4 text-white" />}
                                        </div>
                                        <div>
                                            <label htmlFor="useMock" className="text-sm font-medium text-white cursor-pointer">
                                                Use Mock Data
                                            </label>
                                            <p className="text-xs text-zinc-500">
                                                Demo mode with simulated predictions
                                            </p>
                                        </div>
                                    </div>
                                    <input
                                        id="useMock"
                                        type="checkbox"
                                        checked={useMock}
                                        onChange={(e) => setUseMock(e.target.checked)}
                                        className="sr-only"
                                    />
                                </div>
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                type="submit"
                                disabled={!canProceed || isSubmitting}
                                whileHover={{ scale: canProceed ? 1.02 : 1 }}
                                whileTap={{ scale: canProceed ? 0.98 : 1 }}
                                className={`w-full py-4 px-6 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 ${canProceed
                                    ? 'bg-gradient-to-r from-kalshi-green to-primary hover:shadow-lg hover:shadow-kalshi-green/25'
                                    : 'bg-surface/50 cursor-not-allowed opacity-50'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        Continue
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        {/* Footer note */}
                        <div className="mt-6 pt-6 border-t border-white/5">
                            <p className="text-xs text-center text-zinc-500">
                                You can change these settings anytime in the app preferences
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default OnboardingModal;

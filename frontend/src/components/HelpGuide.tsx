import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, BookOpen, Zap, TrendingUp, BarChart3,
    DollarSign, Target, Activity, Brain, Gauge, AlertTriangle, Bell,
    Calculator, Filter, Settings,
    ChevronDown, CheckCircle2, Circle, Play, Pause, Sparkles,
    ArrowRight, Info, Lightbulb, Award
} from 'lucide-react';
import { cn } from './ui/shared';

interface HelpGuideProps {
    open: boolean;
    onClose: () => void;
}

const HelpGuide: React.FC<HelpGuideProps> = ({ open, onClose }) => {
    const [activeSection, setActiveSection] = useState<string>('overview');
    const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
    const [showConfetti, setShowConfetti] = useState(false);

    const sections = [
        { id: 'overview', title: 'Getting Started', icon: BookOpen, color: 'emerald' },
        { id: 'terminology', title: 'Key Concepts', icon: Brain, color: 'purple' },
        { id: 'features', title: 'Features Guide', icon: Zap, color: 'blue' },
        { id: 'trading', title: 'Trading Tips', icon: Target, color: 'amber' },
    ];

    const markSectionComplete = (sectionId: string) => {
        setCompletedSections(prev => new Set([...prev, sectionId]));
        if (completedSections.size + 1 === sections.length) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
        }
    };

    const progress = (completedSections.size / sections.length) * 100;

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return <OverviewSection onComplete={() => markSectionComplete('overview')} />;
            case 'terminology':
                return <TerminologySection onComplete={() => markSectionComplete('terminology')} />;
            case 'features':
                return <FeaturesSection onComplete={() => markSectionComplete('features')} />;
            case 'trading':
                return <TradingSection onComplete={() => markSectionComplete('trading')} />;
            default:
                return <OverviewSection onComplete={() => markSectionComplete('overview')} />;
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden shadow-2xl relative"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Confetti Effect */}
                        {showConfetti && <ConfettiEffect />}

                        {/* Sidebar */}
                        <div className="w-72 bg-zinc-950/50 border-r border-zinc-800 p-6 flex flex-col">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <BookOpen className="text-emerald-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="font-bold text-white text-lg">Help & Guide</h2>
                                    <p className="text-xs text-zinc-500">Interactive Tutorial</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs text-zinc-400">Your Progress</span>
                                    <span className="text-xs font-bold text-emerald-400">{Math.round(progress)}%</span>
                                </div>
                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}% ` }}
                                        transition={{ duration: 0.5, ease: 'easeOut' }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2">
                                {sections.map((section, idx) => {
                                    const Icon = section.icon;
                                    const isCompleted = completedSections.has(section.id);
                                    const isActive = activeSection === section.id;

                                    return (
                                        <motion.button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left relative overflow-hidden",
                                                isActive
                                                    ? "bg-emerald-500/10 border border-emerald-500/30 text-white shadow-lg shadow-emerald-500/10"
                                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50 border border-transparent"
                                            )}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            {/* Animated Background */}
                                            {isActive && (
                                                <motion.div
                                                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-blue-500/5"
                                                    layoutId="activeSection"
                                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                                />
                                            )}

                                            <div className="relative z-10 flex items-center gap-3 flex-1">
                                                <Icon size={18} />
                                                <div className="flex-1">
                                                    <span className="font-medium text-sm block">{section.title}</span>
                                                    <span className="text-xs text-zinc-500">Step {idx + 1} of {sections.length}</span>
                                                </div>
                                                {isCompleted ? (
                                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                                ) : (
                                                    <Circle size={16} className="text-zinc-600" />
                                                )}
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-zinc-800 space-y-2">
                                {progress === 100 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2"
                                    >
                                        <Award className="text-emerald-400" size={20} />
                                        <div>
                                            <p className="text-xs font-bold text-white">Tutorial Complete!</p>
                                            <p className="text-xs text-zinc-400">You're ready to trade</p>
                                        </div>
                                    </motion.div>
                                )}
                                <p className="text-xs text-zinc-500 text-center">
                                    Kalshi Predictor Pro v2.0
                                </p>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col bg-zinc-900">
                            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-bold text-white">
                                        {sections.find(s => s.id === activeSection)?.title}
                                    </h3>
                                    {completedSections.has(activeSection) && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-1 text-emerald-400 text-sm"
                                        >
                                            <CheckCircle2 size={16} />
                                            <span>Completed</span>
                                        </motion.div>
                                    )}
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={activeSection}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        {renderContent()}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Confetti Effect Component
const ConfettiEffect: React.FC = () => {
    const confettiPieces = Array.from({ length: 50 });

    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
            {confettiPieces.map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                        left: `${Math.random() * 100}% `,
                        top: -20,
                        backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)],
                    }}
                    initial={{ y: -20, opacity: 1, rotate: 0 }}
                    animate={{
                        y: window.innerHeight,
                        opacity: 0,
                        rotate: Math.random() * 360,
                    }}
                    transition={{
                        duration: 2 + Math.random() * 2,
                        ease: 'easeIn',
                    }}
                />
            ))}
        </div>
    );
};

// Overview Section with Interactive Elements
const OverviewSection: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isAnimating, setIsAnimating] = useState(true);

    const steps = [
        { icon: Target, text: 'Select your league', color: 'emerald' },
        { icon: Filter, text: 'Filter games', color: 'blue' },
        { icon: TrendingUp, text: 'Find high divergence', color: 'purple' },
        { icon: BarChart3, text: 'Analyze details', color: 'amber' },
        { icon: Bell, text: 'Enable alerts', color: 'emerald' },
    ];

    useEffect(() => {
        if (isAnimating) {
            const interval = setInterval(() => {
                setCurrentStep((prev) => (prev + 1) % steps.length);
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isAnimating, steps.length]);

    useEffect(() => {
        const timer = setTimeout(() => onComplete(), 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="space-y-6 text-zinc-300">
            {/* Hero Section with Animation */}
            <motion.div
                className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-purple-500/10 border border-emerald-500/20 p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-4">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                        >
                            <Sparkles className="text-emerald-400" size={32} />
                        </motion.div>
                        <h4 className="text-2xl font-bold text-white">Welcome to Kalshi Predictor</h4>
                    </div>
                    <p className="text-lg leading-relaxed mb-6">
                        Your AI-powered edge in prediction markets. Combining advanced statistical models,
                        real-time market data, and smart analytics to identify value opportunities.
                    </p>

                    {/* Animated Quick Start Steps */}
                    <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10">
                        <div className="flex items-center gap-2 mb-4">
                            <Play className="text-emerald-400" size={20} />
                            <h5 className="font-bold text-white">Quick Start Guide</h5>
                            <button
                                onClick={() => setIsAnimating(!isAnimating)}
                                className="ml-auto p-1 hover:bg-white/10 rounded transition-colors"
                            >
                                {isAnimating ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                        </div>

                        <div className="space-y-3">
                            {steps.map((step, idx) => {
                                const Icon = step.icon;
                                const isActive = idx === currentStep;

                                return (
                                    <motion.div
                                        key={idx}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg transition-all",
                                            isActive ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-white/5"
                                        )}
                                        animate={{
                                            scale: isActive ? 1.02 : 1,
                                            x: isActive ? 4 : 0,
                                        }}
                                    >
                                        <div className={cn(
                                            "p-2 rounded-lg",
                                            isActive ? "bg-emerald-500/20" : "bg-white/5"
                                        )}>
                                            <Icon size={18} className={isActive ? "text-emerald-400" : "text-zinc-500"} />
                                        </div>
                                        <span className={cn(
                                            "text-sm font-medium",
                                            isActive ? "text-white" : "text-zinc-400"
                                        )}>
                                            {idx + 1}. {step.text}
                                        </span>
                                        {isActive && (
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className="ml-auto"
                                            >
                                                <ArrowRight className="text-emerald-400" size={16} />
                                            </motion.div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Key Features Grid */}
            <div>
                <h5 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Zap className="text-emerald-400" size={20} />
                    Powerful Features
                </h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FeatureCard
                        icon={Brain}
                        title="Smart Predictions"
                        description="Advanced models using Elo ratings, recent form, and statistical analysis"
                        color="blue"
                        delay={0}
                    />
                    <FeatureCard
                        icon={Activity}
                        title="Edge Detection"
                        description="Automatically identify when model predictions diverge from market prices"
                        color="emerald"
                        delay={0.1}
                    />
                    <FeatureCard
                        icon={BarChart3}
                        title="Market Analytics"
                        description="Visualize market dynamics with heatmaps and detailed game analytics"
                        color="purple"
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={Calculator}
                        title="Risk Management"
                        description="Kelly Criterion calculator and Strategy Lab for backtesting"
                        color="amber"
                        delay={0.3}
                    />
                </div>
            </div>

            {/* Important Note */}
            <motion.div
                className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex items-start gap-3">
                    <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                        <h5 className="font-bold text-amber-400 mb-2">Important Disclaimer</h5>
                        <p className="text-sm text-zinc-300">
                            This tool provides predictions and analysis, but all trading decisions are your own responsibility.
                            Past performance does not guarantee future results. Always use proper risk management.
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Feature Card Component
const FeatureCard: React.FC<{
    icon: React.ElementType;
    title: string;
    description: string;
    color: string;
    delay: number;
}> = ({ icon: Icon, title, description, color, delay }) => {
    const [isHovered, setIsHovered] = useState(false);

    const colorClasses = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
        purple: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
        amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    };

    return (
        <motion.div
            className={cn(
                "bg-zinc-800/50 rounded-lg p-5 border border-zinc-700 hover:border-zinc-600 transition-all cursor-pointer",
                isHovered && "shadow-lg"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ scale: 1.02 }}
        >
            <motion.div
                animate={{ rotate: isHovered ? 360 : 0 }}
                transition={{ duration: 0.5 }}
            >
                <Icon className={colorClasses[color as keyof typeof colorClasses].split(' ')[0]} size={24} />
            </motion.div>
            <h6 className="font-semibold text-white mt-3 mb-1">{title}</h6>
            <p className="text-sm text-zinc-400">{description}</p>
        </motion.div>
    );
};

// Animated Visual Components for Each Concept
const DivergenceAnimation: React.FC = () => {
    return (
        <svg width="200" height="120" viewBox="0 0 200 120" className="w-full h-auto">
            {/* Model Line (Blue) */}
            <motion.path
                d="M 20 60 Q 60 60, 100 30"
                stroke="#3b82f6"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            <motion.circle
                cx="100"
                cy="30"
                r="5"
                fill="#3b82f6"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                transition={{ duration: 0.5, delay: 2, repeat: Infinity, repeatDelay: 2.5 }}
            />
            <text x="105" y="25" fill="#3b82f6" fontSize="12" fontWeight="bold">65%</text>

            {/* Market Line (Green) */}
            <motion.path
                d="M 20 60 Q 60 60, 100 80"
                stroke="#10b981"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
            />
            <motion.circle
                cx="100"
                cy="80"
                r="5"
                fill="#10b981"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 1] }}
                transition={{ duration: 0.5, delay: 2, repeat: Infinity, repeatDelay: 2.5 }}
            />
            <text x="105" y="85" fill="#10b981" fontSize="12" fontWeight="bold">50%</text>

            {/* Divergence Arrow */}
            <motion.line
                x1="100"
                y1="35"
                x2="100"
                y2="75"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
            />
            <motion.text
                x="110"
                y="58"
                fill="#f59e0b"
                fontSize="14"
                fontWeight="bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.2, duration: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
            >
                15% Edge
            </motion.text>

            {/* Labels */}
            <text x="10" y="15" fill="#9ca3af" fontSize="10">Model</text>
            <text x="10" y="110" fill="#9ca3af" fontSize="10">Market</text>
        </svg>
    );
};

const ConfidenceAnimation: React.FC = () => {
    return (
        <svg width="200" height="120" viewBox="0 0 200 120" className="w-full h-auto">
            {/* High Confidence Bar */}
            <motion.rect
                x="20"
                y="20"
                width="40"
                height="0"
                fill="#10b981"
                rx="4"
                initial={{ height: 0, y: 100 }}
                animate={{ height: 80, y: 20 }}
                transition={{ duration: 1, delay: 0.2, repeat: Infinity, repeatDelay: 2 }}
            />
            <text x="25" y="110" fill="#10b981" fontSize="10" fontWeight="bold">HIGH</text>

            {/* Medium Confidence Bar */}
            <motion.rect
                x="80"
                y="50"
                width="40"
                height="0"
                fill="#f59e0b"
                rx="4"
                initial={{ height: 0, y: 100 }}
                animate={{ height: 50, y: 50 }}
                transition={{ duration: 1, delay: 0.4, repeat: Infinity, repeatDelay: 2 }}
            />
            <text x="82" y="110" fill="#f59e0b" fontSize="10" fontWeight="bold">MED</text>

            {/* Low Confidence Bar */}
            <motion.rect
                x="140"
                y="80"
                width="40"
                height="0"
                fill="#6b7280"
                rx="4"
                initial={{ height: 0, y: 100 }}
                animate={{ height: 20, y: 80 }}
                transition={{ duration: 1, delay: 0.6, repeat: Infinity, repeatDelay: 2 }}
            />
            <text x="145" y="110" fill="#6b7280" fontSize="10" fontWeight="bold">LOW</text>

            {/* Animated Glow Effects */}
            <motion.circle
                cx="40"
                cy="60"
                r="30"
                fill="#10b981"
                opacity="0.1"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.5, 0] }}
                transition={{ duration: 2, delay: 1.2, repeat: Infinity, repeatDelay: 2 }}
            />
        </svg>
    );
};

const ModelProbabilityAnimation: React.FC = () => {
    return (
        <svg width="200" height="120" viewBox="0 0 200 120" className="w-full h-auto">
            {/* Brain/Model Center */}
            <circle cx="100" cy="60" r="25" fill="#8b5cf6" opacity="0.2" />
            <motion.circle
                cx="100"
                cy="60"
                r="20"
                fill="#8b5cf6"
                opacity="0.4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Input Data Streams */}
            {[0, 1, 2, 3].map((i) => {
                const angle = (i * Math.PI * 2) / 4;
                const startX = 100 + Math.cos(angle) * 60;
                const startY = 60 + Math.sin(angle) * 60;
                const endX = 100 + Math.cos(angle) * 25;
                const endY = 60 + Math.sin(angle) * 25;

                return (
                    <g key={i}>
                        <motion.line
                            x1={startX}
                            y1={startY}
                            x2={endX}
                            y2={endY}
                            stroke="#3b82f6"
                            strokeWidth="2"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{
                                duration: 1.5,
                                delay: i * 0.3,
                                repeat: Infinity,
                                repeatDelay: 1,
                            }}
                        />
                        <motion.circle
                            cx={startX}
                            cy={startY}
                            r="4"
                            fill="#3b82f6"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{
                                duration: 2,
                                delay: i * 0.3,
                                repeat: Infinity,
                            }}
                        />
                    </g>
                );
            })}

            {/* Output Probability */}
            <motion.text
                x="100"
                y="65"
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="bold"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
            >
                65%
            </motion.text>

            {/* Labels */}
            <text x="40" y="15" fill="#9ca3af" fontSize="9">Elo</text>
            <text x="150" y="15" fill="#9ca3af" fontSize="9">Form</text>
            <text x="40" y="115" fill="#9ca3af" fontSize="9">Stats</text>
            <text x="145" y="115" fill="#9ca3af" fontSize="9">Market</text>
        </svg>
    );
};

const MarketPriceAnimation: React.FC = () => {
    return (
        <svg width="200" height="120" viewBox="0 0 200 120" className="w-full h-auto">
            {/* Price Ticker */}
            <rect x="40" y="30" width="120" height="60" rx="8" fill="#18181b" stroke="#10b981" strokeWidth="2" />

            {/* Animated Price */}
            <motion.text
                x="100"
                y="65"
                textAnchor="middle"
                fill="#10b981"
                fontSize="24"
                fontWeight="bold"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                50¢
            </motion.text>

            {/* Coins Falling */}
            {[0, 1, 2].map((i) => (
                <motion.circle
                    key={i}
                    cx={70 + i * 30}
                    cy="0"
                    r="6"
                    fill="#10b981"
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: 120, opacity: 0 }}
                    transition={{
                        duration: 2,
                        delay: i * 0.5,
                        repeat: Infinity,
                        repeatDelay: 1,
                    }}
                />
            ))}

            {/* Label */}
            <text x="100" y="105" textAnchor="middle" fill="#9ca3af" fontSize="10">
                = 50% Probability
            </text>
        </svg>
    );
};

const KellyAnimation: React.FC = () => {
    return (
        <svg width="200" height="120" viewBox="0 0 200 120" className="w-full h-auto">
            {/* Bankroll Bar */}
            <rect x="20" y="50" width="160" height="20" rx="4" fill="#27272a" />

            {/* Kelly Recommended Portion */}
            <motion.rect
                x="20"
                y="50"
                width="0"
                height="20"
                rx="4"
                fill="#f59e0b"
                initial={{ width: 0 }}
                animate={{ width: 64 }}
                transition={{ duration: 1.5, delay: 0.5, repeat: Infinity, repeatDelay: 2 }}
            />

            {/* Percentage Label */}
            <motion.text
                x="52"
                y="64"
                textAnchor="middle"
                fill="white"
                fontSize="12"
                fontWeight="bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2, duration: 0.5, repeat: Infinity, repeatDelay: 2.5 }}
            >
                40%
            </motion.text>

            {/* Labels */}
            <text x="20" y="45" fill="#9ca3af" fontSize="10">Your Bankroll</text>
            <text x="20" y="85" fill="#f59e0b" fontSize="10" fontWeight="bold">
                Kelly Recommendation
            </text>

            {/* Formula */}
            <motion.text
                x="100"
                y="105"
                textAnchor="middle"
                fill="#6b7280"
                fontSize="9"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
            >
                f* = (bp - q) / b
            </motion.text>
        </svg>
    );
};

// Terminology Section with Interactive Cards and Animations
const TerminologySection: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [expandedTerm, setExpandedTerm] = useState<string | null>('divergence');

    useEffect(() => {
        const timer = setTimeout(() => onComplete(), 5000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const terms = [
        {
            id: 'divergence',
            term: 'Divergence (Edge)',
            icon: TrendingUp,
            color: 'emerald',
            shortDesc: 'The difference between model prediction and market price',
            details: [
                'Expressed as a percentage (e.g., 15% edge)',
                'Positive divergence suggests market mispricing',
                'Higher divergence = greater potential value',
                'Look for divergence > 10-15% for meaningful edges',
            ],
            animation: DivergenceAnimation,
        },
        {
            id: 'confidence',
            term: 'Confidence Score',
            icon: Activity,
            color: 'blue',
            shortDesc: 'Reliability measure of the model\'s prediction',
            details: [
                'HIGH: Strong statistical support, reliable data',
                'MEDIUM: Moderate confidence with some uncertainty',
                'LOW: Limited data or high uncertainty',
                'Filter by confidence for higher-quality signals',
            ],
            animation: ConfidenceAnimation,
        },
        {
            id: 'model-prob',
            term: 'Model Probability',
            icon: Brain,
            color: 'purple',
            shortDesc: 'AI estimate of true win probability',
            details: [
                'Based on Elo, recent form, and statistics',
                'Combines multiple factors with weighted importance',
                'Elo (15%), Form (10%), Stats (30%), Market (40%)',
                'Shown in blue on game cards',
            ],
            animation: ModelProbabilityAnimation,
        },
        {
            id: 'market-price',
            term: 'Market Price',
            icon: DollarSign,
            color: 'emerald',
            shortDesc: 'Current Kalshi price (implied probability)',
            details: [
                'YES contracts pay $1 if correct',
                '50¢ price = 50% implied probability',
                'This is what you pay to enter a position',
                'Shown in green on game cards',
            ],
            animation: MarketPriceAnimation,
        },
        {
            id: 'kelly',
            term: 'Kelly Criterion',
            icon: Calculator,
            color: 'amber',
            shortDesc: 'Optimal bet sizing formula',
            details: [
                'Maximizes long-term growth mathematically',
                'Full Kelly can be volatile in practice',
                'Half Kelly recommended for practical use',
                'Available in Risk Calculator tool',
            ],
            animation: KellyAnimation,
        },
    ];

    return (
        <div className="space-y-4">
            <motion.div
                className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-xl p-6 mb-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3 mb-3">
                    <Lightbulb className="text-purple-400" size={24} />
                    <h4 className="text-xl font-bold text-white">Master the Terminology</h4>
                </div>
                <p className="text-zinc-300">
                    Click on each concept to see an animated explanation. Understanding these terms is key to making informed trading decisions.
                </p>
            </motion.div>

            <div className="space-y-3">
                {terms.map((item, idx) => {
                    const Icon = item.icon;
                    const AnimationComponent = item.animation;
                    const isExpanded = expandedTerm === item.id;

                    return (
                        <motion.div
                            key={item.id}
                            className={cn(
                                "bg-zinc-800/50 rounded-lg border transition-all cursor-pointer overflow-hidden",
                                isExpanded ? "border-emerald-500/30 shadow-lg shadow-emerald-500/10" : "border-zinc-700 hover:border-zinc-600"
                            )}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => setExpandedTerm(isExpanded ? null : item.id)}
                        >
                            <div className="p-4 flex items-center gap-4">
                                <div className={cn(
                                    "p-3 rounded-lg flex-shrink-0",
                                    isExpanded ? "bg-emerald-500/20" : "bg-zinc-700/50"
                                )}>
                                    <Icon size={24} className={isExpanded ? "text-emerald-400" : "text-zinc-400"} />
                                </div>

                                <div className="flex-1">
                                    <h5 className="font-bold text-white text-lg">
                                        {item.term}
                                    </h5>
                                    <p className="text-sm text-zinc-400">{item.shortDesc}</p>
                                </div>

                                <motion.div
                                    animate={{ rotate: isExpanded ? 180 : 0 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <ChevronDown className="text-zinc-500" size={20} />
                                </motion.div>
                            </div>

                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                        className="border-t border-zinc-700"
                                    >
                                        <div className="p-6 bg-zinc-900/50">
                                            {/* Animated Visual */}
                                            <div className="mb-6 bg-black/30 rounded-xl p-6 flex items-center justify-center border border-zinc-700">
                                                <AnimationComponent />
                                            </div>

                                            {/* Details */}
                                            <ul className="space-y-2">
                                                {item.details.map((detail, detailIdx) => (
                                                    <motion.li
                                                        key={detailIdx}
                                                        className="flex items-start gap-3 text-sm text-zinc-300"
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: detailIdx * 0.1 }}
                                                    >
                                                        <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                                                        <span>{detail}</span>
                                                    </motion.li>
                                                ))}
                                            </ul>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </div>

            <motion.div
                className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <Info className="text-blue-400 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-zinc-300">
                    <strong className="text-white">Pro Tip:</strong> Focus on games with high divergence AND high confidence
                    for the best risk-reward opportunities.
                </p>
            </motion.div>
        </div>
    );
};

// Features Section with Interactive Demos
const FeaturesSection: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [activeFeature, setActiveFeature] = useState(0);

    useEffect(() => {
        const timer = setTimeout(() => onComplete(), 5000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    const features = [
        {
            title: 'Dashboard Navigation',
            icon: Settings,
            color: 'blue',
            steps: [
                'Use league tabs (NBA/NFL) to switch sports',
                'Filter by confidence level',
                'Sort games by Time, Divergence, or Confidence',
                'Enable auto-refresh for live updates',
            ],
        },
        {
            title: 'Game Cards',
            icon: Target,
            color: 'emerald',
            steps: [
                'View matchup with predictions',
                'Check Model Probability (blue)',
                'Compare Market Price (green)',
                'Look for EDGE badge (high divergence)',
                'Click card for detailed analytics',
            ],
        },
        {
            title: 'Edge Alerts',
            icon: Bell,
            color: 'amber',
            steps: [
                'Open Trading Toolbox',
                'Toggle alerts ON/OFF',
                'Set custom edge threshold (5-30%)',
                'Get real-time notifications',
                'Never miss an opportunity',
            ],
        },
        {
            title: 'Risk Calculator',
            icon: Calculator,
            color: 'purple',
            steps: [
                'Enter your bankroll',
                'Input win probability',
                'Add current market price',
                'View Kelly Criterion recommendation',
                'See position size in dollars',
            ],
        },
    ];

    return (
        <div className="space-y-6">
            <motion.div
                className="bg-gradient-to-r from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-xl p-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3 mb-3">
                    <Zap className="text-blue-400" size={24} />
                    <h4 className="text-xl font-bold text-white">Feature Walkthrough</h4>
                </div>
                <p className="text-zinc-300">
                    Explore each feature to unlock the full potential of Kalshi Predictor.
                </p>
            </motion.div>

            {/* Feature Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {features.map((feature, idx) => {
                    const Icon = feature.icon;
                    return (
                        <motion.button
                            key={idx}
                            onClick={() => setActiveFeature(idx)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all flex-shrink-0",
                                activeFeature === idx
                                    ? "bg-emerald-500/20 border border-emerald-500/30 text-white"
                                    : "bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white"
                            )}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <Icon size={16} />
                            <span className="text-sm font-medium">{feature.title}</span>
                        </motion.button>
                    );
                })}
            </div>

            {/* Feature Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeFeature}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700"
                >
                    <div className="flex items-center gap-3 mb-6">
                        {React.createElement(features[activeFeature].icon, {
                            size: 28,
                            className: 'text-emerald-400',
                        })}
                        <h5 className="text-xl font-bold text-white">{features[activeFeature].title}</h5>
                    </div>

                    <div className="space-y-3">
                        {features[activeFeature].steps.map((step, idx) => (
                            <motion.div
                                key={idx}
                                className="flex items-start gap-3 p-3 bg-zinc-900/50 rounded-lg"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-bold flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <p className="text-zinc-300 text-sm pt-0.5">{step}</p>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
                <button
                    onClick={() => setActiveFeature(Math.max(0, activeFeature - 1))}
                    disabled={activeFeature === 0}
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                >
                    Previous
                </button>
                <button
                    onClick={() => setActiveFeature(Math.min(features.length - 1, activeFeature + 1))}
                    disabled={activeFeature === features.length - 1}
                    className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors font-medium"
                >
                    Next
                </button>
            </div>
        </div>
    );
};

// Trading Section with Best Practices
const TradingSection: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => onComplete(), 5000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="space-y-6">
            <motion.div
                className="bg-gradient-to-r from-amber-500/10 to-emerald-500/10 border border-amber-500/20 rounded-xl p-6"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3 mb-3">
                    <Target className="text-amber-400" size={24} />
                    <h4 className="text-xl font-bold text-white">Trading Mastery</h4>
                </div>
                <p className="text-zinc-300">
                    Learn proven strategies and best practices to maximize your edge in prediction markets.
                </p>
            </motion.div>

            {/* Value Opportunities */}
            <TradingTipCard
                title="Finding Value Opportunities"
                icon={TrendingUp}
                color="emerald"
                tips={[
                    { text: 'Look for high divergence (15%+)', icon: '✓' },
                    { text: 'Prioritize HIGH confidence signals', icon: '✓' },
                    { text: 'Check volume for better liquidity', icon: '✓' },
                    { text: 'Review Game Analytics context', icon: '✓' },
                ]}
                delay={0}
            />

            {/* Risk Management */}
            <TradingTipCard
                title="Risk Management"
                icon={Gauge}
                color="blue"
                tips={[
                    { text: 'Use Kelly Criterion for position sizing', icon: '•' },
                    { text: 'Never risk more than you can afford', icon: '•' },
                    { text: 'Diversify across multiple markets', icon: '•' },
                    { text: 'Start small and scale gradually', icon: '•' },
                ]}
                delay={0.1}
            />

            {/* Interpreting Signals */}
            <TradingTipCard
                title="Interpreting Signals"
                icon={Brain}
                color="purple"
                tips={[
                    { text: 'Follow Market: Model agrees with consensus', icon: '→' },
                    { text: 'Fade Market: Model sees mispricing', icon: '→' },
                    { text: 'Model > Market: Consider buying YES', icon: '→' },
                    { text: 'Model < Market: Consider buying NO', icon: '→' },
                ]}
                delay={0.2}
            />

            {/* Common Pitfalls */}
            <motion.div
                className="bg-red-500/10 border border-red-500/30 rounded-xl p-5"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
            >
                <div className="flex items-center gap-3 mb-4">
                    <AlertTriangle className="text-red-400" size={24} />
                    <h5 className="font-bold text-red-400 text-lg">Common Pitfalls to Avoid</h5>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                        'Ignoring confidence scores',
                        'Oversizing positions',
                        'Chasing small edges',
                        'Ignoring context (injuries/weather)',
                        'Over-relying on model alone',
                        'Emotional decision making',
                    ].map((pitfall, idx) => (
                        <motion.div
                            key={idx}
                            className="flex items-center gap-2 text-sm text-zinc-300"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + idx * 0.05 }}
                        >
                            <span className="text-red-400">✗</span>
                            <span>{pitfall}</span>
                        </motion.div>
                    ))}
                </div>
            </motion.div>

            {/* Final Reminder */}
            <motion.div
                className="bg-zinc-800/50 rounded-xl p-5 border border-zinc-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <div className="flex items-start gap-3">
                    <Award className="text-emerald-400 flex-shrink-0 mt-1" size={24} />
                    <div>
                        <h5 className="font-bold text-white mb-2">Remember</h5>
                        <p className="text-sm text-zinc-400">
                            Prediction markets are complex and outcomes are uncertain. This tool provides statistical analysis,
                            but successful trading requires discipline, risk management, and continuous learning. Start small,
                            learn from each trade, and gradually refine your approach. Good luck! 🚀
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Trading Tip Card Component
const TradingTipCard: React.FC<{
    title: string;
    icon: React.ElementType;
    color: string;
    tips: Array<{ text: string; icon: string }>;
    delay: number;
}> = ({ title, icon: Icon, color, tips, delay }) => {
    const colorClasses = {
        emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        amber: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    };

    return (
        <motion.div
            className={cn("rounded-xl p-5 border", colorClasses[color as keyof typeof colorClasses])}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
        >
            <div className="flex items-center gap-3 mb-4">
                <Icon size={24} />
                <h5 className="font-bold text-white text-lg">{title}</h5>
            </div>
            <div className="space-y-2">
                {tips.map((tip, idx) => (
                    <motion.div
                        key={idx}
                        className="flex items-start gap-3 text-sm text-zinc-300"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: delay + idx * 0.1 }}
                    >
                        <span className={colorClasses[color as keyof typeof colorClasses].split(' ')[2]}>{tip.icon}</span>
                        <span>{tip.text}</span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};

export default HelpGuide;

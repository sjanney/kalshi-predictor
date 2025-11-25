import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, ChevronRight, Zap, TrendingUp, TrendingDown, BarChart3, 
    DollarSign, Target, Activity, Brain, Gauge, AlertTriangle, Bell, 
    Calculator, TrendingUp as TrendingUpIcon, Filter, RefreshCw, Settings } from 'lucide-react';
import { cn } from './ui/shared';

interface HelpGuideProps {
    open: boolean;
    onClose: () => void;
}

const HelpGuide: React.FC<HelpGuideProps> = ({ open, onClose }) => {
    const [activeSection, setActiveSection] = useState<string>('overview');

    const sections = [
        { id: 'overview', title: 'Getting Started', icon: BookOpen },
        { id: 'terminology', title: 'Terminology', icon: Brain },
        { id: 'features', title: 'Features Guide', icon: Zap },
        { id: 'trading', title: 'Trading Tips', icon: Target },
    ];

    const renderContent = () => {
        switch (activeSection) {
            case 'overview':
                return <OverviewSection />;
            case 'terminology':
                return <TerminologySection />;
            case 'features':
                return <FeaturesSection />;
            case 'trading':
                return <TradingSection />;
            default:
                return <OverviewSection />;
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
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl h-[85vh] flex overflow-hidden shadow-2xl"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sidebar */}
                        <div className="w-64 bg-zinc-950/50 border-r border-zinc-800 p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-6">
                                <BookOpen className="text-emerald-400" size={24} />
                                <h2 className="font-bold text-white text-lg">Help & Guide</h2>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-1">
                                {sections.map((section) => {
                                    const Icon = section.icon;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left",
                                                activeSection === section.id
                                                    ? "bg-emerald-500/10 border border-emerald-500/30 text-white"
                                                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                                            )}
                                        >
                                            <Icon size={18} />
                                            <span className="font-medium text-sm">{section.title}</span>
                                            {activeSection === section.id && (
                                                <ChevronRight size={16} className="ml-auto" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-zinc-800">
                                <p className="text-xs text-zinc-500 text-center">
                                    Kalshi Predictor Pro v2.0
                                </p>
                            </div>
                        </div>

                        {/* Main Content */}
                        <div className="flex-1 flex flex-col bg-zinc-900">
                            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                                <h3 className="text-xl font-bold text-white">
                                    {sections.find(s => s.id === activeSection)?.title}
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6">
                                {renderContent()}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const OverviewSection: React.FC = () => (
    <div className="space-y-6 text-zinc-300">
        <div>
            <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="text-emerald-400" size={20} />
                Welcome to Kalshi Predictor
            </h4>
            <p className="leading-relaxed">
                Kalshi Predictor is a powerful tool designed to help you identify value opportunities in Kalshi prediction markets. 
                It combines advanced statistical models, real-time market data, and smart analytics to give you an edge in NBA and NFL markets.
            </p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <h5 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
                <Target size={16} />
                Quick Start
            </h5>
            <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Select your league (NBA or NFL) using the tabs at the top</li>
                <li>Browse games using the filter and sort options</li>
                <li>Look for games with high <strong className="text-white">divergence</strong> (marked with an "EDGE" badge)</li>
                <li>Click on a game card to see detailed analytics</li>
                <li>Enable <strong className="text-white">Edge Alerts</strong> in the Toolbox to get notified of opportunities</li>
            </ol>
        </div>

        <div>
            <h5 className="font-bold text-white mb-3">Key Features</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <TrendingUp className="text-blue-400 mb-2" size={20} />
                    <h6 className="font-semibold text-white mb-1">Smart Predictions</h6>
                    <p className="text-sm text-zinc-400">Advanced models using Elo ratings, recent form, and statistical analysis</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <Activity className="text-emerald-400 mb-2" size={20} />
                    <h6 className="font-semibold text-white mb-1">Edge Detection</h6>
                    <p className="text-sm text-zinc-400">Automatically identify when model predictions diverge from market prices</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <BarChart3 className="text-purple-400 mb-2" size={20} />
                    <h6 className="font-semibold text-white mb-1">Market Analytics</h6>
                    <p className="text-sm text-zinc-400">Visualize market dynamics with heatmaps and detailed game analytics</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                    <Calculator className="text-amber-400 mb-2" size={20} />
                    <h6 className="font-semibold text-white mb-1">Risk Management</h6>
                    <p className="text-sm text-zinc-400">Kelly Criterion calculator and Strategy Lab for backtesting</p>
                </div>
            </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <h5 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
                <AlertTriangle size={16} />
                Important Note
            </h5>
            <p className="text-sm">
                This tool provides predictions and analysis, but all trading decisions are your own responsibility. 
                Past performance does not guarantee future results. Always use proper risk management.
            </p>
        </div>
    </div>
);

const TerminologySection: React.FC = () => (
    <div className="space-y-6 text-zinc-300">
        <div>
            <h4 className="text-xl font-bold text-white mb-4">Core Terminology</h4>
            
            <div className="space-y-4">
                <TermCard
                    term="Divergence (Edge)"
                    icon={<TrendingUp className="text-emerald-400" size={20} />}
                    description="The difference between the model's predicted probability and the Kalshi market price."
                    details={[
                        "Expressed as a percentage (e.g., 15% edge means model predicts 65% but market is at 50%)",
                        "Positive divergence suggests the market may be mispriced",
                        "Higher divergence = greater potential value opportunity",
                        "Look for divergence > 10-15% for meaningful edges"
                    ]}
                    color="emerald"
                />

                <TermCard
                    term="Confidence Score"
                    icon={<Activity className="text-blue-400" size={20} />}
                    description="A measure of how reliable the model's prediction is for a given game."
                    details={[
                        "HIGH: Strong statistical support, reliable data available",
                        "MEDIUM: Moderate confidence with some uncertainty",
                        "LOW: Limited data or high uncertainty in prediction",
                        "Filter by confidence to focus on higher-quality signals"
                    ]}
                    color="blue"
                />

                <TermCard
                    term="Model Probability"
                    icon={<Brain className="text-purple-400" size={20} />}
                    description="The prediction engine's estimate of the true win probability for a team."
                    details={[
                        "Based on Elo ratings, recent form, head-to-head history, and statistical models",
                        "Represents what the model thinks the actual probability is",
                        "Combines multiple factors: Elo (15%), Form (10%), Stats (30%), Market calibration (40%)",
                        "Shown in blue on game cards"
                    ]}
                    color="purple"
                />

                <TermCard
                    term="Market Price / Kalshi Probability"
                    icon={<DollarSign className="text-emerald-400" size={20} />}
                    description="The current price on Kalshi markets, representing the market's implied probability."
                    details={[
                        "Kalshi YES contracts pay $1 if correct, cost the current price",
                        "A 50¢ price means market thinks 50% probability",
                        "This is what you pay to enter a YES position",
                        "Shown in green on game cards"
                    ]}
                    color="emerald"
                />

                <TermCard
                    term="Final Win Probability"
                    icon={<Target className="text-primary" size={20} />}
                    description="The blended probability combining model predictions with market data."
                    details={[
                        "Weighted combination of model and market probabilities",
                        "Takes into account both statistical analysis and market efficiency",
                        "Used to generate trading recommendations",
                        "Shown prominently on game cards in emerald"
                    ]}
                    color="primary"
                />

                <TermCard
                    term="Recommendation Signal"
                    icon={<TrendingUp className="text-amber-400" size={20} />}
                    description="Trading recommendation based on divergence analysis."
                    details={[
                        "Follow Market: Model agrees with market, consider following",
                        "Fade Market: Model disagrees significantly, consider fading",
                        "Neutral: No strong signal either way",
                        "Based on divergence threshold (typically 10-15%)"
                    ]}
                    color="amber"
                />

                <TermCard
                    term="Volume"
                    icon={<BarChart3 className="text-blue-400" size={20} />}
                    description="Total dollar volume traded in the market."
                    details={[
                        "Higher volume = more liquidity and market confidence",
                        "Low volume markets may have wider spreads",
                        "Volume spikes can indicate new information or market movement",
                        "Shown on game cards and in Market Heatmap"
                    ]}
                    color="blue"
                />

                <TermCard
                    term="Elo Rating"
                    icon={<Gauge className="text-purple-400" size={20} />}
                    description="Dynamic team strength rating that updates after each game."
                    details={[
                        "Starts at 1500 for all teams",
                        "Increases with wins, decreases with losses",
                        "Accounts for strength of opponent and game importance",
                        "Home advantage adds ~65 Elo points",
                        "Recent games weighted more heavily (decay factor: 0.95)"
                    ]}
                    color="purple"
                />

                <TermCard
                    term="Kelly Criterion"
                    icon={<Calculator className="text-amber-400" size={20} />}
                    description="Mathematical formula for optimal bet sizing based on edge and bankroll."
                    details={[
                        "Kelly Fraction = (Edge × Win Probability - Loss Probability) / Odds",
                        "Full Kelly maximizes long-term growth but can be volatile",
                        "Half Kelly (50% of full Kelly) is often recommended for practical use",
                        "Assumes infinite repetitions - use with caution in practice",
                        "Available in the Risk Calculator tool"
                    ]}
                    color="amber"
                />

                <TermCard
                    term="Market Heatmap"
                    icon={<BarChart3 className="text-blue-400" size={20} />}
                    description="Visual scatter plot showing volume vs. edge across all markets."
                    details={[
                        "X-axis: Market volume (in dollars)",
                        "Y-axis: Model edge (divergence percentage)",
                        "Color: Confidence level (Green=High, Orange=Medium, Gray=Low)",
                        "Bubble size: Kalshi price",
                        "Helps identify high-value, high-liquidity opportunities"
                    ]}
                    color="blue"
                />

                <TermCard
                    term="Strategy Lab"
                    icon={<Brain className="text-purple-400" size={20} />}
                    description="Backtesting tool to simulate trading strategies on current markets."
                    details={[
                        "Define strategy rules (min divergence, confidence level, bet size)",
                        "Run simulations on active markets",
                        "See projected EV (Expected Value) and ROI",
                        "Test different parameters before risking real capital",
                        "Save and compare multiple strategies"
                    ]}
                    color="purple"
                />

                <TermCard
                    term="Edge Alerts"
                    icon={<Bell className="text-emerald-400" size={20} />}
                    description="Real-time notifications when games exceed your divergence threshold."
                    details={[
                        "Set a custom edge threshold (default: 15%)",
                        "Get notified immediately when opportunities appear",
                        "Alerts show matchup, edge %, and confidence level",
                        "Only alerts once per game (until cleared)",
                        "Perfect for active monitoring without constant manual checking"
                    ]}
                    color="emerald"
                />
            </div>
        </div>
    </div>
);

const TermCard: React.FC<{
    term: string;
    icon: React.ReactNode;
    description: string;
    details: string[];
    color: string;
}> = ({ term, icon, description, details }) => (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors">
        <div className="flex items-start gap-3 mb-2">
            {icon}
            <div className="flex-1">
                <h5 className="font-bold text-white text-lg mb-1">{term}</h5>
                <p className="text-sm text-zinc-400 mb-3">{description}</p>
                <ul className="space-y-1.5">
                    {details.map((detail, idx) => (
                        <li key={idx} className="text-xs text-zinc-500 flex items-start gap-2">
                            <span className="text-emerald-400 mt-0.5">•</span>
                            <span>{detail}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
);

const FeaturesSection: React.FC = () => (
    <div className="space-y-6 text-zinc-300">
        <div>
            <h4 className="text-xl font-bold text-white mb-4">Features Guide</h4>
            
            <FeatureCard
                title="Dashboard Navigation"
                icon={<Settings className="text-blue-400" size={20} />}
                steps={[
                    "Use league tabs (NBA/NFL) at the top to switch between sports",
                    "Filter by confidence level: All, Medium+, or High Only",
                    "Sort games by: Time (game start), Divergence (edge %), or Confidence",
                    "Click refresh button to manually update games",
                    "Enable 'Live recheck' for automatic updates every 5 or 10 minutes"
                ]}
            />

            <FeatureCard
                title="Game Cards"
                icon={<Target className="text-emerald-400" size={20} />}
                steps={[
                    "Each card shows a matchup with predictions and market data",
                    "Model Probability: Statistical prediction (blue)",
                    "Market Price: Current Kalshi price (green)",
                    "Final Win Probability: Blended prediction (emerald)",
                    "Look for 'EDGE' badge (amber) indicating high divergence",
                    "INJ badge shows injury alerts when players are out",
                    "Click any card to open detailed Game Analytics Modal"
                ]}
            />

            <FeatureCard
                title="Game Analytics Modal"
                icon={<BarChart3 className="text-purple-400" size={20} />}
                steps={[
                    "Access by clicking any game card",
                    "Overview tab: Probability breakdown, market snapshot, key metrics",
                    "Insights tab: AI-generated insights and value opportunities",
                    "Context tab: Weather, injuries, and news affecting the game",
                    "Charts tab: Visual breakdowns of predictions and factors",
                    "Use this for deep analysis before placing trades"
                ]}
            />

            <FeatureCard
                title="Edge Alerts Setup"
                icon={<Bell className="text-amber-400" size={20} />}
                steps={[
                    "Click Settings icon (gear) in header to open Trading Toolbox",
                    "Find 'Edge Alerts' section",
                    "Toggle alerts ON/OFF",
                    "Adjust edge threshold slider (5-30%)",
                    "Alerts appear as notifications in bottom-right corner",
                    "Each alert shows: Edge %, Confidence, Matchup, Timestamp",
                    "Click 'Clear recent alerts' to reset notification history"
                ]}
            />

            <FeatureCard
                title="Market Heatmap"
                icon={<BarChart3 className="text-blue-400" size={20} />}
                steps={[
                    "Open Trading Toolbox (Settings icon)",
                    "Click 'View Map' in Market Heat Map section",
                    "Visualize all markets on a scatter plot",
                    "X-axis = Volume, Y-axis = Edge %",
                    "Colors indicate confidence (Green=High, Orange=Medium, Gray=Low)",
                    "Bubble size = Kalshi price",
                    "Hover over dots for detailed tooltip",
                    "Identify markets with high edge AND high volume"
                ]}
            />

            <FeatureCard
                title="Risk Calculator (Kelly Criterion)"
                icon={<Calculator className="text-amber-400" size={20} />}
                steps={[
                    "Open Trading Toolbox → Risk Calculator → 'Open Calculator'",
                    "Enter your total bankroll (in dollars)",
                    "Enter model win probability (from game card or analytics)",
                    "Enter current Kalshi price (in cents, e.g., 48 for 48¢)",
                    "Select confidence level",
                    "View Kelly Fraction (recommended % of bankroll)",
                    "See position size in dollars and number of contracts",
                    "Half Kelly shown as more conservative alternative",
                    "Remember: Kelly assumes infinite repetitions - use conservatively!"
                ]}
            />

            <FeatureCard
                title="Strategy Lab (Backtesting)"
                icon={<Brain className="text-purple-400" size={20} />}
                steps={[
                    "Open Trading Toolbox → Strategy Lab → 'Open Lab'",
                    "Create new strategy or load existing one",
                    "Set minimum divergence threshold (1-30%)",
                    "Choose required confidence level",
                    "Set bet size per trade",
                    "Click 'Run Simulation on Active Markets'",
                    "View results: Eligible trades, Projected EV, Est. ROI",
                    "Review matched opportunities table",
                    "Save strategies to compare different approaches",
                    "Use this to test strategies before risking real money"
                ]}
            />

            <FeatureCard
                title="Insights Panel"
                icon={<Activity className="text-emerald-400" size={20} />}
                steps={[
                    "Located at top of dashboard (when games are loaded)",
                    "Shows aggregate statistics across all visible games",
                    "Key metrics: Total games, High confidence count, Opportunities",
                    "Average divergence and total volume",
                    "Quick overview of current market landscape"
                ]}
            />
        </div>
    </div>
);

const FeatureCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    steps: string[];
}> = ({ title, icon, steps }) => (
    <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700 mb-4">
        <div className="flex items-center gap-3 mb-3">
            {icon}
            <h5 className="font-bold text-white text-lg">{title}</h5>
        </div>
        <ol className="space-y-2 ml-8">
            {steps.map((step, idx) => (
                <li key={idx} className="text-sm text-zinc-400 flex items-start gap-2">
                    <span className="font-semibold text-emerald-400 min-w-[20px]">{idx + 1}.</span>
                    <span>{step}</span>
                </li>
            ))}
        </ol>
    </div>
);

const TradingSection: React.FC = () => (
    <div className="space-y-6 text-zinc-300">
        <div>
            <h4 className="text-xl font-bold text-white mb-4">Trading Tips & Best Practices</h4>
            
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 mb-6">
                <h5 className="font-bold text-emerald-400 mb-3 flex items-center gap-2">
                    <Target size={18} />
                    Finding Value Opportunities
                </h5>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">✓</span>
                        <span><strong>Look for high divergence (15%+):</strong> This indicates the model sees significant mispricing</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">✓</span>
                        <span><strong>Prioritize HIGH confidence:</strong> More reliable signals reduce false positives</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">✓</span>
                        <span><strong>Check volume:</strong> Higher volume = better liquidity and tighter spreads</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-emerald-400 mt-1">✓</span>
                        <span><strong>Review Game Analytics:</strong> Check context tab for injuries, weather, news</span>
                    </li>
                </ul>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5 mb-6">
                <h5 className="font-bold text-blue-400 mb-3 flex items-center gap-2">
                    <Gauge size={18} />
                    Risk Management
                </h5>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span><strong>Use Kelly Criterion:</strong> Calculate optimal position sizing, but consider using Half Kelly for less volatility</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span><strong>Never risk more than you can afford to lose:</strong> Prediction markets are probabilistic - losses happen</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span><strong>Diversify:</strong> Don't put all your capital in one market or game</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-blue-400 mt-1">•</span>
                        <span><strong>Start small:</strong> Test your strategy with smaller positions first</span>
                    </li>
                </ul>
            </div>

            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5 mb-6">
                <h5 className="font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <Brain size={18} />
                    Interpreting Signals
                </h5>
                <div className="space-y-3 text-sm">
                    <div>
                        <strong className="text-white">"Follow Market" Signal:</strong>
                        <p className="text-zinc-400 mt-1">Model and market agree. Good for confirming consensus, but less edge opportunity.</p>
                    </div>
                    <div>
                        <strong className="text-white">"Fade Market" Signal:</strong>
                        <p className="text-zinc-400 mt-1">Model disagrees with market. This is where value opportunities often lie - model thinks market is wrong.</p>
                    </div>
                    <div>
                        <strong className="text-white">Divergence Direction:</strong>
                        <p className="text-zinc-400 mt-1">If model probability &gt; market price, consider buying YES. If model &lt; market, consider buying NO.</p>
                    </div>
                </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 mb-6">
                <h5 className="font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <Activity size={18} />
                    Workflow Recommendations
                </h5>
                <ol className="space-y-2 text-sm list-decimal list-inside">
                    <li><strong>Start your day:</strong> Open dashboard, check for new games, enable edge alerts</li>
                    <li><strong>Scan opportunities:</strong> Sort by divergence, filter to HIGH confidence</li>
                    <li><strong>Deep dive:</strong> Click promising games, review analytics, check context (injuries/weather)</li>
                    <li><strong>Calculate risk:</strong> Use Risk Calculator to determine position size</li>
                    <li><strong>Backtest ideas:</strong> Use Strategy Lab to see how similar setups performed</li>
                    <li><strong>Monitor:</strong> Keep edge alerts enabled, review alerts as they come in</li>
                    <li><strong>Review:</strong> After trades, track outcomes to refine your strategy</li>
                </ol>
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5">
                <h5 className="font-bold text-red-400 mb-3 flex items-center gap-2">
                    <AlertTriangle size={18} />
                    Common Pitfalls to Avoid
                </h5>
                <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span><strong>Ignoring confidence scores:</strong> LOW confidence predictions are unreliable</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span><strong>Oversizing positions:</strong> Even with an edge, outcomes are probabilistic</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span><strong>Chasing small edges:</strong> Consider transaction costs - very small divergences may not be profitable</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span><strong>Ignoring context:</strong> Always check injuries, weather, and news before trading</span>
                    </li>
                    <li className="flex items-start gap-2">
                        <span className="text-red-400 mt-1">✗</span>
                        <span><strong>Over-relying on model:</strong> Models are tools, not guarantees. Combine with your own analysis</span>
                    </li>
                </ul>
            </div>

            <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <h5 className="font-bold text-white mb-2">Remember</h5>
                <p className="text-sm text-zinc-400">
                    Prediction markets are complex and outcomes are uncertain. This tool provides statistical analysis and market data, 
                    but successful trading requires discipline, risk management, and continuous learning. Start small, learn from each trade, 
                    and gradually refine your approach. Good luck!
                </p>
            </div>
        </div>
    </div>
);

export default HelpGuide;


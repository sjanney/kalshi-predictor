import React, { useState, useCallback, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Game, type League } from '../lib/api';
import { useFilterStore } from '../lib/store';
import { useGameContext } from '../contexts/GameContext';
import GameCard from './GameCard';
import MarketTicker from './MarketTicker';
import InsightsPanel from './charts/InsightsPanel';
import AccuracyPanel from './AccuracyPanel';
import {
    RefreshCw, Zap, Filter, BarChart3, AlertTriangle,
    X, CheckCircle, LayoutDashboard,
    Calculator, Map, Activity
} from 'lucide-react';
import { cn } from './ui/shared';
import { GameCardSkeleton, InsightsPanelSkeleton, GameAnalyticsModalSkeleton } from './ui/skeletons';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ZAxis, Cell } from 'recharts';

// Lazy load heavy components
const GameAnalyticsModal = lazy(() => import('./GameAnalyticsModal'));
const StrategyLab = lazy(() => import('./StrategyLab'));
const HelpGuide = lazy(() => import('./HelpGuide'));
const LiveMarketsTab = lazy(() => import('./LiveMarketsTab'));

// --- Modals (Extracted from Legacy) ---
interface MarketHeatmapModalProps {
    open: boolean;
    onClose: () => void;
    games?: Game[];
}

const MarketHeatmapModal: React.FC<MarketHeatmapModalProps> = ({ open, onClose, games }) => {
    const safeGames = games ?? [];
    const heatmapData = safeGames.map((game) => ({
        name: `${game.away_abbr} @ ${game.home_abbr}`,
        volume: game.market_data?.volume ?? 0,
        divergence: Math.abs((game.prediction?.divergence ?? 0) * 100),
        confidence: game.prediction?.confidence_score ?? 'LOW',
        price: ((game.market_data?.price ?? game.prediction?.home_kalshi_prob ?? 0) * 100),
    }));

    const confidenceColor = (confidence: Game['prediction']['confidence_score']) => {
        switch (confidence) {
            case 'HIGH': return '#00f0ff';
            case 'MEDIUM': return '#7000ff';
            default: return '#71717a';
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="glass-panel rounded-2xl w-full max-w-5xl p-6 relative"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                            <X size={18} />
                        </button>
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Map className="text-primary" size={20} /> Market Heat Map
                            </h3>
                            <p className="text-sm text-zinc-400">Volume vs. Edge. Bubble size = Price.</p>
                        </div>
                        <div className="h-[420px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                    <CartesianGrid stroke="#333" vertical={false} strokeDasharray="3 3" />
                                    <XAxis type="number" dataKey="volume" name="Volume" tick={{ fill: '#888' }} stroke="#444" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                                    <YAxis type="number" dataKey="divergence" name="Edge" stroke="#444" tick={{ fill: '#888' }} unit="%" />
                                    <ZAxis dataKey="price" range={[80, 400]} name="Price" />
                                    <RechartsTooltip
                                        content={({ active, payload }) => {
                                            if (!active || !payload || payload.length === 0) return null;
                                            const data = payload[0].payload;
                                            return (
                                                <div className="glass-panel p-3 text-xs text-zinc-300 rounded-lg">
                                                    <p className="font-bold text-white mb-1">{data.name}</p>
                                                    <p>Vol: <span className="text-primary">${data.volume.toLocaleString()}</span></p>
                                                    <p>Edge: <span className="text-secondary">{data.divergence.toFixed(1)}%</span></p>
                                                    <p>Conf: <span style={{ color: confidenceColor(data.confidence) }}>{data.confidence}</span></p>
                                                </div>
                                            );
                                        }}
                                    />
                                    <Scatter data={heatmapData}>
                                        {heatmapData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={confidenceColor(entry.confidence)} />
                                        ))}
                                    </Scatter>
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

interface RiskCalculatorModalProps {
    open: boolean;
    onClose: () => void;
}

const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({ open, onClose }) => {
    const [bankroll, setBankroll] = useState(5000);
    const [winProbability, setWinProbability] = useState(60);
    const [marketPrice, setMarketPrice] = useState(48);

    const p = Math.min(Math.max(winProbability / 100, 0.01), 0.99);
    const price = Math.min(Math.max(marketPrice / 100, 0.01), 0.99);
    const q = 1 - p;
    const b = (1 - price) / price;
    const kellyFraction = Math.max((b * p - q) / b, 0);
    const maxStake = bankroll * kellyFraction;

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="glass-panel rounded-2xl w-full max-w-xl p-6 relative"
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
                            <X size={18} />
                        </button>
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Calculator className="text-secondary" size={20} /> Kelly Calculator
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-zinc-400 uppercase">Bankroll</label>
                                <input type="number" value={bankroll} onChange={e => setBankroll(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-zinc-400 uppercase">Win Prob (%)</label>
                                    <input type="number" value={winProbability} onChange={e => setWinProbability(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white" />
                                </div>
                                <div>
                                    <label className="text-xs text-zinc-400 uppercase">Market Price (¢)</label>
                                    <input type="number" value={marketPrice} onChange={e => setMarketPrice(Number(e.target.value))} className="w-full bg-black/20 border border-white/10 rounded p-2 text-white" />
                                </div>
                            </div>
                            <div className="p-4 bg-white/5 rounded-lg border border-white/10 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-zinc-400">Kelly Stake</span>
                                    <span className="text-xl font-bold text-primary">{(kellyFraction * 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-zinc-400">Max Bet</span>
                                    <span className="text-xl font-bold text-white">${maxStake.toFixed(0)}</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- Main Dashboard Component ---

const Dashboard: React.FC = () => {
    const {
        games, loading, error, lastUpdated, isRefreshing, refreshGames,
        selectedGame, selectedGameDetails, selectedGameLoading, setSelectedGame, clearSelectedGame,
        autoRefreshEnabled, setAutoRefreshEnabled, refreshIntervalMinutes, setRefreshIntervalMinutes,
        refreshCountdown, isSyncing, syncError
    } = useGameContext();

    const { minConfidence, sortBy, league, setFilter } = useFilterStore();

    // UI State
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showRiskCalc, setShowRiskCalc] = useState(false);
    const [showStrategyLab, setShowStrategyLab] = useState(false);
    const [showHelpGuide, setShowHelpGuide] = useState(false);
    const [activeTab, setActiveTab] = useState<'games' | 'live'>('games');

    // Filter Logic
    const filteredGames = React.useMemo(() => games.filter(game => {
        if (minConfidence === "HIGH" && game.prediction.confidence_score !== "HIGH") return false;
        if (minConfidence === "MEDIUM" && game.prediction.confidence_score === "LOW") return false;
        return true;
    }), [games, minConfidence]);

    // Sort Logic
    const sortedGames = React.useMemo(() => {
        return [...filteredGames].sort((a, b) => {
            if (sortBy === 'divergence') return b.prediction.divergence - a.prediction.divergence;
            if (sortBy === 'confidence') {
                const confMap = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                return confMap[b.prediction.confidence_score] - confMap[a.prediction.confidence_score];
            }
            return 0; // Default time sort (assumed already sorted by API)
        });
    }, [filteredGames, sortBy]);

    const handleRefresh = useCallback(() => {
        if (!isRefreshing && !isSyncing) refreshGames();
    }, [isRefreshing, isSyncing, refreshGames]);

    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30 pb-20">
            {/* Header */}
            <header className="sticky top-0 z-40 glass-panel border-b-0">
                <div className="max-w-7xl mx-auto px-6 pl-24 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                            <Zap className="w-5 h-5 text-white fill-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight leading-none">
                                Kalshi<span className="text-primary">Predictor</span>
                            </h1>
                            <span className="text-[10px] text-zinc-400 font-medium tracking-widest uppercase">
                                Neural Engine v4.0
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 bg-black/20 p-1 rounded-lg border border-white/5">
                            {(['nba', 'nfl'] as League[]).map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setFilter('league', l)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                                        league === l ? "bg-primary/20 text-primary border border-primary/20 shadow-[0_0_10px_rgba(0,240,255,0.2)]" : "text-zinc-500 hover:text-zinc-300"
                                    )}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>

                        <div className="h-8 w-[1px] bg-white/10 mx-2" />

                        <button onClick={() => setShowRiskCalc(true)} className="p-2 text-zinc-400 hover:text-white transition-colors" title="Risk Calculator">
                            <Calculator size={20} />
                        </button>
                        <button onClick={() => setShowHeatmap(true)} className="p-2 text-zinc-400 hover:text-white transition-colors" title="Market Heatmap">
                            <Map size={20} />
                        </button>
                        <button onClick={() => setShowStrategyLab(true)} className="p-2 text-zinc-400 hover:text-white transition-colors" title="Strategy Lab">
                            <BarChart3 size={20} />
                        </button>
                        <button onClick={handleRefresh} disabled={isRefreshing} className={cn("p-2 text-zinc-400 hover:text-white transition-colors", isRefreshing && "animate-spin")}>
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Market Ticker */}
            <MarketTicker games={games} />

            {/* Tab Navigation */}
            <div className="sticky top-16 z-30 glass-panel border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex gap-1 overflow-x-auto">
                        {[
                            { id: 'games', label: 'Games', icon: LayoutDashboard },
                            { id: 'live', label: 'Live Markets', icon: Activity },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'games' | 'live')}
                                className={cn(
                                    "flex items-center gap-2 px-6 py-4 font-semibold text-sm transition-all relative",
                                    activeTab === tab.id
                                        ? "text-white"
                                        : "text-zinc-500 hover:text-zinc-300"
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-kalshi-green to-primary"
                                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">
                {activeTab === 'live' ? (
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-kalshi-green/30 border-t-kalshi-green rounded-full animate-spin" />
                        </div>
                    }>
                        <LiveMarketsTab />
                    </Suspense>
                ) : (
                    <>

                        {/* Toolbar */}
                        <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">League</span>
                                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                                        {(['nba', 'nfl'] as League[]).map((l) => (
                                            <button
                                                key={l}
                                                onClick={() => setFilter('league', l)}
                                                className={cn(
                                                    "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                                                    league === l ? "bg-primary text-black shadow-glow" : "text-zinc-500 hover:text-zinc-300 hover:bg-white/5"
                                                )}
                                            >
                                                {l}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="h-8 w-[1px] bg-white/10" />

                                <div className="flex items-center gap-3">
                                    <Filter size={14} className="text-zinc-500" />
                                    <select
                                        value={minConfidence}
                                        onChange={(e) => setFilter('minConfidence', e.target.value)}
                                        className="bg-transparent border-none focus:ring-0 text-zinc-300 font-medium text-sm cursor-pointer hover:text-white transition-colors"
                                    >
                                        <option value="ALL">All Confidence</option>
                                        <option value="MEDIUM">Medium+</option>
                                        <option value="HIGH">High Only</option>
                                    </select>
                                </div>

                                <div className="h-8 w-[1px] bg-white/10" />

                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sort</span>
                                    <div className="flex bg-black/40 rounded-lg p-1 border border-white/5">
                                        {['time', 'divergence', 'confidence'].map((s) => (
                                            <button
                                                key={s}
                                                onClick={() => setFilter('sortBy', s)}
                                                className={cn(
                                                    "px-3 py-1 rounded-md text-xs font-medium transition-all capitalize",
                                                    sortBy === s ? "bg-white/10 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                                )}
                                            >
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="h-8 w-[1px] bg-white/10" />

                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Auto-Refresh</span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                                            className={cn(
                                                "w-8 h-4 rounded-full transition-colors relative",
                                                autoRefreshEnabled ? "bg-emerald-500" : "bg-zinc-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform",
                                                autoRefreshEnabled ? "translate-x-4" : "translate-x-0"
                                            )} />
                                        </button>
                                        {autoRefreshEnabled && (
                                            <select
                                                value={refreshIntervalMinutes}
                                                onChange={(e) => setRefreshIntervalMinutes(Number(e.target.value) as any)}
                                                className="bg-black/40 border border-white/5 rounded text-[10px] text-zinc-300 py-0.5 px-1 focus:ring-0"
                                            >
                                                <option value={0.5}>30s</option>
                                                <option value={1}>1m</option>
                                                <option value={5}>5m</option>
                                            </select>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-zinc-500 w-12">
                                        {autoRefreshEnabled && refreshCountdown ? refreshCountdown : ''}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 text-xs text-zinc-500">
                                {syncError && (
                                    <div className="flex items-center gap-1 text-red-400">
                                        <AlertTriangle size={12} />
                                        <span>Sync Error</span>
                                    </div>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]", isSyncing ? "bg-amber-400 animate-pulse" : "bg-primary")} />
                                    <span>{filteredGames.length} Active Games</span>
                                </div>
                                {lastUpdated && (
                                    <>
                                        <span>•</span>
                                        <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Live Market Insights */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                                    <LayoutDashboard className="text-primary w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Market Insights</h2>
                                    <p className="text-sm text-zinc-400">Real-time analysis of volume, movement, and opportunities.</p>
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-2xl border border-white/5 relative overflow-hidden">
                                {loading && games.length === 0 ? (
                                    <InsightsPanelSkeleton />
                                ) : (
                                    <InsightsPanel games={games} />
                                )}
                            </div>
                        </section>

                        {/* Model Accuracy */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-secondary/10 rounded-lg border border-secondary/20">
                                    <CheckCircle className="text-secondary w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Model Performance</h2>
                                    <p className="text-sm text-zinc-400">Verified accuracy tracking over the last 30 days.</p>
                                </div>
                            </div>

                            <div className="glass-panel p-6 rounded-2xl border border-white/5">
                                <AccuracyPanel />
                            </div>
                        </section>

                        {/* Games Grid */}
                        <section>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/5 rounded-lg border border-white/10">
                                    <Zap className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-white">Upcoming Matchups</h2>
                                    <p className="text-sm text-zinc-400">AI predictions vs. Kalshi market pricing.</p>
                                </div>
                            </div>

                            {loading && games.length === 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {[1, 2, 3, 4, 5, 6].map((i) => <GameCardSkeleton key={i} />)}
                                </div>
                            ) : error ? (
                                <div className="text-center py-20 glass-panel rounded-2xl border border-red-500/20 bg-red-500/5">
                                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-white">Connection Error</h3>
                                    <p className="text-zinc-400 mb-6">{error}</p>
                                    <button onClick={() => refreshGames()} className="px-6 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors border border-red-500/20">
                                        Retry Connection
                                    </button>
                                </div>
                            ) : sortedGames.length === 0 ? (
                                <div className="text-center py-20 glass-panel rounded-2xl">
                                    <p className="text-zinc-500">No games match your filters.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <AnimatePresence>
                                        {sortedGames.map((game) => (
                                            <GameCard
                                                key={game.game_id}
                                                game={game}
                                                onSelect={setSelectedGame}
                                            />
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>

            {/* Modals */}
            <MarketHeatmapModal open={showHeatmap} onClose={() => setShowHeatmap(false)} games={games} />
            <RiskCalculatorModal open={showRiskCalc} onClose={() => setShowRiskCalc(false)} />

            <Suspense fallback={null}>
                <StrategyLab open={showStrategyLab} onClose={() => setShowStrategyLab(false)} games={games} />
                <HelpGuide open={showHelpGuide} onClose={() => setShowHelpGuide(false)} />
            </Suspense>

            <AnimatePresence>
                {selectedGame && (
                    <Suspense fallback={<div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm" />}>
                        {selectedGameDetails ? (
                            <GameAnalyticsModal
                                key={selectedGame.game_id}
                                game={selectedGameDetails}
                                loading={selectedGameLoading}
                                onClose={clearSelectedGame}
                            />
                        ) : selectedGameLoading ? (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                                <GameAnalyticsModalSkeleton />
                            </div>
                        ) : null}
                    </Suspense>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;

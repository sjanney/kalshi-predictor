import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api, type Game, type League } from '../lib/api';
import { useFilterStore } from '../lib/store';
import GameCard from './GameCard';
import GameAnalyticsModal from './GameAnalyticsModal';
import InsightsPanel from './charts/InsightsPanel';
import { RefreshCw, Zap, Filter, Settings, BarChart3, AlertTriangle, Bell, X } from 'lucide-react';
import { cn } from './ui/shared';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ZAxis, Cell } from 'recharts';

type EdgeAlert = {
    id: string;
    matchup: string;
    edge: number;
    confidence: Game['prediction']['confidence_score'];
    timestamp: number;
};

const Dashboard: React.FC = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showToolbox, setShowToolbox] = useState(false);
    const [edgeAlertsEnabled, setEdgeAlertsEnabled] = useState(false);
    const [edgeThreshold, setEdgeThreshold] = useState(0.15);
    const [edgeAlerts, setEdgeAlerts] = useState<EdgeAlert[]>([]);
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [showRiskCalc, setShowRiskCalc] = useState(false);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
    const alertedGameIdsRef = useRef<Set<string>>(new Set());

    // Store
    const { minConfidence, sortBy, league, setFilter } = useFilterStore();

    const fetchGames = async () => {
        try {
            setIsRefreshing(true);
            // Initial loading state only if we don't have games or if switching leagues
            if (games.length === 0) setLoading(true);
            
            setError(null);
            const data = await api.getGames(sortBy, league);
            setGames(data);
            setLastUpdated(new Date());
        } catch (err) {
            console.error("Failed to fetch games:", err);
            setError("Failed to connect to prediction engine.");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        setGames([]); // Clear games when switching leagues
        setLoading(true);
        fetchGames();
        const interval = setInterval(fetchGames, 60000 * 5); // 5 mins
        return () => clearInterval(interval);
    }, [sortBy, league]); // Refetch when sort or league changes

    // Persist toolbox preferences
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem('kalshi-edge-alerts');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (typeof parsed.enabled === 'boolean') setEdgeAlertsEnabled(parsed.enabled);
                if (typeof parsed.threshold === 'number') setEdgeThreshold(parsed.threshold);
            }
        } catch (err) {
            console.warn('Failed to load edge alert preferences', err);
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const payload = JSON.stringify({ enabled: edgeAlertsEnabled, threshold: edgeThreshold });
        localStorage.setItem('kalshi-edge-alerts', payload);
    }, [edgeAlertsEnabled, edgeThreshold]);

    // Reset alerts when disabling or changing league
    useEffect(() => {
        alertedGameIdsRef.current.clear();
        setEdgeAlerts([]);
    }, [edgeAlertsEnabled, league]);

    useEffect(() => {
        if (!edgeAlertsEnabled) return;
        alertedGameIdsRef.current.clear();
        setEdgeAlerts([]);
    }, [edgeThreshold]);

    // Edge detection loop
    useEffect(() => {
        if (!edgeAlertsEnabled || games.length === 0) return;
        const threshold = edgeThreshold;
        const newAlerts = games
            .filter((g) => g.prediction.divergence >= threshold)
            .filter((g) => !alertedGameIdsRef.current.has(g.game_id));

        if (newAlerts.length === 0) return;

        const alertPayloads = newAlerts.map((g) => ({
            id: `${g.game_id}-${Date.now()}`,
            matchup: `${g.away_abbr} @ ${g.home_abbr}`,
            edge: g.prediction.divergence,
            confidence: g.prediction.confidence_score,
            timestamp: Date.now(),
        }));

        newAlerts.forEach((g) => alertedGameIdsRef.current.add(g.game_id));
        setEdgeAlerts((prev) => [...alertPayloads, ...prev].slice(0, 5));
    }, [games, edgeAlertsEnabled, edgeThreshold]);

    const highEdgeCount = games.filter((g) => g.prediction.divergence >= edgeThreshold).length;
    const handleClearAlerts = () => {
        setEdgeAlerts([]);
        alertedGameIdsRef.current.clear();
    };

    // Filtering Logic
    const filteredGames = games.filter(game => {
        if (minConfidence === "HIGH" && game.prediction.confidence_score !== "HIGH") return false;
        if (minConfidence === "MEDIUM" && game.prediction.confidence_score === "LOW") return false;
        return true;
    });

    const stats = {
        total: games.length,
        highConf: games.filter(g => g.prediction.confidence_score === "HIGH").length,
        opportunities: games.filter(g => g.prediction.divergence > 0.15).length
    };

    return (
        <div className="min-h-screen bg-background text-white font-sans selection:bg-primary/30">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-zinc-800/50 drag-region">
                <div className={cn(
                    "max-w-7xl mx-auto px-6 h-16 flex items-center justify-between no-drag",
                    isElectron && "pl-16 md:pl-24"
                )}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
                            <Zap className="w-4 h-4 text-white fill-white" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="font-bold text-lg tracking-tight text-white">Kalshi<span className="text-zinc-500">Predictor</span></span>
                            <span className="text-[10px] text-primary font-medium tracking-wider uppercase">Pro v2.0</span>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-6 mr-4 border-r border-zinc-800 pr-6">
                            <div className="text-center">
                                <div className="text-xs text-zinc-500 font-medium">Games</div>
                                <div className="text-sm font-bold text-white">{stats.total}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-zinc-500 font-medium">High Conf</div>
                                <div className="text-sm font-bold text-primary">{stats.highConf}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs text-zinc-500 font-medium">Opportunities</div>
                                <div className="text-sm font-bold text-amber-400">{stats.opportunities}</div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowToolbox(!showToolbox)}
                            className={cn("p-2 rounded-lg hover:bg-surface_highlight transition-all", showToolbox ? "text-primary bg-primary/10" : "text-zinc-400 hover:text-white")}
                            title="Trading Toolbox"
                        >
                            <Settings size={18} />
                        </button>

                        <button 
                            onClick={() => fetchGames()} 
                            className={cn("p-2 rounded-lg hover:bg-surface_highlight transition-all text-zinc-400 hover:text-white", isRefreshing && "animate-spin")}
                            title="Refresh"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Controls Bar */}
            <div className="border-b border-zinc-800 bg-surface/30 relative z-40">
                <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-4 items-center justify-between">
                    
                    {/* League Tabs */}
                    <div className="flex items-center gap-2 bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                         {(['nba', 'nfl'] as League[]).map((l) => (
                            <button
                                key={l}
                                onClick={() => setFilter('league', l)}
                                className={cn(
                                    "px-4 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all",
                                    league === l 
                                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20" 
                                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                                )}
                            >
                                {l}
                            </button>
                         ))}
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <Filter size={14} />
                            <span className="font-medium text-zinc-500">FILTER:</span>
                            <select 
                                value={minConfidence}
                                onChange={(e) => setFilter('minConfidence', e.target.value)}
                                className="bg-transparent border-none focus:ring-0 text-zinc-300 font-medium text-sm cursor-pointer"
                            >
                                <option value="ALL">All Confidence</option>
                                <option value="MEDIUM">Medium+</option>
                                <option value="HIGH">High Only</option>
                            </select>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-zinc-400">
                            <span className="font-medium text-zinc-500">SORT:</span>
                            <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                                {['time', 'divergence', 'confidence'].map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => setFilter('sortBy', s)}
                                        className={cn(
                                            "px-3 py-1 rounded-md text-xs font-medium transition-all capitalize",
                                            sortBy === s ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Trading Toolbox Drawer */}
                <AnimatePresence>
                    {showToolbox && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-zinc-900/50 border-b border-zinc-800"
                        >
                            <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-start gap-3">
                                    <Bell className="text-amber-400 mt-1" size={16} />
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Edge Alerts</h4>
                                        <p className="text-xs text-zinc-500 mt-1">
                                            Smart pings when divergence &gt; threshold.
                                        </p>
                                        <div className="mt-3 flex items-center gap-3 text-[11px] text-zinc-400">
                                            <span className="uppercase font-semibold tracking-widest">Status</span>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="sr-only peer"
                                                    checked={edgeAlertsEnabled}
                                                    onChange={(e) => setEdgeAlertsEnabled(e.target.checked)}
                                                />
                                                <div className="w-10 h-5 bg-zinc-700 rounded-full peer peer-checked:bg-emerald-600 transition-colors">
                                                    <div className="absolute top-[2px] left-[2px] h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-5" />
                                                </div>
                                            </label>
                                            <span className={edgeAlertsEnabled ? 'text-emerald-300 font-semibold' : 'text-zinc-500'}>
                                                {edgeAlertsEnabled ? 'Active' : 'Paused'}
                                            </span>
                                        </div>
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                                                <span>Edge threshold</span>
                                                <span className="font-mono text-white">
                                                    {(edgeThreshold * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <input
                                                type="range"
                                                min={5}
                                                max={30}
                                                step={1}
                                                value={Math.round(edgeThreshold * 100)}
                                                onChange={(e) => setEdgeThreshold(Number(e.target.value) / 100)}
                                                className="w-full accent-emerald-500"
                                            />
                                            <div className="mt-2 text-[11px] text-zinc-500">
                                                {edgeAlertsEnabled
                                                    ? `${highEdgeCount} markets currently above threshold`
                                                    : 'Enable to monitor high-divergence markets'}
                                            </div>
                                        </div>
                                        {edgeAlertsEnabled && edgeAlerts.length > 0 && (
                                            <button
                                                className="mt-3 text-[10px] uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
                                                onClick={handleClearAlerts}
                                            >
                                                Clear recent alerts
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-start gap-3">
                                    <BarChart3 className="text-blue-400 mt-1" size={16} />
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Market Heat Map</h4>
                                        <p className="text-xs text-zinc-500 mt-1">Visualizing volume vs. confidence across all active markets.</p>
                                        <button
                                            className="mt-2 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded border border-zinc-700 transition-colors"
                                            onClick={() => setShowHeatmap(true)}
                                        >
                                            View Map
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 flex items-start gap-3">
                                    <AlertTriangle className="text-zinc-400 mt-1" size={16} />
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Risk Calculator</h4>
                                        <p className="text-xs text-zinc-500 mt-1">Kelly Criterion calculator for sizing bets.</p>
                                        <button
                                            className="mt-2 text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded border border-zinc-700 transition-colors"
                                            onClick={() => setShowRiskCalc(true)}
                                        >
                                            Open Calculator
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Insights Panel - Only show if we have data */}
                {!loading && games.length > 0 && (
                    <>
                        <div className="flex justify-between items-center text-xs text-zinc-500 mb-3">
                            <span>Insights</span>
                            {lastUpdated && (
                                <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            )}
                        </div>
                        <InsightsPanel games={games} />
                    </>
                )}

                {loading && games.length === 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                            <div key={i} className="h-72 bg-surface rounded-xl animate-pulse border border-zinc-800" />
                        ))}
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                            <Zap className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
                        <p className="text-zinc-500 max-w-md mb-6">{error}</p>
                        <button 
                            onClick={() => fetchGames()}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                ) : filteredGames.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-zinc-500">No games match your filters.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {filteredGames.map((game) => (
                                <GameCard 
                                    key={game.game_id} 
                                    game={game} 
                                    onClick={() => setSelectedGame(game)}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </main>

            <MarketHeatmapModal open={showHeatmap} onClose={() => setShowHeatmap(false)} games={games} />
            <RiskCalculatorModal open={showRiskCalc} onClose={() => setShowRiskCalc(false)} />
            <AnimatePresence>
                {selectedGame && (
                    <GameAnalyticsModal 
                        game={selectedGame} 
                        onClose={() => setSelectedGame(null)} 
                    />
                )}
            </AnimatePresence>
            <EdgeAlertsTray alerts={edgeAlerts} visible={edgeAlertsEnabled} onDismiss={handleClearAlerts} />
        </div>
    );
};

export default Dashboard;

interface MarketHeatmapModalProps {
    open: boolean;
    onClose: () => void;
    games: Game[];
}

const MarketHeatmapModal: React.FC<MarketHeatmapModalProps> = ({ open, onClose, games }) => {
    const heatmapData = games.map((game) => ({
        name: `${game.away_abbr} @ ${game.home_abbr}`,
        volume: game.market_data.volume,
        divergence: Math.abs(game.prediction.divergence * 100),
        confidence: game.prediction.confidence_score,
        price: (game.market_data.price ?? game.prediction.home_kalshi_prob) * 100,
    }));

    const confidenceColor = (confidence: Game['prediction']['confidence_score']) => {
        switch (confidence) {
            case 'HIGH':
                return '#10b981';
            case 'MEDIUM':
                return '#f97316';
            default:
                return '#71717a';
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-surface border border-zinc-800 rounded-2xl w-full max-w-5xl p-6 relative"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                            aria-label="Close market heatmap"
                        >
                            <X size={18} />
                        </button>
                        <div className="mb-4">
                            <h3 className="text-xl font-bold text-white">Market Heat Map</h3>
                            <p className="text-sm text-zinc-500">
                                Scatter view of market volume vs. model edge. Dot color tracks confidence.
                            </p>
                        </div>
                        <div className="h-[420px] w-full">
                            {heatmapData.length === 0 ? (
                                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                                    No market data available.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                                        <CartesianGrid stroke="#27272a" vertical={false} />
                                        <XAxis
                                            type="number"
                                            dataKey="volume"
                                            name="Volume"
                                            tick={{ fontSize: 12, fill: '#a1a1aa' }}
                                            stroke="#3f3f46"
                                            tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                                        />
                                        <YAxis
                                            type="number"
                                            dataKey="divergence"
                                            name="Edge"
                                            stroke="#3f3f46"
                                            tick={{ fontSize: 12, fill: '#a1a1aa' }}
                                            unit="%"
                                        />
                                        <ZAxis dataKey="price" range={[80, 200]} name="Price" />
                                        <RechartsTooltip
                                            content={({ active, payload }) => {
                                                if (!active || !payload || payload.length === 0) return null;
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-xs text-zinc-300">
                                                        <p className="font-semibold text-white mb-1">{data.name}</p>
                                                        <p>Volume: <span className="font-mono text-white">${data.volume.toLocaleString()}</span></p>
                                                        <p>Edge: <span className="font-mono text-white">{data.divergence.toFixed(1)}%</span></p>
                                                        <p>Kalshi Price: <span className="font-mono text-white">{data.price.toFixed(1)}¢</span></p>
                                                        <p>Confidence: <span className="font-semibold text-white">{data.confidence}</span></p>
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Scatter data={heatmapData}>
                                            {heatmapData.map((entry, index) => (
                                                <Cell key={`cell-${entry.name}-${index}`} fill={confidenceColor(entry.confidence)} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                        <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500 uppercase tracking-widest">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" /> High Confidence
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-orange-400" /> Medium Confidence
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-zinc-500" /> Low Confidence
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-1.5 h-6 bg-zinc-700 rounded-full" />
                                Bubble size = Kalshi price (¢)
                            </div>
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
    const [confidence, setConfidence] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

    const p = Math.min(Math.max(winProbability / 100, 0.01), 0.99);
    const price = Math.min(Math.max(marketPrice / 100, 0.01), 0.99);
    const q = 1 - p;
    const b = (1 - price) / price;
    const kellyFraction = Math.max((b * p - q) / b, 0);
    const halfKelly = kellyFraction / 2;
    const maxStake = bankroll * kellyFraction;
    const halfStake = bankroll * halfKelly;
    const expectedValue = p * (1 - price) - q * price;
    const contractsFullKelly = Math.max(Math.floor(maxStake / price), 0);
    const contractsHalfKelly = Math.max(Math.floor(halfStake / price), 0);

    const confidenceCopy = {
        HIGH: 'Aggressive sizing ok',
        MEDIUM: 'Stay disciplined',
        LOW: 'Consider passing',
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <motion.div
                        className="bg-surface border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 relative"
                        initial={{ scale: 0.92, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.92, opacity: 0 }}
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
                            aria-label="Close risk calculator"
                        >
                            <X size={18} />
                        </button>
                        <div className="mb-5">
                            <h3 className="text-xl font-bold text-white">Risk Calculator</h3>
                            <p className="text-sm text-zinc-500">
                                Kelly sizing helper for Kalshi YES contracts (pays $1 if correct).
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-xs uppercase tracking-widest text-zinc-500">Bankroll ($)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={bankroll}
                                    onChange={(e) => setBankroll(Number(e.target.value) || 0)}
                                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-widest text-zinc-500">Model win probability (%)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={winProbability}
                                    onChange={(e) => setWinProbability(Number(e.target.value) || 0)}
                                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-widest text-zinc-500">Kalshi price (¢)</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={99}
                                    value={marketPrice}
                                    onChange={(e) => setMarketPrice(Number(e.target.value) || 0)}
                                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-widest text-zinc-500">Confidence</label>
                                <select
                                    value={confidence}
                                    onChange={(e) => setConfidence(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                                    className="mt-1 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="HIGH">High</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="LOW">Low</option>
                                </select>
                                <p className="text-[11px] text-zinc-500 mt-1">{confidenceCopy[confidence]}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                                <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Kelly Fraction</p>
                                <p className="text-3xl font-bold text-primary">{(kellyFraction * 100).toFixed(1)}%</p>
                                <p className="text-xs text-zinc-500 mt-2">
                                    Half Kelly: <span className="text-white font-semibold">{(halfKelly * 100).toFixed(1)}%</span>
                                </p>
                                <p className="text-xs text-zinc-500 mt-1">
                                    Expected value / contract: <span className={expectedValue > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                        ${(expectedValue * 100).toFixed(2)}
                                    </span>
                                </p>
                            </div>
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                                <p className="text-[11px] uppercase tracking-widest text-zinc-500 mb-1">Position Size</p>
                                <div className="text-2xl font-bold text-white">${maxStake.toFixed(0)}</div>
                                <p className="text-xs text-zinc-500">≈ {contractsFullKelly} contracts</p>
                                <div className="mt-3">
                                    <p className="text-xs text-zinc-500">Half Kelly: ${halfStake.toFixed(0)} ({contractsHalfKelly} contracts)</p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Risk per contract: ${price.toFixed(2)} | Max payoff: ${(1 - price).toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="mt-5 text-[11px] text-zinc-500">
                            Kelly assumes infinite repetitions. Consider capping exposure & blending with qualitative inputs.
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

interface EdgeAlertsTrayProps {
    alerts: EdgeAlert[];
    visible: boolean;
    onDismiss: () => void;
}

const EdgeAlertsTray: React.FC<EdgeAlertsTrayProps> = ({ alerts, visible, onDismiss }) => {
    if (!visible) return null;
    return (
        <AnimatePresence>
            {alerts.length > 0 && (
                <motion.div
                    className="fixed bottom-6 right-6 z-50 w-72 space-y-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                >
                    {alerts.map((alert) => (
                        <motion.div
                            key={alert.id}
                            className="bg-emerald-950/80 border border-emerald-600/30 rounded-xl p-3 shadow-lg shadow-emerald-900/30"
                            initial={{ opacity: 0, x: 30 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 30 }}
                        >
                            <div className="flex items-center justify-between text-[11px] text-emerald-200 uppercase tracking-widest">
                                <span>{(alert.edge * 100).toFixed(0)}% edge</span>
                                <span>{alert.confidence}</span>
                            </div>
                            <p className="text-white font-semibold text-sm mt-1">{alert.matchup}</p>
                            <p className="text-[10px] text-emerald-200 mt-1">
                                {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </motion.div>
                    ))}
                    <button
                        onClick={onDismiss}
                        className="text-[10px] uppercase tracking-widest text-emerald-300 hover:text-emerald-100 transition-colors"
                    >
                        Dismiss Alerts
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

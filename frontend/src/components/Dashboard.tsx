import React, { useState, useCallback, lazy, Suspense, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Game, type League } from '../lib/api';
import { useFilterStore } from '../lib/store';
import { useGameContext } from '../contexts/GameContext';
import GameCard from './GameCard';
import MarketTicker from './MarketTicker';
import InsightsPanel from './charts/InsightsPanel';
import AccuracyPanel from './AccuracyPanel';
import LicenseInfoModal from './LicenseInfoModal';
import {
    RefreshCw, Zap, Filter, BarChart3, AlertTriangle,
    X, CheckCircle, LayoutDashboard,
    Calculator, Map, Activity, Shield, AlertCircle, Calendar, DollarSign
} from 'lucide-react';
import { cn } from './ui/shared';
import { GameCardSkeleton, InsightsPanelSkeleton, GameAnalyticsModalSkeleton } from './ui/skeletons';

// Lazy load heavy components
const GameAnalyticsModal = lazy(() => import('./GameAnalyticsModal'));
const StrategyLab = lazy(() => import('./StrategyLab'));
const HelpGuide = lazy(() => import('./HelpGuide'));
const LiveMarketsTab = lazy(() => import('./LiveMarketsTab'));
const TradingTerminal = lazy(() => import('./TradingTerminal'));

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
        fullName: `${game.away_team} @ ${game.home_team}`,
        volume: game.market_data?.volume ?? 0,
        divergence: Math.abs((game.prediction?.divergence ?? 0) * 100),
        confidence: game.prediction?.confidence_score ?? 'LOW',
        price: ((game.market_data?.price ?? game.prediction?.home_kalshi_prob ?? 0) * 100),
        recommendation: game.prediction?.recommendation ?? 'Neutral',
        signalStrength: game.prediction?.signal_strength ?? 'WEAK',
    })).sort((a, b) => b.divergence - a.divergence); // Sort by edge descending

    const confidenceColor = (confidence: Game['prediction']['confidence_score']) => {
        switch (confidence) {
            case 'HIGH': return '#00f0ff';
            case 'MEDIUM': return '#7000ff';
            default: return '#71717a';
        }
    };

    const signalBadge = (strength: string) => {
        const colors = {
            'STRONG': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            'MODERATE': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
            'WEAK': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
        };
        return colors[strength as keyof typeof colors] || colors.WEAK;
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="glass-panel p-6 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors">
                            <X size={18} />
                        </button>

                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-white flex items-center gap-3 mb-2">
                                <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg">
                                    <Map className="text-primary" size={24} />
                                </div>
                                Market Opportunities
                            </h3>
                            <p className="text-sm text-zinc-400">Top betting edges ranked by model divergence from market prices</p>
                        </div>

                        {heatmapData.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-zinc-500">No market data available</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {heatmapData.map((game, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="relative group"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative bg-zinc-900/50 border border-white/5 rounded-xl p-4 hover:border-primary/30 transition-all">
                                            {/* Rank Badge */}
                                            <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-xs font-bold text-white shadow-lg">
                                                #{index + 1}
                                            </div>

                                            {/* Game Info */}
                                            <div className="mb-3 pt-2">
                                                <h4 className="text-white font-bold text-sm mb-1">{game.name}</h4>
                                                <p className="text-xs text-zinc-500">{game.fullName}</p>
                                            </div>

                                            {/* Key Metrics */}
                                            <div className="space-y-2 mb-3">
                                                {/* Edge */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-zinc-400">Edge</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                                                                style={{ width: `${Math.min(game.divergence * 5, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-sm font-bold text-primary">{game.divergence.toFixed(1)}%</span>
                                                    </div>
                                                </div>

                                                {/* Volume */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-zinc-400">Volume</span>
                                                    <span className="text-sm font-medium text-white">${(game.volume / 1000).toFixed(1)}k</span>
                                                </div>

                                                {/* Price */}
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-zinc-400">Market Price</span>
                                                    <span className="text-sm font-medium text-white">{game.price.toFixed(0)}¢</span>
                                                </div>
                                            </div>

                                            {/* Badges */}
                                            <div className="flex gap-2 flex-wrap">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-xs font-medium border ${signalBadge(game.signalStrength)}`}
                                                >
                                                    {game.signalStrength}
                                                </span>
                                                <span
                                                    className="px-2 py-0.5 rounded text-xs font-medium border"
                                                    style={{
                                                        backgroundColor: `${confidenceColor(game.confidence)}20`,
                                                        borderColor: `${confidenceColor(game.confidence)}40`,
                                                        color: confidenceColor(game.confidence)
                                                    }}
                                                >
                                                    {game.confidence}
                                                </span>
                                            </div>

                                            {/* Recommendation */}
                                            <div className="mt-3 pt-3 border-t border-white/5">
                                                <p className="text-xs text-zinc-400 mb-1">Recommendation</p>
                                                <p className="text-sm font-medium text-white">{game.recommendation}</p>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

interface RiskCalculatorModalProps {
    open: boolean;
    onClose: () => void;
    games: Game[];
}

const RiskCalculatorModal: React.FC<RiskCalculatorModalProps> = ({ open, onClose, games }) => {
    const [bankroll, setBankroll] = useState(5000);
    const [kellyMultiplier, setKellyMultiplier] = useState(1.0);
    const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
    const [animatedTotalKelly, setAnimatedTotalKelly] = useState(0);
    const [animatedTotalBet, setAnimatedTotalBet] = useState(0);
    const [animatedExpectedReturn, setAnimatedExpectedReturn] = useState(0);

    // Calculate Kelly for each selected game
    const portfolioGames = games.filter(g => selectedGames.has(g.game_id)).map(game => {
        const p = game.prediction.stat_model_prob;
        const price = (game.market_data?.price ?? 50) / 100;
        const q = 1 - p;
        const b = (1 - price) / price;
        const rawKelly = Math.max((b * p - q) / b, 0);
        const kellyFraction = rawKelly * kellyMultiplier;
        const edge = p - price;

        return {
            game,
            kellyFraction,
            edge,
            recommendedBet: bankroll * kellyFraction,
            expectedValue: edge * bankroll * kellyFraction
        };
    });

    const totalKellyFraction = portfolioGames.reduce((sum, g) => sum + g.kellyFraction, 0);
    const totalRecommendedBet = portfolioGames.reduce((sum, g) => sum + g.recommendedBet, 0);
    const totalExpectedValue = portfolioGames.reduce((sum, g) => sum + g.expectedValue, 0);
    const totalEdge = portfolioGames.length > 0 ? totalExpectedValue / totalRecommendedBet : 0;

    // Animate numbers
    useEffect(() => {
        const duration = 500;
        const steps = 20;
        const kellyStep = (totalKellyFraction * 100 - animatedTotalKelly) / steps;
        const betStep = (totalRecommendedBet - animatedTotalBet) / steps;
        const evStep = (totalExpectedValue - animatedExpectedReturn) / steps;

        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            setAnimatedTotalKelly(prev => prev + kellyStep);
            setAnimatedTotalBet(prev => prev + betStep);
            setAnimatedExpectedReturn(prev => prev + evStep);

            if (currentStep >= steps) {
                clearInterval(interval);
                setAnimatedTotalKelly(totalKellyFraction * 100);
                setAnimatedTotalBet(totalRecommendedBet);
                setAnimatedExpectedReturn(totalExpectedValue);
            }
        }, duration / steps);

        return () => clearInterval(interval);
    }, [totalKellyFraction, totalRecommendedBet, totalExpectedValue]);

    const toggleGame = (gameId: string) => {
        const newSelected = new Set(selectedGames);
        if (newSelected.has(gameId)) {
            newSelected.delete(gameId);
        } else {
            newSelected.add(gameId);
        }
        setSelectedGames(newSelected);
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="glass-panel rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col p-8 relative overflow-hidden"
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Background Gradient */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-secondary/10 to-transparent rounded-full blur-3xl" />

                        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors z-10">
                            <X size={20} />
                        </button>

                        <div className="relative flex-1 flex flex-col overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-gradient-to-br from-secondary/20 to-secondary/5 rounded-xl">
                                        <Calculator className="text-secondary" size={28} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-white">Portfolio Kelly Calculator</h3>
                                        <p className="text-sm text-zinc-400">Select games to calculate optimal bet sizing</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    {/* Kelly Multiplier Slider */}
                                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 w-64">
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                                Kelly Fraction
                                            </label>
                                            <span className="text-xs font-mono font-bold text-secondary">
                                                {kellyMultiplier.toFixed(2)}x
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0.1"
                                            max="1.0"
                                            step="0.05"
                                            value={kellyMultiplier}
                                            onChange={(e) => setKellyMultiplier(Number(e.target.value))}
                                            className="w-full accent-secondary"
                                        />
                                    </div>

                                    {/* Bankroll Input */}
                                    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
                                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">
                                            Total Bankroll
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-lg">$</span>
                                            <input
                                                type="number"
                                                value={bankroll}
                                                onChange={e => setBankroll(Number(e.target.value))}
                                                className="w-40 bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-secondary/50"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Portfolio Summary */}
                            {selectedGames.size > 0 && (
                                <motion.div
                                    className="grid grid-cols-4 gap-4 mb-6"
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
                                        <div className="text-xs text-blue-400 uppercase tracking-widest mb-1 font-bold">Selected</div>
                                        <div className="text-3xl font-bold text-white">{selectedGames.size}</div>
                                        <div className="text-xs text-zinc-500">games</div>
                                    </div>

                                    <div className="bg-gradient-to-br from-secondary/10 to-secondary/5 border border-secondary/20 rounded-xl p-4">
                                        <div className="text-xs text-secondary uppercase tracking-widest mb-1 font-bold">Total Kelly</div>
                                        <div className="text-3xl font-bold text-white">{animatedTotalKelly.toFixed(1)}%</div>
                                        <div className="text-xs text-zinc-500">of bankroll</div>
                                    </div>

                                    <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
                                        <div className="text-xs text-emerald-400 uppercase tracking-widest mb-1 font-bold">Total Bet</div>
                                        <div className="text-3xl font-bold text-emerald-400">${animatedTotalBet.toFixed(0)}</div>
                                        <div className="text-xs text-zinc-500">recommended</div>
                                    </div>

                                    <div className={cn(
                                        "bg-gradient-to-br border rounded-xl p-4",
                                        totalExpectedValue >= 0
                                            ? "from-purple-500/10 to-purple-600/5 border-purple-500/20"
                                            : "from-rose-500/10 to-rose-600/5 border-rose-500/20"
                                    )}>
                                        <div className={cn(
                                            "text-xs uppercase tracking-widest mb-1 font-bold",
                                            totalExpectedValue >= 0 ? "text-purple-400" : "text-rose-400"
                                        )}>Expected Value</div>
                                        <div className={cn(
                                            "text-3xl font-bold",
                                            totalExpectedValue >= 0 ? "text-purple-400" : "text-rose-400"
                                        )}>
                                            {totalExpectedValue >= 0 ? '+' : ''}${animatedExpectedReturn.toFixed(0)}
                                        </div>
                                        <div className="text-xs text-zinc-500">
                                            {totalEdge >= 0 ? '+' : ''}{(totalEdge * 100).toFixed(1)}% edge
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Game Selection Grid */}
                            <div className="flex-1 overflow-hidden flex flex-col">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                                        Available Games ({games.length})
                                    </h4>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setSelectedGames(new Set(games.map(g => g.game_id)))}
                                            className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            onClick={() => setSelectedGames(new Set())}
                                            className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-3 pr-2">
                                    {games.map((game, index) => {
                                        const isSelected = selectedGames.has(game.game_id);
                                        const p = game.prediction.stat_model_prob;
                                        const price = (game.market_data?.price ?? 50) / 100;
                                        const edge = p - price;
                                        const hasEdge = edge > 0;

                                        return (
                                            <motion.div
                                                key={game.game_id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.02 }}
                                                onClick={() => toggleGame(game.game_id)}
                                                className={cn(
                                                    "relative p-4 rounded-xl border-2 cursor-pointer transition-all group",
                                                    isSelected
                                                        ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20"
                                                        : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-800/50"
                                                )}
                                            >
                                                {/* Selection Indicator */}
                                                <div className={cn(
                                                    "absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                                                    isSelected
                                                        ? "border-emerald-500 bg-emerald-500"
                                                        : "border-zinc-600 bg-transparent group-hover:border-zinc-500"
                                                )}>
                                                    {isSelected && (
                                                        <motion.svg
                                                            className="w-3 h-3 text-white"
                                                            fill="none"
                                                            viewBox="0 0 24 24"
                                                            stroke="currentColor"
                                                            initial={{ scale: 0 }}
                                                            animate={{ scale: 1 }}
                                                        >
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </motion.svg>
                                                    )}
                                                </div>

                                                {/* Game Info */}
                                                <div className="mb-3 pr-8">
                                                    <div className="text-sm font-bold text-white mb-1">
                                                        {game.away_abbr} @ {game.home_abbr}
                                                    </div>
                                                    <div className="text-xs text-zinc-500">
                                                        {game.away_team} @ {game.home_team}
                                                    </div>
                                                </div>

                                                {/* Metrics */}
                                                <div className="grid grid-cols-3 gap-2 text-xs">
                                                    <div>
                                                        <div className="text-zinc-500 mb-1">Edge</div>
                                                        <div className={cn(
                                                            "font-bold",
                                                            hasEdge ? "text-emerald-400" : "text-rose-400"
                                                        )}>
                                                            {hasEdge ? '+' : ''}{(edge * 100).toFixed(1)}%
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-500 mb-1">Model</div>
                                                        <div className="font-bold text-white">
                                                            {(p * 100).toFixed(0)}%
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-zinc-500 mb-1">Market</div>
                                                        <div className="font-bold text-white">
                                                            {(price * 100).toFixed(0)}¢
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Confidence Badge */}
                                                <div className="mt-3">
                                                    <span className={cn(
                                                        "px-2 py-1 rounded text-xs font-bold",
                                                        game.prediction.confidence_score === 'HIGH' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                                            game.prediction.confidence_score === 'MEDIUM' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                                                "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30"
                                                    )}>
                                                        {game.prediction.confidence_score}
                                                    </span>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Selected Games Breakdown */}
                            {selectedGames.size > 0 && (
                                <motion.div
                                    className="mt-6 bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <div className="p-4 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
                                        <span className="text-sm font-bold text-white uppercase tracking-wider">
                                            Recommended Bets
                                        </span>
                                        <span className="text-xs text-zinc-500">
                                            {selectedGames.size} positions
                                        </span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-xs text-zinc-600 bg-zinc-900/50 sticky top-0">
                                                <tr>
                                                    <th className="p-3">Game</th>
                                                    <th className="p-3">Edge</th>
                                                    <th className="p-3">Kelly %</th>
                                                    <th className="p-3 text-right">Bet Size</th>
                                                    <th className="p-3 text-right">Expected Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-zinc-800/50">
                                                {portfolioGames.map((pg, index) => (
                                                    <motion.tr
                                                        key={pg.game.game_id}
                                                        className="hover:bg-zinc-800/30"
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                    >
                                                        <td className="p-3 font-medium text-white">
                                                            {pg.game.away_abbr} @ {pg.game.home_abbr}
                                                        </td>
                                                        <td className={cn(
                                                            "p-3 font-mono font-bold",
                                                            pg.edge >= 0 ? "text-emerald-400" : "text-rose-400"
                                                        )}>
                                                            {pg.edge >= 0 ? '+' : ''}{(pg.edge * 100).toFixed(1)}%
                                                        </td>
                                                        <td className="p-3 font-mono text-secondary">
                                                            {(pg.kellyFraction * 100).toFixed(1)}%
                                                        </td>
                                                        <td className="p-3 text-right font-mono font-bold text-white">
                                                            ${pg.recommendedBet.toFixed(0)}
                                                        </td>
                                                        <td className={cn(
                                                            "p-3 text-right font-mono font-bold",
                                                            pg.expectedValue >= 0 ? "text-emerald-400" : "text-rose-400"
                                                        )}>
                                                            {pg.expectedValue >= 0 ? '+' : ''}${pg.expectedValue.toFixed(2)}
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </motion.div>
                            )}
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
    const [showLicenseInfo, setShowLicenseInfo] = useState(false);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'live_games' | 'completed' | 'market_feed' | 'trading_desk'>('upcoming');

    // Filter Logic
    const filteredGames = React.useMemo(() => games.filter(game => {
        if (minConfidence === "HIGH" && game.prediction.confidence_score !== "HIGH") return false;
        if (minConfidence === "MEDIUM" && game.prediction.confidence_score === "LOW") return false;

        // Status Filter
        const isFinal = game.status?.toLowerCase().includes('final');
        const isLive = !isFinal && (
            game.status?.toLowerCase().includes('live') ||
            game.status?.toLowerCase().includes('in progress') ||
            (game.status?.includes('Q') && !game.status.includes('PM') && !game.status.includes('AM')) ||
            (game.status?.includes('Half'))
        );
        const isUpcoming = !isFinal && !isLive;

        if (activeTab === 'upcoming' && !isUpcoming) return false;
        if (activeTab === 'live_games' && !isLive) return false;
        if (activeTab === 'completed' && !isFinal) return false;

        return true;
    }), [games, minConfidence, activeTab]);

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

                        <button onClick={() => setShowLicenseInfo(true)} className="p-2 text-zinc-400 hover:text-white transition-colors" title="License Info">
                            <Shield size={20} />
                        </button>
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
                            { id: 'upcoming', label: 'Upcoming', icon: Calendar },
                            { id: 'live_games', label: 'Live Games', icon: Activity },
                            { id: 'completed', label: 'Completed', icon: CheckCircle },
                            { id: 'market_feed', label: 'Market Feed', icon: LayoutDashboard },
                            { id: 'trading_desk', label: 'Trading Desk', icon: DollarSign },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
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
                {activeTab === 'trading_desk' ? (
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-20">
                            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                        </div>
                    }>
                        <TradingTerminal games={games.filter(g => g.market_ticker)} />
                    </Suspense>
                ) : activeTab === 'market_feed' ? (
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
                                    <h2 className="text-2xl font-bold text-white">
                                        {activeTab === 'upcoming' ? 'Upcoming Matchups' :
                                            activeTab === 'live_games' ? 'Live Games' :
                                                activeTab === 'completed' ? 'Completed Games' : 'Games'}
                                    </h2>
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
            <RiskCalculatorModal open={showRiskCalc} onClose={() => setShowRiskCalc(false)} games={games} />
            <LicenseInfoModal isOpen={showLicenseInfo} onClose={() => setShowLicenseInfo(false)} />

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

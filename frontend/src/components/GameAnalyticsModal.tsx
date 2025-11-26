import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    X, TrendingUp, Activity, BarChart3, Brain, Target, Zap,
    Calendar, DollarSign, Cloud, Wind, Thermometer, UserMinus, AlertCircle,
    Newspaper, Users, Sparkles
} from 'lucide-react';
import {
    ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import type { Game } from '../lib/api';
import { useGameContext } from '../contexts/GameContext';
import { useDataStore } from '../lib/store';
import { cn } from './ui/shared';
import MarketAnalysisPanel from './MarketAnalysisPanel';

interface GameAnalyticsModalProps {
    game: Game;
    onClose: () => void;
    loading?: boolean;
}

const GameAnalyticsModal: React.FC<GameAnalyticsModalProps> = ({ game, onClose, loading = false }) => {
    const { prediction, analytics, market_data } = game;
    const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'context' | 'charts' | 'market'>('overview');
    const { getMarketContext, contextLoading, contextError } = useGameContext();

    // Use Zustand store with proper subscription to make contextData reactive
    const contextData = useDataStore((state) => state.marketContexts[game.game_id]?.data || null);

    useEffect(() => {
        // When context tab is active and we don't have data and we're not already loading
        if (activeTab === 'context' && !contextData && !contextLoading) {
            // Fetch context data
            getMarketContext(game.game_id, game);
        }
    }, [activeTab, game.game_id, contextData, contextLoading, getMarketContext, game]);

    const handleRetryContext = () => {
        getMarketContext(game.game_id, game);
    };

    const recommendationColor =
        prediction.recommendation.includes("Follow") ? "text-emerald-400" :
            prediction.recommendation.includes("Fade") ? "text-amber-400" :
                "text-zinc-400";

    const formattedDate = game.game_date ? new Date(game.game_date).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'TBD';

    // Check if we have real market data (not just a default 0.5)
    // The backend defaults to 0.5 when there's no market data
    // Real market data exists if volume > 0 OR (volume is 0 but prob is not exactly 0.5)
    const rawMarketProb = prediction.home_kalshi_prob ?? prediction.kalshi_prob;
    const hasRealMarketData = market_data.volume > 0 ||
        (rawMarketProb !== undefined && rawMarketProb !== 0.5);

    // Only use market probability if we have real market data, otherwise use model prob
    const marketProb = hasRealMarketData && rawMarketProb !== undefined
        ? rawMarketProb
        : prediction.home_win_prob; // Fallback to model if no real market data

    const dislocation = ((prediction.home_win_prob - marketProb) * 100).toFixed(1);
    const formatCents = (value?: number | null) => typeof value === 'number' ? `${(value * 100).toFixed(1)}¢` : '—';
    const formatDollars = (value?: number | null) => typeof value === 'number' ? `$${value.toLocaleString()}` : '—';

    const probabilityBreakdown = [
        { label: `${game.home_abbr} stats`, value: prediction.stat_model_prob, tone: 'from-blue-500/60 to-blue-400/30' },
        { label: `${game.home_abbr} ensemble`, value: prediction.stat_ensemble_prob ?? 0.5, tone: 'from-purple-500/60 to-purple-400/30' },
        { label: `${game.home_abbr} blended`, value: prediction.home_win_prob, tone: 'from-emerald-500/70 to-emerald-400/30' },
        { label: `${game.home_abbr} market`, value: marketProb, tone: 'from-zinc-500/60 to-zinc-400/20' },
    ];

    const marketSnapshot = [
        { label: 'Mid price', value: formatCents(market_data.price) },
        { label: 'YES bid', value: formatCents(market_data.yes_bid) },
        { label: 'YES ask', value: formatCents(market_data.yes_ask) },
        { label: 'Volume', value: formatDollars(market_data.volume) },
    ];

    // Factor cards data (available for future use)
    // const factorCards = [
    //     { label: 'Home record', value: factors?.home_record ?? '—' },
    //     { label: 'Away record', value: factors?.away_record ?? '—' },
    //     { label: 'Market trend', value: factors?.market_trend ?? 'Neutral' },
    //     { label: 'Liquidity', value: formatDollars(factors?.market_volume) },
    // ];

    const renderOverview = () => (
        <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Probability */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Target size={12} className="text-primary" />
                    Probability breakdown
                </h3>
                <div className="space-y-3">
                    {probabilityBreakdown.map((row) => (
                        <div key={row.label}>
                            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                                <span className="uppercase tracking-widest">{row.label}</span>
                                <span className="font-mono text-white">{(row.value * 100).toFixed(1)}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                                <div
                                    style={{ width: `${Math.min(Math.max(row.value, 0), 1) * 100}%` }}
                                    className={cn("h-full bg-gradient-to-r", row.tone)}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Market Snapshot */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <DollarSign size={12} className="text-emerald-400" />
                    Market snapshot
                </h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {marketSnapshot.map((stat) => (
                        <div key={stat.label} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                            <p className="text-[10px] uppercase tracking-widest text-zinc-500">{stat.label}</p>
                            <p className="text-sm font-semibold text-white">{stat.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Analytics */}
            {analytics && (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap size={12} className="text-amber-400" />
                            Insights
                        </h3>
                        <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4 max-h-60 overflow-y-auto">
                            <ul className="space-y-3 text-xs text-zinc-300">
                                {((analytics?.reasoning) ?? []).length > 0 ? (analytics?.reasoning ?? []).map((reason, idx) => (
                                    <li key={idx} className="flex gap-2">
                                        <div className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5" />
                                        <span>{reason}</span>
                                    </li>
                                )) : (
                                    <li className="text-zinc-500 italic">Model did not surface any notable callouts.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <BarChart3 size={12} className="text-blue-400" />
                            Model weights
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(analytics.model_features || {}).map(([key, value]) => {
                                // Convert normalized values (-1 to 1) to percentage impact
                                // For display, show as percentage points contribution
                                const displayValue = typeof value === 'number' ? value * 100 : 0;
                                return (
                                    <div key={key} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
                                        <p className="text-[11px] text-zinc-400 capitalize">{key.replace(/_/g, ' ')}</p>
                                        <p className={cn("text-base font-semibold font-mono", displayValue >= 0 ? "text-emerald-300" : "text-rose-300")}>
                                            {displayValue >= 0 ? '+' : ''}{displayValue.toFixed(1)}%
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-400">
                            <div className="flex items-center justify-between">
                                <span>Market pressure</span>
                                <span className="text-white font-semibold">{analytics.market_pressure}</span>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <span>Volatility regime</span>
                                <span className="text-white font-semibold">{analytics.volatility_score}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    const renderInsights = () => {
        const insights = analytics?.insights || [];
        const eloRatings = analytics?.elo_ratings;
        const recentForm = analytics?.recent_form;
        const headToHead = analytics?.head_to_head;
        const modelWeights = analytics?.model_weights;

        if (insights.length === 0 && !eloRatings && !recentForm) {
            return (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500 space-y-4">
                    <Brain size={48} className="text-zinc-800" />
                    <p className="text-sm">No insights available yet</p>
                </div>
            );
        }

        return (
            <div className="space-y-5 md:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Smart Bet Recommendation */}
                {game?.prediction?.suggested_wager && (
                    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                            <Sparkles size={80} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Sparkles size={12} />
                                    Smart Bet Recommendation
                                </h3>
                                <span className={cn(
                                    "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase border",
                                    game.prediction.signal_strength === 'STRONG' ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                        game.prediction.signal_strength === 'MODERATE' ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                                            "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                                )}>
                                    {game.prediction.signal_strength} Confidence
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <div>
                                    <p className="text-xs text-zinc-400 mb-1 font-medium">Predicted Winner</p>
                                    <p className="text-lg font-bold text-white tracking-tight">{game.prediction.predicted_winner || 'Toss Up'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-zinc-400 mb-1 font-medium">Smart Bet</p>
                                    <p className="text-lg font-bold text-emerald-400 tracking-tight">{game.prediction.recommendation}</p>
                                    <p className="text-xs font-mono text-zinc-500 mt-0.5">{game.prediction.suggested_wager}</p>
                                </div>
                            </div>
                            {game.prediction.value_proposition && (
                                <div className="mt-3 pt-3 border-t border-indigo-500/20">
                                    <p className="text-xs text-indigo-300/80 leading-relaxed">
                                        <span className="font-semibold text-indigo-300">Why? </span>
                                        {game.prediction.value_proposition}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* Key Insights */}
                {insights.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap size={12} className="text-primary" />
                            Actionable Insights
                        </h3>
                        <div className="space-y-3">
                            {insights.map((insight, idx) => (
                                <div
                                    key={idx}
                                    className={cn(
                                        "rounded-2xl border p-4 transition-all",
                                        insight.priority >= 8 ? "border-emerald-500/30 bg-emerald-500/5" :
                                            insight.priority >= 6 ? "border-amber-500/30 bg-amber-500/5" :
                                                "border-zinc-800 bg-zinc-900/40"
                                    )}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-bold text-white">{insight.title}</span>
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                                    insight.confidence === 'HIGH' ? "bg-emerald-500/20 text-emerald-400" :
                                                        insight.confidence === 'MEDIUM' ? "bg-amber-500/20 text-amber-400" :
                                                            "bg-zinc-500/20 text-zinc-400"
                                                )}>
                                                    {insight.confidence}
                                                </span>
                                            </div>
                                            <p className="text-xs text-zinc-400 mb-2">{insight.description}</p>
                                            <p className="text-xs text-emerald-400 font-medium">→ {insight.action}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Enhanced Analytics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Elo Ratings */}
                    {eloRatings && (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                                Elo Ratings
                            </h3>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Home ({game.home_abbr})</span>
                                    <span className="text-white font-mono">{eloRatings.home.toFixed(0)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-zinc-400">Away ({game.away_abbr})</span>
                                    <span className="text-white font-mono">{eloRatings.away.toFixed(0)}</span>
                                </div>
                                <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm">
                                    <span className="text-zinc-400">Difference</span>
                                    <span className={cn(
                                        "font-mono font-bold",
                                        eloRatings.difference > 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {eloRatings.difference > 0 ? '+' : ''}{eloRatings.difference.toFixed(0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Form */}
                    {recentForm && (
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                                Recent Form (Last 5 Games)
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { team: game.home_abbr, form: recentForm.home, label: 'Home' },
                                    { team: game.away_abbr, form: recentForm.away, label: 'Away' }
                                ].map((side, idx) => (
                                    <div key={idx} className="pb-3 border-b border-zinc-800 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-zinc-400">{side.label}</span>
                                            <span className={cn(
                                                "text-xs font-bold px-2 py-0.5 rounded",
                                                side.form.strength === 'STRONG' ? "bg-emerald-500/20 text-emerald-400" :
                                                    side.form.strength === 'GOOD' ? "bg-blue-500/20 text-blue-400" :
                                                        side.form.strength === 'WEAK' ? "bg-rose-500/20 text-rose-400" :
                                                            "bg-zinc-500/20 text-zinc-400"
                                            )}>
                                                {side.form.strength}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div>
                                                <span className="text-zinc-500">Win %: </span>
                                                <span className="text-white font-mono">{(side.form.win_pct * 100).toFixed(0)}%</span>
                                            </div>
                                            <div>
                                                <span className="text-zinc-500">Avg Margin: </span>
                                                <span className={cn(
                                                    "font-mono",
                                                    side.form.avg_point_diff > 0 ? "text-emerald-400" : "text-rose-400"
                                                )}>
                                                    {side.form.avg_point_diff > 0 ? '+' : ''}{side.form.avg_point_diff.toFixed(1)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Head-to-Head */}
                {headToHead && headToHead.games_played > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                            Head-to-Head History
                        </h3>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Record</span>
                                <span className="text-white font-mono">
                                    {game.home_abbr} {headToHead.home_wins}-{headToHead.away_wins} {game.away_abbr}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Home Win %</span>
                                <span className="text-white font-mono">{(headToHead.home_win_pct * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400">Avg Point Diff</span>
                                <span className={cn(
                                    "font-mono",
                                    headToHead.avg_point_diff > 0 ? "text-emerald-400" : "text-rose-400"
                                )}>
                                    {headToHead.avg_point_diff > 0 ? '+' : ''}{headToHead.avg_point_diff.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Model Weights */}
                {modelWeights && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
                            Model Weights
                        </h3>
                        <div className="space-y-2">
                            {Object.entries(modelWeights).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400 capitalize">{key}</span>
                                    <div className="flex items-center gap-2 flex-1 mx-3">
                                        <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                style={{ width: `${value * 100}%` }}
                                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                            />
                                        </div>
                                        <span className="text-xs text-white font-mono w-12 text-right">
                                            {(value * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    const renderContext = () => {
        if (contextLoading) {
            return (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-xs">
                    <div className="flex items-center mb-2">
                        <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin mr-2" />
                        Fetching environmental data...
                    </div>
                    <div className="text-[10px] text-zinc-600 mt-2">This may take up to 30 seconds</div>
                </div>
            );
        }

        if (contextError) {
            return (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-xs">
                    <div className="text-rose-400 mb-3">{contextError}</div>
                    <button
                        onClick={handleRetryContext}
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                    >
                        Retry
                    </button>
                </div>
            );
        }

        if (!contextData) {
            return (
                <div className="flex flex-col items-center justify-center h-40 text-zinc-500 text-xs">
                    <div className="mb-3">No context data available</div>
                    <button
                        onClick={handleRetryContext}
                        className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-xs font-medium transition-colors"
                    >
                        Load Context
                    </button>
                </div>
            );
        }

        return (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Weather */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <Cloud size={12} className="text-blue-300" />
                        Weather Conditions in {contextData.weather?.location || 'Unknown'}
                    </h3>
                    {contextData.weather && (
                        <>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="flex flex-col items-center p-3 bg-zinc-900/50 rounded-xl">
                                    <Thermometer size={20} className="text-amber-400 mb-2" />
                                    <span className="text-lg font-bold text-white">{contextData.weather.temperature}°F</span>
                                    <span className="text-[10px] text-zinc-500 uppercase">Temperature</span>
                                </div>
                                <div className="flex flex-col items-center p-3 bg-zinc-900/50 rounded-xl">
                                    <Cloud size={20} className="text-zinc-400 mb-2" />
                                    <span className="text-lg font-bold text-white">{contextData.weather.condition}</span>
                                    <span className="text-[10px] text-zinc-500 uppercase">Conditions</span>
                                </div>
                                <div className="flex flex-col items-center p-3 bg-zinc-900/50 rounded-xl">
                                    <Wind size={20} className="text-cyan-400 mb-2" />
                                    <span className="text-lg font-bold text-white">{contextData.weather.wind_speed}</span>
                                    <span className="text-[10px] text-zinc-500 uppercase">Wind</span>
                                </div>
                            </div>

                            {/* Weather Correlation Impact */}
                            {contextData.weather.correlation_impact && (
                                <div className={cn(
                                    "rounded-2xl border p-4 mt-4",
                                    contextData.weather.correlation_impact.severity === 'HIGH' ? "border-amber-500/30 bg-amber-500/5" :
                                        contextData.weather.correlation_impact.severity === 'MEDIUM' ? "border-blue-500/30 bg-blue-500/5" :
                                            "border-zinc-800 bg-zinc-900/40"
                                )}>
                                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <AlertCircle size={12} className="text-amber-400" />
                                        Weather Impact Analysis
                                    </h3>
                                    <p className="text-xs text-zinc-300 mb-2">{contextData.weather.correlation_impact.note}</p>
                                    {Array.isArray(contextData.weather.correlation_impact.factors) && contextData.weather.correlation_impact.factors.length > 0 && (
                                        <div className="space-y-1">
                                            {contextData.weather.correlation_impact.factors.map((factor, idx) => (
                                                <div key={idx} className="text-xs text-zinc-400 flex items-start gap-2">
                                                    <span className="text-emerald-400 mt-0.5">•</span>
                                                    <span>{factor}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Enhanced Injury Analysis (Gemini) */}
                {contextData.injury_analysis && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                            <UserMinus size={12} className="text-rose-400" />
                            Injury Impact Analysis
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { team: game.home_abbr, impact: contextData.injury_analysis.home_impact, raw: contextData.injuries?.home },
                                    { team: game.away_abbr, impact: contextData.injury_analysis.away_impact, raw: contextData.injuries?.away }
                                ].map((side, idx) => (
                                    <div key={idx} className={cn(
                                        "p-3 rounded-xl border flex flex-col h-full",
                                        side.impact?.severity === 'CRITICAL' ? "border-rose-500/30 bg-rose-500/5" :
                                            side.impact?.severity === 'HIGH' ? "border-amber-500/30 bg-amber-500/5" :
                                                "border-zinc-800 bg-zinc-900/50"
                                    )}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-xs font-bold text-zinc-300">{side.team}</span>
                                            <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                                                side.impact?.severity === 'CRITICAL' ? "bg-rose-500/20 text-rose-400" :
                                                    side.impact?.severity === 'HIGH' ? "bg-amber-500/20 text-amber-400" :
                                                        "bg-zinc-500/20 text-zinc-400"
                                            )}>
                                                {side.impact?.severity || 'UNKNOWN'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-zinc-400 mb-2">{side.impact?.summary || 'No impact analysis available'}</p>

                                        {/* Key Players Out */}
                                        {side.impact?.key_players_out && side.impact.key_players_out.length > 0 && (
                                            <div className="mb-3">
                                                <div className="text-[10px] text-rose-400 font-semibold mb-1">Key Players Out:</div>
                                                <div className="flex flex-wrap gap-1">
                                                    {side.impact.key_players_out.map((p: any, i: number) => (
                                                        <span key={i} className="text-[10px] px-1.5 py-0.5 bg-rose-500/10 text-rose-300 rounded border border-rose-500/20">
                                                            {p.name} ({p.position})
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Full Injury List */}
                                        {side.raw && side.raw.length > 0 && (
                                            <div className="mt-auto pt-2 border-t border-zinc-800/50">
                                                <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5">Full Report ({side.raw.length})</div>
                                                <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                                                    {side.raw.map((injury: any, i: number) => (
                                                        <div key={i} className="flex items-center justify-between text-[10px] bg-black/20 p-1.5 rounded">
                                                            <span className="text-zinc-300 truncate max-w-[120px]" title={injury.player_name}>
                                                                {injury.player_name} <span className="text-zinc-500">({injury.position})</span>
                                                            </span>
                                                            <span className={cn(
                                                                "px-1.5 rounded text-[9px] font-medium",
                                                                injury.status.toUpperCase() === 'OUT' ? "bg-rose-500/20 text-rose-400" :
                                                                    injury.status.toUpperCase().includes('DOUBT') ? "bg-orange-500/20 text-orange-400" :
                                                                        injury.status.toUpperCase().includes('QUEST') ? "bg-amber-500/20 text-amber-400" :
                                                                            "bg-zinc-500/20 text-zinc-400"
                                                            )}>
                                                                {injury.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {contextData.injury_analysis.matchup_implication && (
                                <div className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                    <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Matchup Implication</div>
                                    <p className="text-xs text-zinc-300">{contextData.injury_analysis.matchup_implication}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Recent Form (Context) */}
                {analytics?.recent_form && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                            <Activity size={12} className="text-blue-400" />
                            Recent Form Context
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { team: game.home_abbr, form: analytics.recent_form.home, label: 'Home' },
                                { team: game.away_abbr, form: analytics.recent_form.away, label: 'Away' }
                            ].map((side, idx) => (
                                <div key={idx} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-zinc-300">{side.label} ({side.team})</span>
                                        <span className={cn(
                                            "text-[10px] px-2 py-0.5 rounded font-medium",
                                            side.form.strength === 'STRONG' ? "bg-emerald-500/20 text-emerald-400" :
                                                side.form.strength === 'GOOD' ? "bg-blue-500/20 text-blue-400" :
                                                    side.form.strength === 'WEAK' ? "bg-rose-500/20 text-rose-400" :
                                                        "bg-zinc-500/20 text-zinc-400"
                                        )}>
                                            {side.form.strength} FORM
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="bg-black/20 p-2 rounded">
                                            <div className="text-zinc-500 text-[10px] mb-0.5">Win Rate</div>
                                            <div className="text-white font-mono">{(side.form.win_pct * 100).toFixed(0)}%</div>
                                        </div>
                                        <div className="bg-black/20 p-2 rounded">
                                            <div className="text-zinc-500 text-[10px] mb-0.5">Avg Margin</div>
                                            <div className={cn(
                                                "font-mono",
                                                side.form.avg_point_diff > 0 ? "text-emerald-400" : "text-rose-400"
                                            )}>
                                                {side.form.avg_point_diff > 0 ? '+' : ''}{side.form.avg_point_diff.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Betting Intelligence */}
                {Array.isArray(contextData.betting_intelligence) && contextData.betting_intelligence.length > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                            <TrendingUp size={12} className="text-emerald-400" />
                            Betting Intelligence
                        </h3>
                        <div className="space-y-2">
                            {contextData.betting_intelligence.map((item, idx) => (
                                <div key={idx} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{item.type.replace(/_/g, ' ')}</span>
                                        <span className={cn("text-[10px] font-bold",
                                            item.impact === 'HIGH' ? "text-emerald-400" :
                                                item.impact === 'MEDIUM' ? "text-amber-400" : "text-zinc-500"
                                        )}>{item.impact} Impact</span>
                                    </div>
                                    <p className="text-xs text-zinc-300">{item.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}



                {/* Expert Predictions */}
                {Array.isArray(contextData.expert_predictions) && contextData.expert_predictions.length > 0 && (
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                            <Users size={12} className="text-amber-400" />
                            Expert Picks
                        </h3>
                        <div className="space-y-2">
                            {contextData.expert_predictions.map((pick, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                                    <div>
                                        <div className="text-xs font-bold text-white">{pick.expert} <span className="text-zinc-500 font-normal">({pick.outlet})</span></div>
                                        <div className="text-xs text-emerald-400 mt-0.5">{pick.prediction}</div>
                                    </div>
                                    <div className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium",
                                        pick.confidence === 'HIGH' ? "bg-emerald-500/20 text-emerald-400" :
                                            pick.confidence === 'MEDIUM' ? "bg-amber-500/20 text-amber-400" :
                                                "bg-zinc-500/20 text-zinc-400"
                                    )}>
                                        {pick.confidence}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* News */}
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                        <Newspaper size={12} className="text-purple-400" />
                        Latest Intelligence
                    </h3>
                    <div className="space-y-2">
                        {Array.isArray(contextData.news) && contextData.news.map((item, idx) => (
                            <a
                                key={idx}
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors cursor-pointer group"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="text-sm text-zinc-300 font-medium group-hover:text-white transition-colors">{item.headline}</div>
                                    <div className={cn("text-[10px] px-1.5 py-0.5 rounded ml-2 whitespace-nowrap",
                                        item.sentiment === 'POSITIVE' ? "bg-emerald-500/10 text-emerald-400" :
                                            item.sentiment === 'NEGATIVE' ? "bg-rose-500/10 text-rose-400" :
                                                "bg-zinc-500/10 text-zinc-500"
                                    )}>{item.sentiment}</div>
                                </div>
                                <div className="text-[10px] text-zinc-600 mt-1">{item.source}</div>
                            </a>
                        ))}
                        {(!Array.isArray(contextData.news) || contextData.news.length === 0) && (
                            <div className="text-center text-zinc-500 py-4 text-xs italic">No recent news found</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderCharts = () => {
        // Probability comparison data
        const probabilityData = [
            { name: 'Blended', value: prediction.home_win_prob * 100, color: '#3b82f6' },
            { name: 'Market', value: marketProb * 100, color: '#71717a' },
            { name: 'Stats', value: prediction.stat_model_prob * 100, color: '#10b981' },
            { name: 'Ensemble', value: (prediction.stat_ensemble_prob ?? 0.5) * 100, color: '#8b5cf6' },
        ];

        // Model weights data
        const modelWeightsData = analytics?.model_weights ? Object.entries(analytics.model_weights).map(([key, value]) => ({
            name: key.toUpperCase(),
            value: value * 100,
            fullName: key === 'stats' ? 'Statistics' : key === 'ml' || key === 'stat_ensemble' ? 'Stat Ensemble' : key === 'elo' ? 'Elo Rating' : key === 'form' ? 'Recent Form' : 'Kalshi Market'
        })) : [];

        // Market depth data
        const marketDepthData = [
            { name: 'Bid', value: market_data.yes_bid * 100, type: 'Bid' },
            { name: 'Mid', value: market_data.price * 100, type: 'Mid' },
            { name: 'Ask', value: market_data.yes_ask * 100, type: 'Ask' },
        ];

        // Elo comparison data
        const eloData = analytics?.elo_ratings ? [
            { team: game.home_abbr, rating: analytics.elo_ratings.home },
            { team: game.away_abbr, rating: analytics.elo_ratings.away },
        ] : [];

        // Recent form data
        const formData = analytics?.recent_form ? [
            {
                name: 'Win %',
                [game.home_abbr]: analytics.recent_form.home.win_pct * 100,
                [game.away_abbr]: analytics.recent_form.away.win_pct * 100,
            },
            {
                name: 'Avg Margin',
                [game.home_abbr]: analytics.recent_form.home.avg_point_diff,
                [game.away_abbr]: analytics.recent_form.away.avg_point_diff,
            },
        ] : [];

        // Model features radar data
        const radarData = analytics?.model_features ? [
            { feature: 'Home\nAdvantage', value: (analytics.model_features.home_advantage + 1) * 50 },
            { feature: 'Record\nDiff', value: (analytics.model_features.record_diff + 1) * 50 },
            { feature: 'Recent\nForm', value: (analytics.model_features.recent_form + 1) * 50 },
            { feature: 'Injury\nImpact', value: ((analytics.model_features.injury_impact || 0) + 1) * 50 },
        ] : [];

        const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

        const CustomTooltip = ({ active, payload, label }: any) => {
            if (active && payload && payload.length) {
                return (
                    <div className="bg-zinc-900/95 border border-zinc-700 p-3 rounded-lg shadow-xl backdrop-blur-md">
                        <p className="font-bold text-white mb-2">{label}</p>
                        {payload.map((p: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs mb-1">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></div>
                                <span className="text-zinc-400">{p.name}:</span>
                                <span className="font-mono font-medium text-white">
                                    {typeof p.value === 'number'
                                        ? p.name.includes('Margin') || p.name.includes('Diff')
                                            ? `${p.value > 0 ? '+' : ''}${p.value.toFixed(1)}`
                                            : `${p.value.toFixed(1)}%`
                                        : p.value
                                    }
                                </span>
                            </div>
                        ))}
                    </div>
                );
            }
            return null;
        };

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Probability Comparison */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Target size={12} className="text-primary" />
                        Probability Comparison
                    </h3>
                    <div className="h-64 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4 chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={probabilityData} margin={{ top: 15, right: 15, bottom: 5, left: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#71717a"
                                    tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#71717a"
                                    tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                    tickLine={false}
                                    domain={[0, 100]}
                                    unit="%"
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {probabilityData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Model Weights */}
                {modelWeightsData.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Brain size={12} className="text-blue-400" />
                            Model Component Weights
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="h-64 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={modelWeightsData}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, value }) => `${name}: ${value.toFixed(0)}%`}
                                            outerRadius={80}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {modelWeightsData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 overflow-y-auto max-h-64">
                                {modelWeightsData.map((item, idx) => (
                                    <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-zinc-400 capitalize">{item.fullName}</span>
                                            <span className="text-sm font-mono font-semibold text-white">{item.value.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                            <div
                                                style={{
                                                    width: `${item.value}%`,
                                                    backgroundColor: COLORS[idx % COLORS.length]
                                                }}
                                                className="h-full"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Market Depth */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <DollarSign size={12} className="text-emerald-400" />
                        Market Depth
                    </h3>
                    <div className="h-48 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={marketDepthData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#71717a"
                                    tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    stroke="#71717a"
                                    tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                    tickLine={false}
                                    domain={[0, 100]}
                                    unit="¢"
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                                    {marketDepthData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.type === 'Bid' ? '#ef4444' : entry.type === 'Ask' ? '#10b981' : '#71717a'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-zinc-500">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-500" />
                            <span>Bid: {formatCents(market_data.yes_bid)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-zinc-500" />
                            <span>Mid: {formatCents(market_data.price)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-emerald-500" />
                            <span>Ask: {formatCents(market_data.yes_ask)}</span>
                        </div>
                        <div className="ml-auto text-zinc-400">
                            Spread: {formatCents((market_data.yes_ask - market_data.yes_bid))}
                        </div>
                    </div>
                </div>

                {/* Elo Ratings Comparison */}
                {eloData.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity size={12} className="text-purple-400" />
                            Elo Ratings Comparison
                        </h3>
                        <div className="h-48 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={eloData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis
                                        dataKey="team"
                                        stroke="#71717a"
                                        tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                        tickLine={false}
                                        domain={['dataMin - 50', 'dataMax + 50']}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Bar dataKey="rating" radius={[8, 8, 0, 0]}>
                                        {eloData.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={index === 0 ? '#3b82f6' : '#ef4444'}
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Recent Form Comparison */}
                {formData.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <TrendingUp size={12} className="text-amber-400" />
                            Recent Form Comparison
                        </h3>
                        <div className="h-64 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={formData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#71717a"
                                        tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                        tickLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        tick={{ fontSize: 11, fill: '#a1a1aa' }}
                                        tickLine={false}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend
                                        wrapperStyle={{ fontSize: '11px', color: '#a1a1aa' }}
                                        iconType="circle"
                                    />
                                    <Bar dataKey={game.home_abbr} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey={game.away_abbr} fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Model Features Radar */}
                {radarData.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap size={12} className="text-cyan-400" />
                            Model Features Strength
                        </h3>
                        <div className="h-64 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <RadarChart data={radarData}>
                                    <PolarGrid stroke="#27272a" />
                                    <PolarAngleAxis
                                        dataKey="feature"
                                        tick={{ fontSize: 10, fill: '#a1a1aa' }}
                                    />
                                    <PolarRadiusAxis
                                        angle={90}
                                        domain={[0, 100]}
                                        tick={{ fontSize: 10, fill: '#71717a' }}
                                    />
                                    <Radar
                                        name="Strength"
                                        dataKey="value"
                                        stroke="#10b981"
                                        fill="#10b981"
                                        fillOpacity={0.3}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                </RadarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* Divergence Visualization */}
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                        <BarChart3 size={12} className="text-emerald-400" />
                        Edge Visualization
                    </h3>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                        <div className="space-y-4">
                            <div>
                                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                                    <span>Model Probability</span>
                                    <span className="font-mono text-white">{(prediction.home_win_prob * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${prediction.home_win_prob * 100}%` }}
                                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
                                    <span>Market Probability</span>
                                    <span className="font-mono text-white">{(marketProb * 100).toFixed(1)}%</span>
                                </div>
                                <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        style={{ width: `${marketProb * 100}%` }}
                                        className="h-full bg-gradient-to-r from-zinc-500 to-zinc-400"
                                    />
                                </div>
                            </div>
                            <div className="pt-3 border-t border-zinc-800">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-zinc-400">Edge (Dislocation)</span>
                                    <span className={cn(
                                        "text-sm font-mono font-bold",
                                        Number(dislocation) >= 0 ? "text-emerald-400" : "text-rose-400"
                                    )}>
                                        {Number(dislocation) >= 0 ? '+' : ''}{dislocation}%
                                    </span>
                                </div>
                                <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                        style={{
                                            width: `${Math.min(Math.abs(Number(dislocation)), 50)}%`,
                                            marginLeft: Number(dislocation) < 0 ? 'auto' : '0'
                                        }}
                                        className={cn(
                                            "h-full",
                                            Number(dislocation) >= 0
                                                ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                                                : "bg-gradient-to-l from-rose-500 to-rose-400"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-5xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h2 className="text-2xl font-bold text-white tracking-tight">
                                    {game.away_team} <span className="text-zinc-500">@</span> {game.home_team}
                                </h2>
                                <div className={cn("px-2 py-0.5 rounded text-xs font-bold border",
                                    prediction.confidence_score === 'HIGH' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                        prediction.confidence_score === 'MEDIUM' ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                            "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                )}>
                                    {prediction.confidence_score} CONFIDENCE
                                </div>
                                {game.status === 'live' && (
                                    <div className="px-2 py-0.5 rounded text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        LIVE
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-zinc-400">
                                <div className="flex items-center gap-1.5">
                                    <Calendar size={14} />
                                    {formattedDate}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <Target size={14} />
                                    <span className={recommendationColor}>{prediction.recommendation}</span>
                                </div>
                                {prediction.divergence > 0.1 && (
                                    <div className="flex items-center gap-1.5 text-amber-400">
                                        <TrendingUp size={14} />
                                        {(prediction.divergence * 100).toFixed(1)}% Edge
                                    </div>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
                        {[
                            { id: 'overview', label: 'Overview', icon: Activity },
                            { id: 'market', label: 'Market Analysis', icon: DollarSign },
                            { id: 'insights', label: 'AI Insights', icon: Brain },
                            { id: 'charts', label: 'Charts', icon: BarChart3 },
                            { id: 'context', label: 'Context', icon: Newspaper },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                                    activeTab === tab.id
                                        ? "bg-white text-black shadow-lg shadow-white/10"
                                        : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                                )}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'market' && <MarketAnalysisPanel game={game} />}
                    {activeTab === 'insights' && renderInsights()}
                    {activeTab === 'charts' && renderCharts()}
                    {activeTab === 'context' && renderContext()}
                </div>
            </motion.div>
        </motion.div>
    );
};

export default GameAnalyticsModal;

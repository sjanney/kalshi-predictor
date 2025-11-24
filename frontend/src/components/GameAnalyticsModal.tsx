import React from 'react';
import { motion } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Activity, BarChart3, Brain, Target, Zap } from 'lucide-react';
import type { Game } from '../lib/api';
import { cn } from './ui/shared';

interface GameAnalyticsModalProps {
    game: Game;
    onClose: () => void;
}

const GameAnalyticsModal: React.FC<GameAnalyticsModalProps> = ({ game, onClose }) => {
    const { prediction, analytics, factors, market_data } = game;

    if (!analytics) return null;

    const recommendationColor = 
        prediction.recommendation.includes("Follow") ? "text-emerald-400" :
        prediction.recommendation.includes("Fade") ? "text-amber-400" :
        "text-zinc-400";

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-lg bg-zinc-900/90 border border-zinc-800/50 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl"
            >
                {/* Compact Header */}
                <div className="relative p-5 border-b border-zinc-800/50 bg-gradient-to-b from-zinc-800/30 to-transparent">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-full transition-all"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex items-center justify-center gap-6 mb-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white tracking-tight">{game.away_abbr}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{factors.away_record}</div>
                        </div>
                        <div className="text-xs font-bold text-zinc-600 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">VS</div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-white tracking-tight">{game.home_abbr}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{factors.home_record}</div>
                        </div>
                    </div>
                    
                    <div className="flex justify-center">
                        <div className={cn("px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center gap-2 shadow-lg", recommendationColor)}>
                            {prediction.recommendation.includes("Follow") ? <TrendingUp size={12} /> : 
                             prediction.recommendation.includes("Fade") ? <TrendingDown size={12} /> : 
                             <Activity size={12} />}
                            <span className="font-bold text-xs uppercase tracking-wide">{prediction.recommendation}</span>
                        </div>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Stats Row - More Compact */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 flex flex-col items-center justify-center text-center">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Brain size={10} /> Edge
                            </div>
                            <div className="text-lg font-bold text-white leading-none">
                                {(analytics.stat_divergence * 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 flex flex-col items-center justify-center text-center">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Activity size={10} /> Pressure
                            </div>
                            <div className="text-lg font-bold text-white leading-none">
                                {analytics.market_pressure}
                            </div>
                        </div>
                        <div className="p-3 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 flex flex-col items-center justify-center text-center">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <Target size={10} /> Win %
                            </div>
                            <div className="text-lg font-bold text-primary leading-none">
                                {(prediction.home_win_prob * 100).toFixed(0)}%
                            </div>
                        </div>
                    </div>

                    {/* Reasoning Section - Cleaner List */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap size={12} className="text-amber-400" />
                            Insights
                        </h3>
                        <div className="bg-zinc-900/20 rounded-xl border border-zinc-800/30 p-3">
                            <ul className="space-y-2">
                                {analytics.reasoning.map((reason, idx) => (
                                    <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                                        <div className="min-w-[4px] h-[4px] rounded-full bg-emerald-500 mt-1.5 opacity-80" />
                                        {reason}
                                    </li>
                                ))}
                                {analytics.reasoning.length === 0 && (
                                    <li className="text-zinc-500 italic text-xs">No specific insights generated.</li>
                                )}
                            </ul>
                        </div>
                    </div>

                    {/* Feature Breakdown - Horizontal Tags if few, or compact list */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                            <BarChart3 size={12} className="text-blue-400" />
                            Model Weights
                        </h3>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(analytics.model_features).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-900/20 border border-zinc-800/30">
                                    <span className="text-zinc-400 capitalize">{key.replace(/_/g, ' ')}</span>
                                    <span className={cn("font-mono font-medium", value > 0 ? "text-emerald-400" : "text-zinc-500")}>
                                        {value > 0 ? '+' : ''}{(value * 100).toFixed(1)}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer - Minimal */}
                    <div className="pt-3 border-t border-zinc-800/50 flex items-center justify-between text-[10px] text-zinc-600">
                        <div className="flex items-center gap-1">
                            <div className={cn("w-1.5 h-1.5 rounded-full", prediction.confidence_score === 'HIGH' ? "bg-primary" : "bg-zinc-700")} />
                            {prediction.confidence_score} CONFIDENCE
                        </div>
                        <div>Vol: ${market_data.volume.toLocaleString()}</div>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default GameAnalyticsModal;

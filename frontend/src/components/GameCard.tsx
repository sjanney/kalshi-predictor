import React from 'react';
import { motion } from 'framer-motion';
import type { Game } from '../lib/api';
import { Card, Badge, cn } from './ui/shared';
import { TrendingUp, TrendingDown, Activity, BarChart2, DollarSign } from 'lucide-react';

interface GameCardProps {
    game: Game;
    onClick?: () => void;
}

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
    const { prediction, factors, market_data, league } = game;
    const homeModelProb = prediction.stat_model_prob;
    const awayModelProb = 1 - homeModelProb;
    const homeFinalProb = prediction.home_win_prob;
    const awayFinalProb = 1 - homeFinalProb;
    
    const recommendationColor = 
        prediction.recommendation.includes("Follow") ? "text-emerald-400" :
        prediction.recommendation.includes("Fade") ? "text-amber-400" :
        "text-zinc-400";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -5 }}
        >
            <Card onClick={onClick} className="group relative hover:shadow-xl hover:shadow-black/50 hover:border-zinc-700 transition-all duration-300">
                <div className="absolute -top-3 left-4">
                    <Badge variant="outline" className="text-[9px] tracking-[0.2em]">
                        {league?.toUpperCase() ?? 'NBA'}
                    </Badge>
                </div>
                {/* Divergence Badge (Absolute) */}
                {prediction.divergence > 0.15 && (
                    <motion.div 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="absolute top-0 right-0 p-3 z-10"
                    >
                        <Badge variant="warning" className="flex items-center gap-1 shadow-sm animate-pulse">
                            <Activity size={10} />
                            <span>{Math.round(prediction.divergence * 100)}% EDGE</span>
                        </Badge>
                    </motion.div>
                )}

                <div className="p-5">
                    {/* Teams Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-zinc-500">{game.status}</span>
                                </div>
                            </div>
                            
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-lg font-bold text-white tracking-tight">{game.away_team}</span>
                                    <span className="text-xs text-zinc-600 font-mono">{factors.away_record}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <span className="text-lg font-bold text-white tracking-tight">{game.home_team}</span>
                                    <span className="text-xs text-zinc-600 font-mono">{factors.home_record}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prediction Core */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 group-hover:bg-zinc-900/80 transition-colors">
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
                                <BarChart2 size={10} />
                                Model
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-left">
                                    <div className="text-[10px] text-zinc-500 mb-0.5">{game.home_abbr}</div>
                                    <div className="text-lg font-bold text-blue-400">
                                        {(homeModelProb * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-zinc-800/50 mx-2"></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-zinc-500 mb-0.5">{game.away_abbr}</div>
                                    <div className="text-lg font-bold text-blue-200">
                                        {(awayModelProb * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-zinc-600 text-center border-t border-zinc-800/50 pt-1.5 mt-1.5">
                                Model Win Probability
                            </div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 group-hover:bg-zinc-900/80 transition-colors">
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
                                <DollarSign size={10} />
                                Market
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-left">
                                    <div className="text-[10px] text-zinc-500 mb-0.5">{game.home_abbr}</div>
                                    <div className="text-lg font-bold text-emerald-400">
                                        {((prediction.home_kalshi_prob ?? prediction.kalshi_prob) * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-zinc-800/50 mx-2"></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-zinc-500 mb-0.5">{game.away_abbr}</div>
                                    <div className="text-lg font-bold text-zinc-400">
                                        {((prediction.away_kalshi_prob ?? (1 - prediction.kalshi_prob)) * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-zinc-600 text-center border-t border-zinc-800/50 pt-1.5 mt-1.5">
                                {market_data.volume > 0 ? `$${market_data.volume.toLocaleString()} Vol` : 'Low Vol'}
                            </div>
                        </div>
                    </div>

                    {/* Overall Prediction */}
                    <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-800/50 mb-6 group-hover:border-zinc-700/50 transition-colors">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
                            <TrendingUp size={10} />
                            Final Win Probability
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-left">
                                <div className="text-[10px] text-zinc-500 mb-0.5">{game.home_abbr}</div>
                                <div className="text-xl font-bold text-primary">
                                    {(homeFinalProb * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div className="h-8 w-px bg-zinc-800/50 mx-2"></div>
                            <div className="text-right">
                                <div className="text-[10px] text-zinc-500 mb-0.5">{game.away_abbr}</div>
                                <div className="text-xl font-bold text-zinc-300">
                                    {(awayFinalProb * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendation Banner */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-0.5">Signal</div>
                            <div className={cn("font-bold text-sm flex items-center gap-1.5", recommendationColor)}>
                                {prediction.recommendation.includes("Follow") ? <TrendingUp size={14} /> : 
                                 prediction.recommendation.includes("Fade") ? <TrendingDown size={14} /> : 
                                 <Activity size={14} />}
                                {prediction.recommendation}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-0.5">Confidence</div>
                            <div className="flex items-center gap-1 justify-end">
                                {[1, 2, 3].map((star) => (
                                    <div 
                                        key={star} 
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all duration-300", 
                                            (star === 1) || (star === 2 && prediction.confidence_score !== "LOW") || (star === 3 && prediction.confidence_score === "HIGH") 
                                                ? "bg-primary shadow-[0_0_5px_rgba(16,185,129,0.5)]" 
                                                : "bg-zinc-800"
                                        )} 
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </motion.div>
    );
};

export default GameCard;

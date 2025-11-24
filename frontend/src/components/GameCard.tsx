import React from 'react';
import type { Game } from '../lib/api';
import { Card, Badge, cn } from './ui/shared';
import { TrendingUp, TrendingDown, Activity, BarChart2, DollarSign } from 'lucide-react';

interface GameCardProps {
    game: Game;
    onClick?: () => void;
}

const ProbabilityBar = ({ label, value, color, subtext }: { label: string; value: number; color: string; subtext?: string }) => (
    <div className="space-y-1">
        <div className="flex justify-between text-xs">
            <span className="text-zinc-500 font-medium">{label}</span>
            <div className="text-right">
                <span className="text-zinc-300 font-bold">{(value * 100).toFixed(0)}%</span>
                {subtext && <span className="text-zinc-600 ml-1 text-[10px]">{subtext}</span>}
            </div>
        </div>
        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden relative">
            <div 
                className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
                style={{ width: `${value * 100}%` }}
            />
        </div>
    </div>
);

const GameCard: React.FC<GameCardProps> = ({ game, onClick }) => {
    const { prediction, factors, market_data } = game;
    const isHighConf = prediction.confidence_score === "HIGH";
    const homeModelProb = prediction.stat_model_prob;
    const awayModelProb = 1 - homeModelProb;
    const homeFinalProb = prediction.home_win_prob;
    const awayFinalProb = 1 - homeFinalProb;
    
    const recommendationColor = 
        prediction.recommendation.includes("Follow") ? "text-emerald-400" :
        prediction.recommendation.includes("Fade") ? "text-amber-400" :
        "text-zinc-400";

    return (
        <Card onClick={onClick} className="group relative hover:shadow-xl hover:shadow-black/50">
            {/* Divergence Badge (Absolute) */}
            {prediction.divergence > 0.15 && (
                <div className="absolute top-0 right-0 p-3">
                    <Badge variant="warning" className="flex items-center gap-1 shadow-sm">
                        <Activity size={10} />
                        <span>{Math.round(prediction.divergence * 100)}% EDGE</span>
                    </Badge>
                </div>
            )}

            <div className="p-5">
                {/* Teams Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-500">{game.status}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
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
                    <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
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
                    <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50">
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
                <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-800/50 mb-6">
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
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
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
                                        "w-1.5 h-1.5 rounded-full", 
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
    );
};

export default GameCard;

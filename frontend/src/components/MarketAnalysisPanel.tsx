import React from 'react';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { cn } from './ui/shared';
import type { Game } from '../lib/api';

interface MarketAnalysisPanelProps {
    game: Game;
}

const MarketAnalysisPanel: React.FC<MarketAnalysisPanelProps> = ({ game }) => {
    const { market_data, prediction } = game;
    const spread = market_data?.spread || 0;
    const spreadPct = market_data?.spread_pct || 0;
    const openInterest = market_data?.open_interest || 0;
    const volume = market_data?.volume || 0;
    const currentPrice = market_data?.price || 0;
    const midPrice = market_data?.mid_price || currentPrice;

    // Calculate market quality score
    const getMarketQuality = () => {
        if (volume > 500 && spreadPct < 5) return { label: 'Excellent', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
        if (volume > 200 && spreadPct < 10) return { label: 'Good', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
        if (volume > 50 && spreadPct < 20) return { label: 'Fair', color: 'text-amber-400', bgColor: 'bg-amber-500/20' };
        return { label: 'Poor', color: 'text-rose-400', bgColor: 'bg-rose-500/20' };
    };

    const quality = getMarketQuality();

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Market Quality Badge */}
            <div className={cn("rounded-xl p-5 border", quality.bgColor, "border-current/30")}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-lg bg-black/20", quality.color)}>
                            <Zap size={20} />
                        </div>
                        <div>
                            <div className={cn("text-base font-bold", quality.color)}>Market Quality: {quality.label}</div>
                            <div className={cn("text-xs opacity-80", quality.color)}>
                                Based on volume & spread analysis
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Current Price</div>
                    <div className="text-3xl font-bold text-white tracking-tight">{currentPrice.toFixed(1)}¢</div>
                    <div className="text-xs text-zinc-400 mt-1 font-medium">${(currentPrice / 100).toFixed(2)} / contract</div>
                </div>

                <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">24h Volume</div>
                    <div className="text-3xl font-bold text-white tracking-tight">${volume.toLocaleString()}</div>
                    <div className="text-xs text-zinc-400 mt-1 font-medium">{Math.floor(volume / currentPrice * 100)} contracts</div>
                </div>

                <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Spread</div>
                    <div className="text-3xl font-bold text-white tracking-tight">{spread.toFixed(1)}¢</div>
                    <div className="text-xs text-zinc-400 mt-1 font-medium">{spreadPct.toFixed(2)}% of price</div>
                </div>

                <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800 hover:border-zinc-700 transition-colors">
                    <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">Open Interest</div>
                    <div className="text-3xl font-bold text-white tracking-tight">{openInterest.toLocaleString()}</div>
                    <div className="text-xs text-zinc-400 mt-1 font-medium">Total contracts</div>
                </div>
            </div>

            {/* Bid/Ask Spread Visualization */}
            <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Order Book</div>
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Best Ask</span>
                        <span className="text-sm font-mono text-rose-400">{market_data?.yes_ask || 0}¢</span>
                    </div>
                    <div className="relative h-8 bg-zinc-800 rounded-lg overflow-hidden">
                        <div
                            className="absolute left-0 h-full bg-emerald-500/30"
                            style={{ width: `${(market_data?.yes_bid || 0)}%` }}
                        />
                        <div
                            className="absolute right-0 h-full bg-rose-500/30"
                            style={{ width: `${100 - (market_data?.yes_ask || 100)}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-mono text-white">{midPrice.toFixed(1)}¢ mid</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-400">Best Bid</span>
                        <span className="text-sm font-mono text-emerald-400">{market_data?.yes_bid || 0}¢</span>
                    </div>
                </div>
            </div>

            {/* Model vs Market Comparison */}
            <div className="bg-zinc-900/50 rounded-xl p-5 border border-zinc-800">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Prediction vs Market</div>
                <div className="space-y-4">
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-zinc-400">Our Model</span>
                            <span className="text-sm font-mono text-blue-400">{(prediction.home_win_prob * 100).toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                                style={{ width: `${prediction.home_win_prob * 100}%` }}
                            />
                        </div>
                    </div>
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-zinc-400">Market Price</span>
                            <span className="text-sm font-mono text-emerald-400">{currentPrice.toFixed(1)}%</span>
                        </div>
                        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                                style={{ width: `${currentPrice}%` }}
                            />
                        </div>
                    </div>
                    {prediction.divergence !== 0 && (
                        <div className="pt-2 border-t border-zinc-800">
                            <div className="flex items-center gap-2">
                                {prediction.divergence > 0 ? (
                                    <TrendingUp size={14} className="text-amber-400" />
                                ) : (
                                    <TrendingDown size={14} className="text-amber-400" />
                                )}
                                <span className="text-xs text-zinc-400">
                                    {Math.abs(prediction.divergence * 100).toFixed(1)}% divergence
                                </span>
                                <span className={cn(
                                    "text-xs font-medium",
                                    prediction.divergence > 0.1 ? "text-amber-400" : "text-zinc-500"
                                )}>
                                    {prediction.divergence > 0.1 ? "Potential edge" : "Aligned"}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* External Link */}
            <a
                href="https://kalshi.com"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-center py-3 rounded-xl font-medium hover:from-emerald-500 hover:to-emerald-400 transition-all"
            >
                Trade on Kalshi.com →
            </a>
        </div>
    );
};

export default MarketAnalysisPanel;

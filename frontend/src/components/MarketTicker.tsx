import React from 'react';
import { type Game } from '../lib/api';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketTickerProps {
    games: Game[];
}

const MarketTicker: React.FC<MarketTickerProps> = ({ games }) => {
    if (games.length === 0) return null;

    // Duplicate games to create seamless loop
    const tickerItems = [...games, ...games];

    return (
        <div className="w-full bg-surface/50 border-y border-white/5 overflow-hidden h-10 flex items-center relative z-30 backdrop-blur-sm">
            <div className="flex animate-ticker whitespace-nowrap">
                {tickerItems.map((game, i) => {
                    const price = (game.market_data?.price || 0) * 100;
                    const change = game.market_data?.daily_change || 0; // Assuming this field exists or we simulate
                    const isPositive = change >= 0;

                    return (
                        <div key={`${game.game_id}-${i}`} className="flex items-center gap-3 px-6 border-r border-white/5 text-xs font-medium text-zinc-400">
                            <span className="text-white font-bold">{game.away_abbr} @ {game.home_abbr}</span>
                            <span className="text-zinc-300">{price.toFixed(1)}¢</span>
                            <span className={`flex items-center gap-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                                {Math.abs(change).toFixed(1)}%
                            </span>
                        </div>
                    );
                })}
            </div>
            <style>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker {
                    animation: ticker 60s linear infinite;
                }
                .animate-ticker:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
};

export default MarketTicker;

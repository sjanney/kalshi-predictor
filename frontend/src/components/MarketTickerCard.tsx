import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { MarketUpdate } from '../hooks/useKalshiWebSocket';

interface MarketTickerCardProps {
    market: MarketUpdate;
    onClick?: () => void;
}

const MarketTickerCard: React.FC<MarketTickerCardProps> = ({ market, onClick }) => {
    const price = market.yes_price * 100; // Convert to cents
    const priceHistory = market.price_history || [];

    // Calculate price change
    const priceChange = priceHistory.length >= 2
        ? ((priceHistory[priceHistory.length - 1].price - priceHistory[0].price) / priceHistory[0].price) * 100
        : 0;

    const isPositive = priceChange > 0;
    const isNeutral = Math.abs(priceChange) < 0.1;

    // Format ticker for display
    const formatTicker = (ticker: string) => {
        // Prefer title/subtitle if available
        if (market.title) {
            // If title contains "vs" or "@", it's likely the matchup name
            if (market.title.includes(' vs ') || market.title.includes(' @ ')) {
                return market.title;
            }
            // If subtitle has the matchup
            if (market.subtitle && (market.subtitle.includes(' vs ') || market.subtitle.includes(' @ '))) {
                return market.subtitle;
            }
            // Fallback to title
            return market.title;
        }

        // Extract readable parts from ticker (e.g., KXNFL-2024-W12-BUF-KC -> BUF vs KC)
        const parts = ticker.split('-');
        if (parts.length >= 5) {
            return `${parts[parts.length - 2]} vs ${parts[parts.length - 1]}`;
        }
        return ticker;
    };

    // Prepare sparkline data
    const sparklineData = priceHistory.slice(-20).map((point, i) => ({
        index: i,
        price: point.price * 100,
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02, y: -4 }}
            onClick={onClick}
            className="glass-card rounded-2xl p-4 cursor-pointer hover:border-kalshi-green/30 transition-all"
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">
                        {formatTicker(market.ticker)}
                    </h3>
                    <p className="text-xs text-zinc-500 truncate mt-0.5">
                        {market.subtitle || market.ticker}
                    </p>
                </div>

                {/* Price change indicator */}
                <div className={`flex items-center gap-1 text-xs font-medium ${isNeutral ? 'text-zinc-400' : isPositive ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                    {isNeutral ? (
                        <Minus className="w-3 h-3" />
                    ) : isPositive ? (
                        <TrendingUp className="w-3 h-3" />
                    ) : (
                        <TrendingDown className="w-3 h-3" />
                    )}
                    {Math.abs(priceChange).toFixed(1)}%
                </div>
            </div>

            {/* Current Price */}
            <div className="mb-3">
                <div className="text-2xl font-bold text-white">
                    {price.toFixed(1)}¢
                </div>
                <div className="text-xs text-zinc-500">
                    Yes: {(market.yes_price * 100).toFixed(1)}¢ • No: {(market.no_price * 100).toFixed(1)}¢
                </div>
            </div>

            {/* Sparkline Chart */}
            {sparklineData.length > 1 && (
                <div className="h-12 mb-3 -mx-2">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={sparklineData}>
                            <Line
                                type="monotone"
                                dataKey="price"
                                stroke={isPositive ? '#10b981' : isNeutral ? '#71717a' : '#ef4444'}
                                strokeWidth={2}
                                dot={false}
                                animationDuration={300}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Volume & Activity */}
            <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-zinc-400">
                    <Activity className="w-3 h-3" />
                    <span>Vol: {(market.volume / 1000).toFixed(1)}k</span>
                </div>

                {market.last_trade && (
                    <div className="text-zinc-500">
                        Last: {(market.last_trade.price * 100).toFixed(1)}¢
                    </div>
                )}
            </div>

            {/* Live indicator */}
            <div className="absolute top-2 right-2">
                <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
            </div>
        </motion.div>
    );
};

export default MarketTickerCard;

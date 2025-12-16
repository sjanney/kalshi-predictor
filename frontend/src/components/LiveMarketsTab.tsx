import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Activity, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useKalshiWebSocket } from '../hooks/useKalshiWebSocket';
import MarketTickerCard from './MarketTickerCard';

const LiveMarketsTab: React.FC = () => {
    const [selectedSport, setSelectedSport] = useState<string>('all');
    const { markets, connected, error, reconnect } = useKalshiWebSocket({
        sport: selectedSport === 'all' ? undefined : selectedSport,
        autoConnect: true,
    });

    const sports = [
        { id: 'all', label: 'All Markets', count: markets.length },
        { id: 'nfl', label: 'NFL', count: markets.filter(m => m.ticker.startsWith('KXNFL')).length },
        { id: 'nba', label: 'NBA', count: markets.filter(m => m.ticker.startsWith('KXNBA')).length },
    ];

    // Filter markets by selected sport (client-side filtering as backup)
    const filteredMarkets = selectedSport === 'all'
        ? markets
        : markets.filter(m => m.ticker.startsWith(`KX${selectedSport.toUpperCase()}`));

    // Sort by volume (highest first)
    const sortedMarkets = [...filteredMarkets].sort((a, b) => b.volume - a.volume);

    return (
        <div className="space-y-6">
            {/* Header with connection status */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="w-6 h-6 text-kalshi-green" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Live Markets</h2>
                        <p className="text-sm text-zinc-400">Real-time market data</p>
                    </div>
                </div>

                {/* Connection Status */}
                <div className="flex items-center gap-3">
                    {connected ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                            <Wifi className="w-4 h-4 text-emerald-400" />
                            <span className="text-xs font-medium text-emerald-400">Live</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                            <WifiOff className="w-4 h-4 text-red-400" />
                            <span className="text-xs font-medium text-red-400">Disconnected</span>
                        </div>
                    )}

                    {error && (
                        <button
                            onClick={reconnect}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/50 border border-white/5 hover:border-kalshi-green/30 transition-all"
                        >
                            <RefreshCw className="w-4 h-4 text-zinc-400" />
                            <span className="text-xs font-medium text-zinc-400">Reconnect</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Sport Filter Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {sports.map((sport) => (
                    <button
                        key={sport.id}
                        onClick={() => setSelectedSport(sport.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${selectedSport === sport.id
                            ? 'bg-gradient-to-r from-kalshi-green to-primary text-white shadow-lg shadow-kalshi-green/25'
                            : 'bg-surface/30 text-zinc-400 hover:bg-surface/50 hover:text-white border border-white/5'
                            }`}
                    >
                        {sport.label}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${selectedSport === sport.id
                            ? 'bg-white/20'
                            : 'bg-white/5'
                            }`}>
                            {sport.count}
                        </span>
                    </button>
                ))}
            </div>

            {/* Markets Grid */}
            {sortedMarkets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <AnimatePresence mode="popLayout">
                        {sortedMarkets.map((market) => (
                            <MarketTickerCard
                                key={market.ticker}
                                market={market}
                                onClick={() => {
                                    // TODO: Open market details modal
                                    console.log('Market clicked:', market.ticker);
                                }}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-full bg-surface/50 flex items-center justify-center mb-4">
                        {connected ? (
                            <Activity className="w-8 h-8 text-zinc-600" />
                        ) : (
                            <WifiOff className="w-8 h-8 text-zinc-600" />
                        )}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                        {connected ? 'No markets available' : 'Connecting to market stream...'}
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-md mb-4">
                        {connected
                            ? 'There are no active markets for this sport at the moment. The WebSocket is connected but not receiving market data.'
                            : 'Establishing connection to Kalshi WebSocket API. This may take a few moments...'}
                    </p>
                    {!connected && (
                        <>
                            <div className="mt-2 mb-4">
                                <div className="w-8 h-8 border-2 border-kalshi-green/30 border-t-kalshi-green rounded-full animate-spin" />
                            </div>
                            <div className="text-xs text-zinc-600 max-w-md space-y-1">
                                <p>• Authenticating with Kalshi API</p>
                                <p>• Subscribing to market channels</p>
                                <p>• Waiting for market data...</p>
                            </div>
                        </>
                    )}
                    {error && (
                        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 max-w-md">
                            <p className="text-sm text-red-400">{error}</p>
                            <button
                                onClick={reconnect}
                                className="mt-2 text-xs text-red-300 hover:text-red-200 underline"
                            >
                                Try reconnecting
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}
        </div>
    );
};

export default LiveMarketsTab;

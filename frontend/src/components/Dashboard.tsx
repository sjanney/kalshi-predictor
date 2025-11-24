import React, { useEffect, useState } from 'react';
import { api, type Game } from '../lib/api';
import { useFilterStore } from '../lib/store';
import GameCard from './GameCard';
import { RefreshCw, Zap, Filter } from 'lucide-react';
import { cn } from './ui/shared';

const Dashboard: React.FC = () => {
    const [games, setGames] = useState<Game[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');

    // Store
    const { minConfidence, sortBy, setFilter } = useFilterStore();

    const fetchGames = async () => {
        try {
            setIsRefreshing(true);
            // Initial loading state only if we don't have games
            if (games.length === 0) setLoading(true);
            
            setError(null);
            const data = await api.getGames(sortBy);
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
        fetchGames();
        const interval = setInterval(fetchGames, 60000 * 5); // 5 mins
        return () => clearInterval(interval);
    }, [sortBy]); // Refetch when sort changes

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
            <div className="border-b border-zinc-800 bg-surface/30">
                <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap gap-4 items-center justify-between">
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

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                        {filteredGames.map((game) => (
                            <GameCard key={game.game_id} game={game} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default Dashboard;

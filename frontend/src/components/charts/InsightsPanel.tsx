import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Activity, Zap, Target } from 'lucide-react';
import {
    ResponsiveContainer,
    ComposedChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Cell
} from 'recharts';
import type { Game } from '../../lib/api';
import { cn } from '../ui/shared';

interface InsightsPanelProps {
    games: Game[];
}

const InsightsPanel: React.FC<InsightsPanelProps> = ({ games }) => {
    // Calculate market metrics
    const metrics = useMemo(() => {
        if (!games.length) return null;

        const opportunities = games.filter(g => (g.prediction?.divergence || 0) > 0.05);
        const avgEdge = opportunities.reduce((acc, g) => acc + (g.prediction?.divergence || 0), 0) / (opportunities.length || 1);
        const bestEdge = [...games].sort((a, b) => (b.prediction?.divergence || 0) - (a.prediction?.divergence || 0))[0];
        const highestVolume = [...games].sort((a, b) => (b.market_data?.volume || 0) - (a.market_data?.volume || 0))[0];

        return {
            opportunityCount: opportunities.length,
            avgEdge,
            bestEdge,
            highestVolume
        };
    }, [games]);

    // Prepare chart data
    const chartData = useMemo(() => {
        return games
            .filter(g => g.prediction && g.market_data)
            .sort((a, b) => (b.prediction?.divergence || 0) - (a.prediction?.divergence || 0))
            .slice(0, 10)
            .map(g => ({
                name: `${g.away_abbr || 'AWY'} @ ${g.home_abbr || 'HOM'}`,
                edge: (g.prediction.divergence * 100).toFixed(1),
                volume: g.market_data.volume,
                confidence: g.prediction.confidence_score
            }));
    }, [games]);

    if (!games.length) return null;

    return (
        <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all" />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400">
                            <Target size={18} />
                        </div>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Opportunities</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{metrics?.opportunityCount || 0}</div>
                    <div className="text-xs text-zinc-500">Games with &gt;5% edge</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Avg Edge</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">{((metrics?.avgEdge || 0) * 100).toFixed(1)}%</div>
                    <div className="text-xs text-zinc-500">Across opportunities</div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all" />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                            <Zap size={18} />
                        </div>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Best Value</span>
                    </div>
                    <div className="text-lg font-bold text-white truncate mb-1">
                        {metrics?.bestEdge ? `${metrics.bestEdge.away_abbr} @ ${metrics.bestEdge.home_abbr}` : '-'}
                    </div>
                    <div className="text-xs text-emerald-400 font-bold">
                        +{((metrics?.bestEdge?.prediction?.divergence || 0) * 100).toFixed(1)}% Edge
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all" />
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
                            <Activity size={18} />
                        </div>
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Highest Vol</span>
                    </div>
                    <div className="text-lg font-bold text-white truncate mb-1">
                        {metrics?.highestVolume ? `${metrics.highestVolume.away_abbr} @ ${metrics.highestVolume.home_abbr}` : '-'}
                    </div>
                    <div className="text-xs text-zinc-500">
                        ${metrics?.highestVolume?.market_data?.volume?.toLocaleString() || 0} Traded
                    </div>
                </motion.div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Opportunities Chart */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-bold text-white">Top Market Opportunities</h3>
                            <p className="text-xs text-zinc-500">Games with highest divergence from market price</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <span className="text-xs text-zinc-400">High Conf</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-blue-500" />
                                <span className="text-xs text-zinc-400">Med Conf</span>
                            </div>
                        </div>
                    </div>

                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    hide
                                    width={0}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: '#18181b',
                                        border: '1px solid #27272a',
                                        borderRadius: '8px',
                                        fontSize: '12px'
                                    }}
                                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                                />
                                <Bar dataKey="edge" barSize={20} radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.confidence === 'HIGH' ? '#10b981' : '#3b82f6'}
                                        />
                                    ))}
                                </Bar>
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Market Activity Feed */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 flex flex-col"
                >
                    <h3 className="text-lg font-bold text-white mb-4">Market Pulse</h3>
                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {games.slice(0, 8).map((game) => (
                            <div key={game.game_id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/50 border border-zinc-800/50 hover:bg-zinc-800/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        (game.status?.toLowerCase() === 'in progress' || game.status?.toLowerCase() === 'live') ? "bg-red-500 animate-pulse" : "bg-zinc-600"
                                    )} />
                                    <div>
                                        <div className="text-xs font-bold text-white">
                                            {game.away_abbr} @ {game.home_abbr}
                                        </div>
                                        <div className="text-[10px] text-zinc-500">
                                            Vol: ${(game.market_data?.volume || 0).toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono font-bold text-emerald-400">
                                        {game.market_data?.price || 50}¢
                                    </div>
                                    <div className="text-[10px] text-zinc-500">
                                        Last Price
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default InsightsPanel;

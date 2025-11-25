import React, { useMemo } from 'react';
import { 
    ComposedChart, 
    LineChart, 
    Line, 
    Area, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    Legend 
} from 'recharts';
import { motion } from 'framer-motion';
import type { Game } from '../../lib/api';
import { Activity, TrendingUp } from 'lucide-react';

interface InsightsPanelProps {
    games: Game[];
}

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
                            {p.name.includes('Volume') 
                                ? `$${Number(p.value).toLocaleString()}`
                                : `${Number(p.value).toFixed(1)}%`
                            }
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

const InsightsPanel: React.FC<InsightsPanelProps> = ({ games }) => {
    // Memoize data preparation to prevent flickering
    const efficiencyData = useMemo(() => {
        if (games.length === 0) return [];
        return [...games]
            .sort((a, b) => b.prediction.divergence - a.prediction.divergence)
            .map(g => ({
                name: `${g.away_abbr} @ ${g.home_abbr}`,
                divergence: Math.abs(g.prediction.divergence * 100),
                volume: g.market_data.volume,
                confidence: g.prediction.confidence_score,
            }))
            .slice(0, 10); // Top 10 opportunities
    }, [games]);

    const probabilityData = useMemo(() => {
        if (games.length === 0) return [];
        return [...games]
            .sort((a, b) => b.prediction.home_win_prob - a.prediction.home_win_prob)
            .map(g => {
                // Check if we have real market data
                // The backend defaults to 0.5 when there's no market data
                // Real market data exists if volume > 0 OR (volume is 0 but prob is not exactly 0.5)
                const marketProb = g.prediction.home_kalshi_prob ?? g.prediction.kalshi_prob;
                const hasRealMarketData = 
                    g.market_data.volume > 0 || 
                    (marketProb !== undefined && marketProb !== 0.5);
                
                // Only use market probability if we have real market data
                // Otherwise, don't show market line (will be filtered or handled specially)
                const marketValue = hasRealMarketData && marketProb !== undefined
                    ? marketProb * 100
                    : null; // Use null to indicate no real market data
                
                return {
                    name: `${g.away_abbr} @ ${g.home_abbr}`,
                    model: g.prediction.home_win_prob * 100,
                    market: marketValue,
                    edge: hasRealMarketData && marketProb !== undefined
                        ? (g.prediction.home_win_prob - marketProb) * 100 
                        : null
                };
            })
            .filter(g => g.market !== null); // Only show games with real market data in the chart
    }, [games]);

    // Create a stable key based on game IDs to prevent unnecessary re-renders
    const gamesKey = useMemo(() => {
        return games.map(g => g.game_id).join(',');
    }, [games]);

    if (games.length === 0) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8" key={gamesKey}>
            {/* Market Efficiency / Edge Graph */}
            <motion.div 
                key={`efficiency-${gamesKey}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="bg-surface border border-zinc-800 rounded-xl p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Activity className="text-emerald-400" size={18} />
                        <div>
                            <h3 className="font-bold text-white text-lg">Edge vs Volume</h3>
                            <p className="text-xs text-zinc-500">Top 10 opportunities by divergence</p>
                        </div>
                    </div>
                </div>

                <div className="h-64 w-full chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={efficiencyData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <defs>
                                <linearGradient id="colorDivergence" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#52525b" 
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                interval={0}
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis 
                                yAxisId="left"
                                orientation="left"
                                stroke="#10b981"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                unit="%"
                            />
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                stroke="#71717a"
                                tick={{ fontSize: 10 }}
                                tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar 
                                yAxisId="right"
                                dataKey="volume" 
                                name="Volume"
                                fill="#3f3f46" 
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                                opacity={0.5}
                            />
                            <Area 
                                yAxisId="left"
                                type="monotone" 
                                dataKey="divergence" 
                                name="Edge"
                                stroke="#10b981" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorDivergence)" 
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Model vs Market Graph */}
            <motion.div 
                key={`probability-${gamesKey}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
                className="bg-surface border border-zinc-800 rounded-xl p-6"
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-blue-400" size={18} />
                        <div>
                            <h3 className="font-bold text-white text-lg">Model vs Market</h3>
                            <p className="text-xs text-zinc-500">Win probability comparison</p>
                        </div>
                    </div>
                </div>

                <div className="h-64 w-full chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={probabilityData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis 
                                dataKey="name" 
                                stroke="#52525b" 
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                interval={0} // Show all
                                angle={-45}
                                textAnchor="end"
                                height={60}
                            />
                            <YAxis 
                                stroke="#71717a"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                domain={[0, 100]}
                                unit="%"
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend 
                                verticalAlign="top" 
                                height={36} 
                                iconType="circle"
                                wrapperStyle={{ fontSize: '12px', color: '#a1a1aa' }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="model" 
                                name="Model Prob"
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                            <Line 
                                type="monotone" 
                                dataKey="market" 
                                name="Market Implied"
                                stroke="#a1a1aa" 
                                strokeWidth={2}
                                strokeDasharray="4 4"
                                dot={false}
                                activeDot={{ r: 4, strokeWidth: 0 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(InsightsPanel, (prevProps, nextProps) => {
    // If same reference, skip re-render
    if (prevProps.games === nextProps.games) return true;
    
    // If different lengths, re-render
    if (prevProps.games.length !== nextProps.games.length) return false;
    
    // Check if game IDs or key values changed
    const prevKey = prevProps.games.map(g => 
        `${g.game_id}-${g.prediction.divergence}-${g.prediction.home_win_prob}-${g.market_data.volume}`
    ).sort().join('|');
    
    const nextKey = nextProps.games.map(g => 
        `${g.game_id}-${g.prediction.divergence}-${g.prediction.home_win_prob}-${g.market_data.volume}`
    ).sort().join('|');
    
    // If keys match, skip re-render
    return prevKey === nextKey;
});


import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Save, Trash2, TrendingUp, AlertCircle } from 'lucide-react';
import type { Game } from '../lib/api';
import { cn } from './ui/shared';

interface Strategy {
    id: string;
    name: string;
    minDivergence: number;
    minConfidence: 'ALL' | 'MEDIUM' | 'HIGH';
    betSize: number; // fixed amount
}

interface StrategyLabProps {
    open: boolean;
    onClose: () => void;
    games: Game[];
}

const StrategyLab: React.FC<StrategyLabProps> = ({ open, onClose, games }) => {
    const [strategies, setStrategies] = useState<Strategy[]>([]);
    const [activeStrategy, setActiveStrategy] = useState<Strategy>({
        id: 'new',
        name: 'New Strategy',
        minDivergence: 0.10,
        minConfidence: 'MEDIUM',
        betSize: 100
    });
    const [simulationResult, setSimulationResult] = useState<{
        matches: number;
        potentialPnL: number;
        roi: number;
        trades: Game[];
    } | null>(null);

    // Load strategies
    useEffect(() => {
        const stored = localStorage.getItem('kalshi-strategies');
        if (stored) {
            setStrategies(JSON.parse(stored));
        }
    }, []);

    const saveStrategies = (newStrategies: Strategy[]) => {
        setStrategies(newStrategies);
        localStorage.setItem('kalshi-strategies', JSON.stringify(newStrategies));
    };

    const runSimulation = () => {
        const trades = games.filter(g => {
            const div = g.prediction.divergence;
            const conf = g.prediction.confidence_score;
            
            if (div < activeStrategy.minDivergence) return false;
            if (activeStrategy.minConfidence === 'HIGH' && conf !== 'HIGH') return false;
            if (activeStrategy.minConfidence === 'MEDIUM' && conf === 'LOW') return false;
            
            return true;
        });

        // Simple EV simulation
        // EV = (ModelProb * (1 - Price) - (1 - ModelProb) * Price) * BetSize / Price ??
        // Actually Kalshi Yes is: Pay Price, Win $1. Profit = 1 - Price. Loss = Price.
        // EV = (Prob * (1 - Price)) - ((1 - Prob) * Price)
        //    = Prob - Prob*Price - Price + Prob*Price
        //    = Prob - Price
        
        let totalEV = 0;
        let totalRisk = 0;
        
        trades.forEach(g => {
            const modelProb = g.prediction.stat_model_prob; // Use purely model prob for backtest of "alpha"
            const marketPrice = g.market_data.price / 100;
            
            // Assuming we bet on the side of divergence
            // If Model > Market, buy YES.
            // If Model < Market, buy NO (which is effectively Short YES, or Buy NO at 1-Price)
            
            // Simplified: We only bet if we have an edge
            const edge = Math.abs(modelProb - marketPrice);
            
            // Check direction
            const direction = modelProb > marketPrice ? 1 : -1;
            
            // If we buy YES:
            if (direction === 1) {
                 const evPerDollar = (modelProb - marketPrice);
                 totalEV += evPerDollar * activeStrategy.betSize;
            } else {
                 // If we buy NO (price is 1-marketPrice, prob is 1-modelProb)
                 const evPerDollar = ((1 - modelProb) - (1 - marketPrice));
                 totalEV += evPerDollar * activeStrategy.betSize;
            }
            
            totalRisk += activeStrategy.betSize;
        });

        setSimulationResult({
            matches: trades.length,
            potentialPnL: totalEV,
            roi: totalRisk > 0 ? (totalEV / totalRisk) * 100 : 0,
            trades
        });
    };

    const handleSave = () => {
        if (activeStrategy.id === 'new') {
            const newStrat = { ...activeStrategy, id: Date.now().toString() };
            saveStrategies([...strategies, newStrat]);
            setActiveStrategy(newStrat);
        } else {
            const updated = strategies.map(s => s.id === activeStrategy.id ? activeStrategy : s);
            saveStrategies(updated);
        }
    };

    const handleDelete = (id: string) => {
        const updated = strategies.filter(s => s.id !== id);
        saveStrategies(updated);
        if (activeStrategy.id === id) {
            setActiveStrategy({
                id: 'new',
                name: 'New Strategy',
                minDivergence: 0.10,
                minConfidence: 'MEDIUM',
                betSize: 100
            });
            setSimulationResult(null);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl flex overflow-hidden h-[80vh]"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Sidebar */}
                        <div className="w-64 bg-zinc-900/50 border-r border-zinc-800 p-4 flex flex-col">
                            <div className="flex items-center gap-2 mb-6">
                                <TrendingUp className="text-emerald-400" size={20} />
                                <h2 className="font-bold text-white">Strategy Lab</h2>
                            </div>
                            
                            <button 
                                onClick={() => {
                                    setActiveStrategy({
                                        id: 'new',
                                        name: 'New Strategy',
                                        minDivergence: 0.10,
                                        minConfidence: 'MEDIUM',
                                        betSize: 100
                                    });
                                    setSimulationResult(null);
                                }}
                                className="mb-4 w-full py-2 px-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider text-zinc-300 transition-colors border border-zinc-700"
                            >
                                + Create New
                            </button>
                            
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {strategies.map(s => (
                                    <div 
                                        key={s.id}
                                        onClick={() => {
                                            setActiveStrategy(s);
                                            setSimulationResult(null);
                                        }}
                                        className={cn(
                                            "p-3 rounded-lg cursor-pointer border transition-all",
                                            activeStrategy.id === s.id 
                                                ? "bg-emerald-500/10 border-emerald-500/50 text-white" 
                                                : "bg-transparent border-transparent hover:bg-zinc-800/50 text-zinc-400"
                                        )}
                                    >
                                        <div className="text-sm font-medium">{s.name}</div>
                                        <div className="text-[10px] opacity-70 mt-1">
                                            Div &gt; {(s.minDivergence * 100).toFixed(0)}% • {s.minConfidence}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Main Area */}
                        <div className="flex-1 flex flex-col bg-zinc-950/50">
                            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                                <input 
                                    type="text" 
                                    value={activeStrategy.name}
                                    onChange={(e) => setActiveStrategy({ ...activeStrategy, name: e.target.value })}
                                    className="bg-transparent text-xl font-bold text-white focus:outline-none placeholder-zinc-600"
                                    placeholder="Strategy Name"
                                />
                                <div className="flex gap-2">
                                    {activeStrategy.id !== 'new' && (
                                        <button 
                                            onClick={() => handleDelete(activeStrategy.id)}
                                            className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    <button 
                                        onClick={handleSave}
                                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-xs font-bold uppercase tracking-wider text-white transition-colors border border-zinc-700"
                                    >
                                        <Save size={16} /> Save
                                    </button>
                                    <button 
                                        onClick={onClose}
                                        className="p-2 text-zinc-500 hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 flex-1 overflow-y-auto">
                                <div className="grid grid-cols-3 gap-6 mb-8">
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                            Min Divergence
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="range" 
                                                min="1" max="30" 
                                                value={activeStrategy.minDivergence * 100}
                                                onChange={(e) => setActiveStrategy({ ...activeStrategy, minDivergence: Number(e.target.value) / 100 })}
                                                className="flex-1 accent-emerald-500"
                                            />
                                            <span className="font-mono text-white w-12 text-right">{(activeStrategy.minDivergence * 100).toFixed(0)}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                            Confidence Required
                                        </label>
                                        <select 
                                            value={activeStrategy.minConfidence}
                                            onChange={(e) => setActiveStrategy({ ...activeStrategy, minConfidence: e.target.value as any })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        >
                                            <option value="ALL">All Levels</option>
                                            <option value="MEDIUM">Medium+</option>
                                            <option value="HIGH">High Only</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
                                            Bet Size ($)
                                        </label>
                                        <input 
                                            type="number"
                                            value={activeStrategy.betSize}
                                            onChange={(e) => setActiveStrategy({ ...activeStrategy, betSize: Number(e.target.value) })}
                                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={runSimulation}
                                    className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20"
                                >
                                    <Play size={20} /> Run Simulation on Active Markets
                                </button>

                                {simulationResult && (
                                    <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                                                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Eligible Trades</div>
                                                <div className="text-2xl font-bold text-white">{simulationResult.matches}</div>
                                            </div>
                                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                                                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Projected EV</div>
                                                <div className={cn("text-2xl font-bold", simulationResult.potentialPnL >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                    ${simulationResult.potentialPnL.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 text-center">
                                                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Est. ROI</div>
                                                <div className={cn("text-2xl font-bold", simulationResult.roi >= 0 ? "text-emerald-400" : "text-rose-400")}>
                                                    {simulationResult.roi.toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden">
                                            <div className="p-3 bg-zinc-900/80 border-b border-zinc-800 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                                                Matched Opportunities
                                            </div>
                                            <div className="max-h-60 overflow-y-auto">
                                                {simulationResult.trades.length > 0 ? (
                                                    <table className="w-full text-left text-sm text-zinc-400">
                                                        <thead className="text-xs text-zinc-600 bg-zinc-900/50 sticky top-0">
                                                            <tr>
                                                                <th className="p-3">Matchup</th>
                                                                <th className="p-3">Edge</th>
                                                                <th className="p-3">Conf</th>
                                                                <th className="p-3 text-right">Exp. Value</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-zinc-800/50">
                                                            {simulationResult.trades.map(g => {
                                                                const modelProb = g.prediction.stat_model_prob;
                                                                const marketPrice = g.market_data.price / 100;
                                                                const ev = Math.abs(modelProb - marketPrice) * activeStrategy.betSize;
                                                                return (
                                                                    <tr key={g.game_id} className="hover:bg-zinc-800/30">
                                                                        <td className="p-3 font-medium text-white">{g.away_abbr} @ {g.home_abbr}</td>
                                                                        <td className="p-3 font-mono text-emerald-400">{(g.prediction.divergence * 100).toFixed(1)}%</td>
                                                                        <td className="p-3">
                                                                            <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-bold", 
                                                                                g.prediction.confidence_score === 'HIGH' ? "bg-emerald-500/10 text-emerald-400" :
                                                                                g.prediction.confidence_score === 'MEDIUM' ? "bg-amber-500/10 text-amber-400" :
                                                                                "bg-zinc-500/10 text-zinc-400"
                                                                            )}>
                                                                                {g.prediction.confidence_score}
                                                                            </span>
                                                                        </td>
                                                                        <td className="p-3 text-right font-mono text-zinc-200">${ev.toFixed(2)}</td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <div className="p-8 text-center text-zinc-500 text-sm">No games match these criteria.</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StrategyLab;



import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Save, Trash2, TrendingUp, AlertCircle, DollarSign } from 'lucide-react';
import type { Game } from '../lib/api';
import { cn } from './ui/shared';

interface Strategy {
    id: string;
    name: string;
    minDivergence: number;
    minConfidence: 'ALL' | 'MEDIUM' | 'HIGH';
    betSize: number;
    useKelly: boolean;
    kellyMultiplier: number;
    bankroll: number;
}

interface ScenarioOutcome {
    finalBankroll: number;
    netProfit: number;
    winningBets: number;
    roi: number;
}

interface MonteCarloResults {
    outcomes: number[];
    winRate: number;
    maxDrawdown: number;
    probabilityOfProfit: number;
    valueAtRisk5: number;
    median: number;
    valueAtRisk95: number;
    scenarios: {
        pessimistic: ScenarioOutcome;
        expected: ScenarioOutcome;
        optimistic: ScenarioOutcome;
    };
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
        betSize: 100,
        useKelly: false,
        kellyMultiplier: 0.25,
        bankroll: 10000
    });
    const [simulationResult, setSimulationResult] = useState<{
        matches: number;
        potentialPnL: number;
        roi: number;
        trades: Game[];
    } | null>(null);
    const [monteCarloResults, setMonteCarloResults] = useState<MonteCarloResults | null>(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const [simulationProgress, setSimulationProgress] = useState(0);
    const [currentIteration, setCurrentIteration] = useState(0);

    // Load strategies
    useEffect(() => {
        const stored = localStorage.getItem('kalshi-strategies');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Migrate old strategies to new format
                const migrated = parsed.map((s: any) => ({
                    ...s,
                    useKelly: s.useKelly ?? false,
                    kellyMultiplier: s.kellyMultiplier ?? 0.25,
                    bankroll: s.bankroll ?? 10000
                }));
                setStrategies(migrated);
            } catch (e) {
                console.error('Failed to load strategies:', e);
            }
        }
    }, []);

    const saveStrategies = (newStrategies: Strategy[]) => {
        setStrategies(newStrategies);
        localStorage.setItem('kalshi-strategies', JSON.stringify(newStrategies));
    };

    const calculateKellyBet = (modelProb: number, marketPrice: number, bankroll: number, multiplier: number): number => {
        const edge = modelProb - marketPrice;
        if (edge <= 0) return 0;

        const odds = (1 - marketPrice) / marketPrice;
        const kellyFraction = edge / odds;
        const adjustedKelly = Math.max(0, kellyFraction * multiplier);

        // Cap at 25% of bankroll for safety
        return Math.min(bankroll * adjustedKelly, bankroll * 0.25);
    };

    const runMonteCarloSimulation = (trades: Game[], iterations: number = 10000): MonteCarloResults => {
        const { bankroll, useKelly, kellyMultiplier, betSize } = activeStrategy;
        const outcomes: number[] = [];

        for (let sim = 0; sim < iterations; sim++) {
            // Update progress every 100 iterations for smooth animation
            if (sim % 100 === 0) {
                setCurrentIteration(sim);
                setSimulationProgress((sim / iterations) * 100);
            }

            let currentBankroll = bankroll;
            let wins = 0;

            for (const game of trades) {
                const modelProb = game.prediction.stat_model_prob;
                const marketPrice = game.market_data.price / 100;

                // Calculate bet amount
                let betAmount: number;
                if (useKelly) {
                    betAmount = calculateKellyBet(modelProb, marketPrice, currentBankroll, kellyMultiplier);
                } else {
                    betAmount = Math.min(betSize, currentBankroll);
                }

                if (betAmount <= 0 || currentBankroll <= 0) break;

                // Simulate outcome
                const won = Math.random() < modelProb;
                if (won) {
                    const payoff = betAmount / marketPrice;
                    currentBankroll += payoff - betAmount;
                    wins++;
                } else {
                    currentBankroll -= betAmount;
                }

                if (currentBankroll <= 0) {
                    currentBankroll = 0;
                    break;
                }
            }

            outcomes.push(currentBankroll);
        }

        // Sort for percentile calculations
        outcomes.sort((a, b) => a - b);

        const getPercentile = (arr: number[], p: number) => {
            const idx = Math.floor(arr.length * p);
            return arr[Math.min(idx, arr.length - 1)];
        };

        const p5 = getPercentile(outcomes, 0.05);
        const p10 = getPercentile(outcomes, 0.10);
        const p50 = getPercentile(outcomes, 0.50);
        const p90 = getPercentile(outcomes, 0.90);
        const p95 = getPercentile(outcomes, 0.95);

        const profitableCount = outcomes.filter(o => o > bankroll).length;
        const probabilityOfProfit = profitableCount / iterations;

        // Calculate max drawdown
        let maxDrawdown = 0;
        for (const outcome of outcomes) {
            const drawdown = Math.max(0, (bankroll - outcome) / bankroll);
            maxDrawdown = Math.max(maxDrawdown, drawdown);
        }

        // Calculate win rate from average model probability
        const avgModelProb = trades.reduce((sum, g) => sum + g.prediction.stat_model_prob, 0) / trades.length;

        const createScenario = (finalBankroll: number): ScenarioOutcome => ({
            finalBankroll,
            netProfit: finalBankroll - bankroll,
            winningBets: Math.round(trades.length * avgModelProb),
            roi: ((finalBankroll - bankroll) / bankroll) * 100
        });

        return {
            outcomes,
            winRate: avgModelProb,
            maxDrawdown,
            probabilityOfProfit,
            valueAtRisk5: p5,
            median: p50,
            valueAtRisk95: p95,
            scenarios: {
                pessimistic: createScenario(p10),
                expected: createScenario(p50),
                optimistic: createScenario(p90)
            }
        };
    };

    const runSimulation = async () => {
        setIsSimulating(true);
        setSimulationResult(null);
        setMonteCarloResults(null);
        setSimulationProgress(0);
        setCurrentIteration(0);

        // Small delay for UI feedback
        await new Promise(resolve => setTimeout(resolve, 100));

        const trades = games.filter(g => {
            const div = g.prediction?.divergence ?? 0;
            const conf = g.prediction?.confidence_score ?? 'LOW';

            if (div < activeStrategy.minDivergence) return false;
            if (activeStrategy.minConfidence === 'HIGH' && conf !== 'HIGH') return false;
            if (activeStrategy.minConfidence === 'MEDIUM' && conf === 'LOW') return false;

            return true;
        });

        // Calculate theoretical EV
        let totalEV = 0;
        let totalRisk = 0;

        trades.forEach(g => {
            const modelProb = g.prediction.stat_model_prob;
            const marketPrice = g.market_data.price / 100;
            const direction = modelProb > marketPrice ? 1 : -1;

            let evPerDollar = 0;
            if (direction === 1) {
                evPerDollar = (modelProb - marketPrice);
            } else {
                evPerDollar = ((1 - modelProb) - (1 - marketPrice));
            }

            const betAmount = activeStrategy.useKelly
                ? calculateKellyBet(modelProb, marketPrice, activeStrategy.bankroll, activeStrategy.kellyMultiplier)
                : activeStrategy.betSize;

            totalEV += evPerDollar * betAmount;
            totalRisk += betAmount;
        });

        setSimulationResult({
            matches: trades.length,
            potentialPnL: totalEV,
            roi: totalRisk > 0 ? (totalEV / totalRisk) * 100 : 0,
            trades
        });

        // Run Monte Carlo
        if (trades.length > 0) {
            const mcResults = runMonteCarloSimulation(trades);
            setMonteCarloResults(mcResults);
            setSimulationProgress(100);
        }

        setIsSimulating(false);
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
                betSize: 100,
                useKelly: false,
                kellyMultiplier: 0.25,
                bankroll: 10000
            });
            setSimulationResult(null);
            setMonteCarloResults(null);
        }
    };

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <TrendingUp className="text-emerald-400" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Strategy Lab</h2>
                                    <p className="text-sm text-zinc-500">Monte Carlo Simulation & Kelly Criterion</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Strategy Name */}
                            <div>
                                <input
                                    type="text"
                                    value={activeStrategy.name}
                                    onChange={(e) => setActiveStrategy({ ...activeStrategy, name: e.target.value })}
                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    placeholder="Strategy Name"
                                />
                            </div>

                            {/* Parameters */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Min Divergence */}
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                                        Min Divergence: {(activeStrategy.minDivergence * 100).toFixed(0)}%
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="30"
                                        value={activeStrategy.minDivergence * 100}
                                        onChange={(e) => setActiveStrategy({ ...activeStrategy, minDivergence: Number(e.target.value) / 100 })}
                                        className="w-full accent-emerald-500"
                                    />
                                </div>

                                {/* Confidence */}
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                                        Min Confidence
                                    </label>
                                    <select
                                        value={activeStrategy.minConfidence}
                                        onChange={(e) => setActiveStrategy({ ...activeStrategy, minConfidence: e.target.value as any })}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="ALL">All Levels</option>
                                        <option value="MEDIUM">Medium+</option>
                                        <option value="HIGH">High Only</option>
                                    </select>
                                </div>

                                {/* Bankroll */}
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <DollarSign size={12} />
                                        Starting Bankroll
                                    </label>
                                    <input
                                        type="number"
                                        value={activeStrategy.bankroll}
                                        onChange={(e) => setActiveStrategy({ ...activeStrategy, bankroll: Number(e.target.value) })}
                                        className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>

                                {/* Kelly Toggle */}
                                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                                    <label className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Use Kelly Criterion</span>
                                        <button
                                            onClick={() => setActiveStrategy({ ...activeStrategy, useKelly: !activeStrategy.useKelly })}
                                            className={cn(
                                                "relative w-12 h-6 rounded-full transition-colors",
                                                activeStrategy.useKelly ? "bg-emerald-500" : "bg-zinc-700"
                                            )}
                                        >
                                            <div className={cn(
                                                "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                                                activeStrategy.useKelly ? "left-7" : "left-1"
                                            )} />
                                        </button>
                                    </label>
                                    {activeStrategy.useKelly && (
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 mb-2">
                                                Kelly Multiplier: {activeStrategy.kellyMultiplier.toFixed(2)}x
                                            </label>
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="1"
                                                step="0.05"
                                                value={activeStrategy.kellyMultiplier}
                                                onChange={(e) => setActiveStrategy({ ...activeStrategy, kellyMultiplier: Number(e.target.value) })}
                                                className="w-full accent-emerald-500"
                                            />
                                        </div>
                                    )}
                                    {!activeStrategy.useKelly && (
                                        <div>
                                            <label className="block text-[10px] text-zinc-500 mb-2">Fixed Bet Size</label>
                                            <input
                                                type="number"
                                                value={activeStrategy.betSize}
                                                onChange={(e) => setActiveStrategy({ ...activeStrategy, betSize: Number(e.target.value) })}
                                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white text-sm font-mono"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Run Button */}
                            <button
                                onClick={runSimulation}
                                disabled={isSimulating}
                                className="w-full py-4 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl font-bold text-white flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 relative overflow-hidden"
                            >
                                {isSimulating && (
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                        initial={{ x: '-100%' }}
                                        animate={{ x: '200%' }}
                                        transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                                    />
                                )}
                                <Play size={20} className={isSimulating ? "animate-pulse" : ""} />
                                {isSimulating ? `Running Simulation... (${currentIteration.toLocaleString()}/10,000)` : 'Run Monte Carlo Simulation'}
                            </button>

                            {/* Simulation Animation */}
                            <AnimatePresence>
                                {isSimulating && simulationResult && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-6 space-y-4">
                                            {/* Progress Bar */}
                                            <div>
                                                <div className="flex justify-between text-xs text-emerald-400 mb-2">
                                                    <span className="font-bold">Monte Carlo Simulation</span>
                                                    <span className="font-mono">{simulationProgress.toFixed(1)}%</span>
                                                </div>
                                                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                                                    <motion.div
                                                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${simulationProgress}%` }}
                                                        transition={{ duration: 0.3 }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Card Deck Animation */}
                                            <div className="relative h-32 flex items-center justify-center">
                                                <div className="relative w-full max-w-md">
                                                    {/* Background cards */}
                                                    {[...Array(5)].map((_, i) => (
                                                        <motion.div
                                                            key={i}
                                                            className="absolute inset-0 mx-auto w-48 h-28 bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700 rounded-lg shadow-xl"
                                                            initial={{ scale: 1 - i * 0.05, y: i * -4, opacity: 0.7 - i * 0.15 }}
                                                            animate={{
                                                                scale: 1 - i * 0.05,
                                                                y: i * -4,
                                                                rotateZ: Math.sin((currentIteration / 100 + i) * 0.5) * 5,
                                                                opacity: 0.7 - i * 0.15
                                                            }}
                                                            transition={{ duration: 0.5 }}
                                                            style={{ zIndex: 5 - i }}
                                                        />
                                                    ))}

                                                    {/* Active card */}
                                                    <motion.div
                                                        className="absolute inset-0 mx-auto w-48 h-28 bg-gradient-to-br from-emerald-600 to-blue-600 border border-emerald-400 rounded-lg shadow-2xl shadow-emerald-500/50"
                                                        animate={{
                                                            rotateY: [0, 180, 360],
                                                            scale: [1, 1.1, 1]
                                                        }}
                                                        transition={{
                                                            duration: 2,
                                                            repeat: Infinity,
                                                            ease: "easeInOut"
                                                        }}
                                                        style={{ zIndex: 10 }}
                                                    >
                                                        <div className="absolute inset-0 flex items-center justify-center">
                                                            <div className="text-center">
                                                                <div className="text-white font-bold text-lg">Simulating</div>
                                                                <div className="text-emerald-200 text-xs font-mono">
                                                                    {simulationResult.trades.length} games
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {/* Sparkle effects */}
                                                        <motion.div
                                                            className="absolute -top-2 -right-2 w-4 h-4 bg-white rounded-full"
                                                            animate={{
                                                                scale: [0, 1, 0],
                                                                opacity: [0, 1, 0]
                                                            }}
                                                            transition={{
                                                                duration: 1.5,
                                                                repeat: Infinity,
                                                                delay: 0
                                                            }}
                                                        />
                                                        <motion.div
                                                            className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-300 rounded-full"
                                                            animate={{
                                                                scale: [0, 1, 0],
                                                                opacity: [0, 1, 0]
                                                            }}
                                                            transition={{
                                                                duration: 1.5,
                                                                repeat: Infinity,
                                                                delay: 0.5
                                                            }}
                                                        />
                                                    </motion.div>
                                                </div>
                                            </div>

                                            {/* Stats */}
                                            <div className="grid grid-cols-3 gap-3 text-center">
                                                <div>
                                                    <div className="text-2xl font-bold text-white font-mono">
                                                        {currentIteration.toLocaleString()}
                                                    </div>
                                                    <div className="text-xs text-zinc-400">Iterations</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-emerald-400 font-mono">
                                                        {simulationResult.trades.length}
                                                    </div>
                                                    <div className="text-xs text-zinc-400">Games</div>
                                                </div>
                                                <div>
                                                    <div className="text-2xl font-bold text-blue-400 font-mono">
                                                        10K
                                                    </div>
                                                    <div className="text-xs text-zinc-400">Target</div>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Results */}
                            {simulationResult && monteCarloResults && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-6"
                                >
                                    {/* Risk Metrics */}
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 rounded-xl p-4">
                                            <div className="text-xs text-blue-400 uppercase tracking-wider mb-1">Win Rate</div>
                                            <div className="text-2xl font-bold text-white">{(monteCarloResults.winRate * 100).toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 rounded-xl p-4">
                                            <div className="text-xs text-purple-400 uppercase tracking-wider mb-1">Max Drawdown</div>
                                            <div className="text-2xl font-bold text-white">{(monteCarloResults.maxDrawdown * 100).toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20 rounded-xl p-4">
                                            <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Profit Prob</div>
                                            <div className="text-2xl font-bold text-white">{(monteCarloResults.probabilityOfProfit * 100).toFixed(1)}%</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 rounded-xl p-4">
                                            <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">Trades</div>
                                            <div className="text-2xl font-bold text-white">{simulationResult.matches}</div>
                                        </div>
                                    </div>

                                    {/* Scenario Outcomes */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                                            <div className="text-xs text-red-400 uppercase tracking-wider mb-3">Pessimistic (10th %ile)</div>
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="text-xs text-zinc-500">Final Bankroll</div>
                                                    <div className="text-lg font-bold text-white">${monteCarloResults.scenarios.pessimistic.finalBankroll.toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-500">Net Profit</div>
                                                    <div className={cn("text-lg font-bold", monteCarloResults.scenarios.pessimistic.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                        ${monteCarloResults.scenarios.pessimistic.netProfit.toFixed(0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-800/50 border border-emerald-500/30 rounded-xl p-4">
                                            <div className="text-xs text-emerald-400 uppercase tracking-wider mb-3">Expected (Median)</div>
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="text-xs text-zinc-500">Final Bankroll</div>
                                                    <div className="text-lg font-bold text-white">${monteCarloResults.scenarios.expected.finalBankroll.toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-500">Net Profit</div>
                                                    <div className={cn("text-lg font-bold", monteCarloResults.scenarios.expected.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                        ${monteCarloResults.scenarios.expected.netProfit.toFixed(0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                                            <div className="text-xs text-blue-400 uppercase tracking-wider mb-3">Optimistic (90th %ile)</div>
                                            <div className="space-y-2">
                                                <div>
                                                    <div className="text-xs text-zinc-500">Final Bankroll</div>
                                                    <div className="text-lg font-bold text-white">${monteCarloResults.scenarios.optimistic.finalBankroll.toFixed(0)}</div>
                                                </div>
                                                <div>
                                                    <div className="text-xs text-zinc-500">Net Profit</div>
                                                    <div className={cn("text-lg font-bold", monteCarloResults.scenarios.optimistic.netProfit >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                        ${monteCarloResults.scenarios.optimistic.netProfit.toFixed(0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Trades Table */}
                                    <div className="bg-zinc-800/30 border border-zinc-700 rounded-xl overflow-hidden">
                                        <div className="p-4 bg-zinc-800/50 border-b border-zinc-700">
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Matching Opportunities ({simulationResult.trades.length})</h3>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto">
                                            {simulationResult.trades.length > 0 ? (
                                                <table className="w-full text-sm">
                                                    <thead className="text-xs text-zinc-500 border-b border-zinc-700/50">
                                                        <tr>
                                                            <th className="p-3 text-left">Game</th>
                                                            <th className="p-3 text-right">Divergence</th>
                                                            <th className="p-3 text-center">Confidence</th>
                                                            <th className="p-3 text-right">Bet Size</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-zinc-800/50">
                                                        {simulationResult.trades.map((game, idx) => {
                                                            const modelProb = game.prediction.stat_model_prob;
                                                            const marketPrice = game.market_data.price / 100;
                                                            const betAmount = activeStrategy.useKelly
                                                                ? calculateKellyBet(modelProb, marketPrice, activeStrategy.bankroll, activeStrategy.kellyMultiplier)
                                                                : activeStrategy.betSize;

                                                            return (
                                                                <tr key={idx} className="hover:bg-zinc-800/30">
                                                                    <td className="p-3 text-white font-medium">
                                                                        {game.away_abbr} @ {game.home_abbr}
                                                                    </td>
                                                                    <td className="p-3 text-right text-emerald-400 font-mono">{((game.prediction?.divergence ?? 0) * 100).toFixed(1)}%</td>
                                                                    <td className="p-3 text-center">
                                                                        <span className={cn(
                                                                            "px-2 py-1 rounded text-xs font-bold",
                                                                            game.prediction?.confidence_score === 'HIGH' ? "bg-emerald-500/20 text-emerald-400" :
                                                                                game.prediction?.confidence_score === 'MEDIUM' ? "bg-amber-500/20 text-amber-400" :
                                                                                    "bg-zinc-500/20 text-zinc-400"
                                                                        )}>
                                                                            {game.prediction?.confidence_score}
                                                                        </span>
                                                                    </td>
                                                                    <td className="p-3 text-right text-white font-mono">${betAmount.toFixed(0)}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            ) : (
                                                <div className="p-12 text-center">
                                                    <AlertCircle className="mx-auto text-zinc-600 mb-2" size={32} />
                                                    <p className="text-zinc-500 text-sm">No games match these criteria</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-zinc-800 flex justify-between">
                            <button
                                onClick={() => setActiveStrategy({
                                    id: 'new',
                                    name: 'New Strategy',
                                    minDivergence: 0.10,
                                    minConfidence: 'MEDIUM',
                                    betSize: 100,
                                    useKelly: false,
                                    kellyMultiplier: 0.25,
                                    bankroll: 10000
                                })}
                                className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                            >
                                Clear
                            </button>
                            <div className="flex gap-2">
                                {activeStrategy.id !== 'new' && (
                                    <button
                                        onClick={() => handleDelete(activeStrategy.id)}
                                        className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Delete
                                    </button>
                                )}
                                <button
                                    onClick={handleSave}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                >
                                    <Save size={16} />
                                    Save Strategy
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StrategyLab;

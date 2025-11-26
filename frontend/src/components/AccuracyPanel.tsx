import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, type AccuracyMetrics } from '../lib/api';
import { TrendingUp, Target, Award, BarChart3, AlertCircle } from 'lucide-react';
import { cn } from './ui/shared';

interface AccuracyPanelProps {
    className?: string;
}

const AccuracyPanel: React.FC<AccuracyPanelProps> = ({ className }) => {
    const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [daysBack, setDaysBack] = useState(30);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await api.getAccuracyMetrics(daysBack);
                setMetrics(data);
            } catch (err) {
                console.error('Failed to fetch accuracy metrics:', err);
                setError('Failed to load accuracy data');
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, [daysBack]);

    if (loading) {
        return (
            <div className={cn("bg-surface border border-zinc-800 rounded-xl p-6", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <Target className="text-primary" size={20} />
                    <h3 className="text-lg font-bold text-white">Prediction Accuracy</h3>
                </div>
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </div>
        );
    }

    if (error || !metrics || metrics.total_predictions === 0) {
        return (
            <div className={cn("bg-surface border border-zinc-800 rounded-xl p-6", className)}>
                <div className="flex items-center gap-2 mb-4">
                    <Target className="text-primary" size={20} />
                    <h3 className="text-lg font-bold text-white">Prediction Accuracy</h3>
                </div>
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="text-zinc-600 mb-2" size={32} />
                    <p className="text-zinc-500 text-sm">
                        {error || 'No verified predictions yet'}
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">
                        Predictions will be tracked once games are completed
                    </p>
                </div>
            </div>
        );
    }

    const accuracyPercent = (metrics.accuracy * 100).toFixed(1);
    const brierScore = metrics.brier_score.toFixed(3);

    return (
        <div className={cn("bg-surface border border-zinc-800 rounded-xl p-6", className)}>
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Target className="text-primary" size={20} />
                    <h3 className="text-lg font-bold text-white">Prediction Accuracy</h3>
                </div>
                <select
                    value={daysBack}
                    onChange={(e) => setDaysBack(Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={90}>Last 90 days</option>
                    <option value={365}>Last year</option>
                </select>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50"
                >
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
                        <Award size={12} />
                        Accuracy
                    </div>
                    <div className="text-2xl font-bold text-primary">{accuracyPercent}%</div>
                    <div className="text-xs text-zinc-600 mt-1">
                        {metrics.total_predictions} predictions
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50"
                >
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
                        <BarChart3 size={12} />
                        Brier Score
                    </div>
                    <div className="text-2xl font-bold text-blue-400">{brierScore}</div>
                    <div className="text-xs text-zinc-600 mt-1">
                        Lower is better
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50"
                >
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
                        <TrendingUp size={12} />
                        Wins
                    </div>
                    <div className="text-2xl font-bold text-emerald-400">
                        {Math.round(metrics.accuracy * metrics.total_predictions)}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                        Correct predictions
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-800/50"
                >
                    <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
                        <AlertCircle size={12} />
                        Losses
                    </div>
                    <div className="text-2xl font-bold text-red-400">
                        {Math.round((1 - metrics.accuracy) * metrics.total_predictions)}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1">
                        Incorrect predictions
                    </div>
                </motion.div>
            </div>

            {/* Model Breakdown */}
            {metrics.by_model && Object.keys(metrics.by_model).length > 0 && (
                <div className="border-t border-zinc-800 pt-4">
                    <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                        Model Performance
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(metrics.by_model).map(([modelName, modelMetrics]) => (
                            <div
                                key={modelName}
                                className="bg-zinc-900/30 rounded-lg p-3 border border-zinc-800/30"
                            >
                                <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
                                    {modelName.replace('_', ' ')}
                                </div>
                                <div className="text-lg font-bold text-white">
                                    {(modelMetrics.accuracy * 100).toFixed(1)}%
                                </div>
                                <div className="text-[10px] text-zinc-600">
                                    {modelMetrics.count} games
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccuracyPanel;

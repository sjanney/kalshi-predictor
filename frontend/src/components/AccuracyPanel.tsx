import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api, type AccuracyMetrics, type CalibrationStatus } from '../lib/api';
import { TrendingUp, Target, Award, BarChart3, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { cn } from './ui/shared';

interface AccuracyPanelProps {
    className?: string;
}

const AccuracyPanel: React.FC<AccuracyPanelProps> = ({ className }) => {
    const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
    const [calibrationStatus, setCalibrationStatus] = useState<CalibrationStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [daysBack, setDaysBack] = useState(30);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            setError(null);

            // Fetch both metrics and calibration status
            const [metricsData, calibrationData] = await Promise.all([
                api.getAccuracyMetrics(daysBack),
                api.getCalibrationStatus().catch(() => null) // Don't fail if calibration not available
            ]);

            setMetrics(metricsData);
            setCalibrationStatus(calibrationData);
            setLastUpdated(new Date());
        } catch (err) {
            console.error('Failed to fetch accuracy metrics:', err);
            setError('Failed to load accuracy data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();

        // Auto-refresh every 60 seconds
        const interval = setInterval(() => {
            fetchData(false);
        }, 60000);

        return () => clearInterval(interval);
    }, [daysBack]);

    const handleManualRefresh = async () => {
        setRefreshing(true);
        await fetchData(false);
    };

    const getCalibrationBadge = () => {
        if (!calibrationStatus) return null;

        if (!calibrationStatus.calibrated) {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-md border border-zinc-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500"></div>
                    <span className="text-[10px] text-zinc-400 uppercase tracking-wider">Not Calibrated</span>
                </div>
            );
        }

        // Check if calibration is recent (within 24 hours)
        const lastCal = calibrationStatus.last_calibrated ? new Date(calibrationStatus.last_calibrated) : null;
        const hoursAgo = lastCal ? (Date.now() - lastCal.getTime()) / (1000 * 60 * 60) : Infinity;

        if (hoursAgo < 24) {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-md border border-emerald-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider">Calibrated</span>
                </div>
            );
        } else if (hoursAgo < 168) { // 1 week
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 rounded-md border border-amber-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                    <span className="text-[10px] text-amber-400 uppercase tracking-wider">Needs Calibration</span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded-md border border-red-500/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                    <span className="text-[10px] text-red-400 uppercase tracking-wider">Stale Calibration</span>
                </div>
            );
        }
    };

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
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <Target className="text-primary" size={20} />
                    <h3 className="text-lg font-bold text-white">Prediction Accuracy</h3>
                    {getCalibrationBadge()}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        className="p-2 hover:bg-zinc-800 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh data"
                    >
                        <RefreshCw
                            size={16}
                            className={cn("text-zinc-400", refreshing && "animate-spin")}
                        />
                    </button>
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
            </div>

            {/* Last Updated */}
            {lastUpdated && (
                <div className="flex items-center gap-2 mb-4 text-xs text-zinc-500">
                    <Zap size={12} className="text-primary" />
                    <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
                </div>
            )}

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

            {/* Model Breakdown with Calibration Info */}
            {metrics.by_model && Object.keys(metrics.by_model).length > 0 && (
                <div className="border-t border-zinc-800 pt-4">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            Model Performance
                        </h4>
                        {calibrationStatus?.calibrated && (
                            <span className="text-[10px] text-zinc-500">
                                {calibrationStatus.calibration_count} calibration{calibrationStatus.calibration_count !== 1 ? 's' : ''} run
                            </span>
                        )}
                    </div>
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
                                    {modelMetrics.count} games · Brier {modelMetrics.brier_score.toFixed(3)}
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

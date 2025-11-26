import React, { memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Game, Injury, League } from '../lib/api';
import { api } from '../lib/api';
import { Card, Badge, cn } from './ui/shared';
import { TrendingUp, TrendingDown, Activity, BarChart2, DollarSign, UserMinus, CheckCircle, X } from 'lucide-react';

interface GameCardProps {
    game: Game;
    onSelect?: (game: Game) => void;
}

// Prefetch cache for game details
const prefetchCache = new Map<string, Promise<Game>>();
const PREFETCH_DELAY = 500; // Wait 500ms before prefetching

const GameCardComponent: React.FC<GameCardProps> = ({ game, onSelect }) => {
    const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    // Prefetch game details on hover
    const handleMouseEnter = useCallback(() => {
        // Clear any existing timeout
        if (prefetchTimeoutRef.current) {
            clearTimeout(prefetchTimeoutRef.current);
        }

        // Prefetch after a short delay to avoid prefetching on accidental hovers
        prefetchTimeoutRef.current = setTimeout(() => {
            const gameId = game.game_id;
            const league = (game.league || 'nba') as League;

            // Check if already prefetched or in progress
            if (prefetchCache.has(gameId)) {
                return;
            }

            // Start prefetch
            const prefetchPromise = api.getGameDetails(gameId, { league })
                .catch(() => {
                    // Silently fail - prefetch errors shouldn't break the UI
                    prefetchCache.delete(gameId);
                    return undefined;
                }) as Promise<Game>;

            prefetchCache.set(gameId, prefetchPromise);
        }, PREFETCH_DELAY);
    }, [game.game_id, game.league]);

    const handleMouseLeave = useCallback(() => {
        // Clear prefetch timeout if user moves mouse away
        if (prefetchTimeoutRef.current) {
            clearTimeout(prefetchTimeoutRef.current);
            prefetchTimeoutRef.current = null;
        }
    }, []);




    const { prediction, factors, market_data, league, market_context } = game;

    // stat_model_prob is the core statistical model (weighted ensemble of Elo, Form, Record, H2H)
    // This is what users see as the "Model" prediction
    const homeModelProb = prediction.stat_model_prob;
    const awayModelProb = 1 - homeModelProb;

    // home_win_prob is the final blended prediction (Model + Market + adjustments)
    const homeFinalProb = prediction.home_win_prob;
    const awayFinalProb = 1 - homeFinalProb;

    const recommendationColor =
        prediction.recommendation.includes("Follow") ? "text-emerald-400" :
            prediction.recommendation.includes("Fade") ? "text-amber-400" :
                "text-zinc-400";

    // Extract injury counts and impact
    const homeInjuries: Injury[] = market_context?.injuries?.home || [];
    const awayInjuries: Injury[] = market_context?.injuries?.away || [];
    const homeInjuryCount = homeInjuries.length;
    const awayInjuryCount = awayInjuries.length;

    // Get injury impact data
    const homeImpact = market_context?.injury_impact?.home;
    const awayImpact = market_context?.injury_impact?.away;

    // Check if teams have players "Out" (most significant)
    const homeHasOutPlayers = homeInjuries.some((inj: Injury) => inj.status === 'Out');
    const awayHasOutPlayers = awayInjuries.some((inj: Injury) => inj.status === 'Out');

    // Check for critical injuries
    const homeCritical = homeImpact?.severity === 'CRITICAL' || homeImpact?.severity === 'HIGH';
    const awayCritical = awayImpact?.severity === 'CRITICAL' || awayImpact?.severity === 'HIGH';

    // Determine if game is live or final
    const isFinal = game.status?.toLowerCase().includes('final');
    const isScheduled = !game.status || game.status?.includes('PM') || game.status?.includes('AM') || game.status === 'Scheduled';
    const isLive = !isFinal && !isScheduled;

    // Parse scores (ensure they exist)
    const showScores = (isLive || isFinal) && (game.home_score !== undefined && game.away_score !== undefined);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -5 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <Card onClick={() => onSelect?.(game)} className="group relative hover:shadow-xl hover:shadow-black/50 hover:border-zinc-700 transition-all duration-300">
                <div className="absolute -top-3 left-4">
                    <Badge variant="outline" className="text-[9px] tracking-[0.2em] font-bold bg-background border-zinc-700">
                        {league?.toUpperCase() ?? 'NBA'}
                    </Badge>
                </div>
                {/* Injury Alert & Divergence Badges (Absolute - Top Right) */}
                <div className="absolute top-2 right-2 flex gap-1.5 z-10">
                    {/* Win/Loss Prediction Badge for Final Games */}
                    {isFinal && game.home_score !== undefined && game.away_score !== undefined && (() => {
                        const homeWon = Number(game.home_score) > Number(game.away_score);
                        const predictedHomeWin = prediction.home_win_prob > 0.5;
                        const predictionCorrect = homeWon === predictedHomeWin;

                        return (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                title={`Prediction ${predictionCorrect ? 'Correct' : 'Incorrect'}: ${predictedHomeWin ? game.home_abbr : game.away_abbr} to win`}
                            >
                                <Badge
                                    variant={predictionCorrect ? "success" : "danger"}
                                    className="flex items-center gap-1 shadow-sm font-bold"
                                >
                                    {predictionCorrect ? (
                                        <>
                                            <CheckCircle size={10} className="fill-current" />
                                            <span>WIN</span>
                                        </>
                                    ) : (
                                        <>
                                            <X size={10} />
                                            <span>LOSS</span>
                                        </>
                                    )}
                                </Badge>
                            </motion.div>
                        );
                    })()}
                    {(homeCritical || awayCritical) && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <Badge variant="danger" className="flex items-center gap-1 shadow-sm animate-pulse">
                                <UserMinus size={10} />
                                <span>CRITICAL INJ</span>
                            </Badge>
                        </motion.div>
                    )}
                    {(homeHasOutPlayers || awayHasOutPlayers) && !homeCritical && !awayCritical && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <Badge variant="danger" className="flex items-center gap-1 shadow-sm">
                                <UserMinus size={10} />
                                <span>INJ</span>
                            </Badge>
                        </motion.div>
                    )}
                    {prediction.divergence > 0.15 && !isFinal && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                        >
                            <Badge variant="warning" className="flex items-center gap-1 shadow-sm animate-pulse">
                                <Activity size={10} />
                                <span>{Math.round(prediction.divergence * 100)}% EDGE</span>
                            </Badge>
                        </motion.div>
                    )}
                </div>

                <div className="p-5">
                    {/* Teams Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex flex-col gap-1 w-full">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-zinc-500 flex items-center gap-2">
                                        {isLive && (
                                            <span className="flex items-center gap-1 text-red-500 font-bold animate-pulse">
                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                                LIVE
                                            </span>
                                        )}
                                        {game.status}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-lg font-bold text-white tracking-tight">{game.away_team}</span>
                                        {awayInjuryCount > 0 && (
                                            <div
                                                className={cn(
                                                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                    awayCritical
                                                        ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse"
                                                        : awayHasOutPlayers
                                                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                )}
                                                title={`${awayInjuryCount} injury${awayInjuryCount > 1 ? 's' : ''}${awayImpact ? ` - Impact: ${awayImpact.total_impact.toFixed(1)} (${awayImpact.severity})` : ''}${awayInjuries.length > 0 ? ` - ${awayInjuries.map((i: Injury) => `${i.player_name} (${i.status})`).join(', ')}` : ''}`}
                                            >
                                                <UserMinus size={10} />
                                                <span>{awayInjuryCount}</span>
                                                {awayImpact && awayImpact.total_impact > 0 && (
                                                    <span className="text-[9px] opacity-75">({awayImpact.total_impact.toFixed(1)})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {showScores && (
                                            <span className="text-lg font-bold text-white">{game.away_score}</span>
                                        )}
                                        <span className="text-xs text-zinc-600 font-mono">{factors.away_record}</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2 flex-1">
                                        <span className="text-lg font-bold text-white tracking-tight">{game.home_team}</span>
                                        {homeInjuryCount > 0 && (
                                            <div
                                                className={cn(
                                                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
                                                    homeCritical
                                                        ? "bg-rose-500/30 text-rose-300 border border-rose-500/50 animate-pulse"
                                                        : homeHasOutPlayers
                                                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                                            : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                                )}
                                                title={`${homeInjuryCount} injury${homeInjuryCount > 1 ? 's' : ''}${homeImpact ? ` - Impact: ${homeImpact.total_impact.toFixed(1)} (${homeImpact.severity})` : ''}${homeInjuries.length > 0 ? ` - ${homeInjuries.map((i: Injury) => `${i.player_name} (${i.status})`).join(', ')}` : ''}`}
                                            >
                                                <UserMinus size={10} />
                                                <span>{homeInjuryCount}</span>
                                                {homeImpact && homeImpact.total_impact > 0 && (
                                                    <span className="text-[9px] opacity-75">({homeImpact.total_impact.toFixed(1)})</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {showScores && (
                                            <span className="text-lg font-bold text-white">{game.home_score}</span>
                                        )}
                                        <span className="text-xs text-zinc-600 font-mono">{factors.home_record}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prediction Core */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 group-hover:bg-zinc-900/80 transition-colors">
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
                                <BarChart2 size={10} />
                                Model
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-left">
                                    <div className="text-[10px] text-zinc-500 mb-0.5">{game.home_abbr}</div>
                                    <div className="text-lg font-bold text-blue-400">
                                        {(homeModelProb * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-zinc-800/50 mx-2"></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-zinc-500 mb-0.5">{game.away_abbr}</div>
                                    <div className="text-lg font-bold text-blue-200">
                                        {(awayModelProb * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-zinc-600 text-center border-t border-zinc-800/50 pt-1.5 mt-1.5">
                                Model Win Probability
                            </div>
                        </div>
                        <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/50 group-hover:bg-zinc-900/80 transition-colors">
                            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
                                <DollarSign size={10} />
                                Market
                            </div>
                            <div className="flex justify-between items-center mb-1">
                                <div className="text-left">
                                    <div className="text-[10px] text-zinc-500 mb-0.5">{game.home_abbr}</div>
                                    <div className="text-lg font-bold text-emerald-400">
                                        {((prediction.home_kalshi_prob ?? prediction.kalshi_prob) * 100).toFixed(0)}%
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-zinc-800/50 mx-2"></div>
                                <div className="text-right">
                                    <div className="text-[10px] text-zinc-500 mb-0.5">{game.away_abbr}</div>
                                    <div className="text-lg font-bold text-zinc-400">
                                        {((prediction.away_kalshi_prob ?? (1 - prediction.kalshi_prob)) * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>
                            <div className="text-[10px] text-zinc-600 text-center border-t border-zinc-800/50 pt-1.5 mt-1.5">
                                {market_data.volume > 0 ? `$${market_data.volume.toLocaleString()} Vol` : 'Low Vol'}
                            </div>
                        </div>
                    </div>

                    {/* Overall Prediction */}
                    <div className="bg-zinc-900/40 rounded-lg p-3 border border-zinc-800/50 mb-6 group-hover:border-zinc-700/50 transition-colors">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] uppercase tracking-wider mb-2">
                            <TrendingUp size={10} />
                            Final Win Probability
                        </div>
                        <div className="flex justify-between items-center">
                            <div className="text-left">
                                <div className="text-[10px] text-zinc-500 mb-0.5">{game.home_abbr}</div>
                                <div className="text-xl font-bold text-primary">
                                    {(homeFinalProb * 100).toFixed(0)}%
                                </div>
                            </div>
                            <div className="h-8 w-px bg-zinc-800/50 mx-2"></div>
                            <div className="text-right">
                                <div className="text-[10px] text-zinc-500 mb-0.5">{game.away_abbr}</div>
                                <div className="text-xl font-bold text-zinc-300">
                                    {(awayFinalProb * 100).toFixed(0)}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recommendation Banner */}
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-800 group-hover:border-zinc-700 transition-colors">
                        <div>
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-0.5">Signal</div>
                            <div className={cn("font-bold text-sm flex items-center gap-1.5", recommendationColor)}>
                                {prediction.recommendation.includes("Follow") ? <TrendingUp size={14} /> :
                                    prediction.recommendation.includes("Fade") ? <TrendingDown size={14} /> :
                                        <Activity size={14} />}
                                {prediction.recommendation}
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium mb-0.5">Confidence</div>
                            <div className="flex items-center gap-1 justify-end">
                                {[1, 2, 3].map((star) => (
                                    <div
                                        key={star}
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-all duration-300",
                                            (star === 1) || (star === 2 && prediction.confidence_score !== "LOW") || (star === 3 && prediction.confidence_score === "HIGH")
                                                ? "bg-primary shadow-[0_0_5px_rgba(16,185,129,0.5)]"
                                                : "bg-zinc-800"
                                        )}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </Card>
        </motion.div>
    );
};

export default memo(GameCardComponent);

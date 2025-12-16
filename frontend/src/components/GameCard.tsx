import React, { memo, useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Game, Injury, League } from '../lib/api';
import { api } from '../lib/api';
import { Badge, cn } from './ui/shared';
import { UserMinus, Zap, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface GameCardProps {
    game: Game;
    onSelect?: (game: Game) => void;
}

const prefetchCache = new Map<string, Promise<Game>>();
const PREFETCH_DELAY = 500;

const GameCardComponent: React.FC<GameCardProps> = ({ game, onSelect }) => {
    const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const handleMouseEnter = useCallback(() => {
        setIsHovered(true);
        if (prefetchTimeoutRef.current) clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = setTimeout(() => {
            const gameId = game.game_id;
            const league = (game.league || 'nba') as League;
            if (prefetchCache.has(gameId)) return;
            const prefetchPromise = api.getGameDetails(gameId, { league }).catch(() => {
                prefetchCache.delete(gameId);
                return undefined;
            }) as Promise<Game>;
            prefetchCache.set(gameId, prefetchPromise);
        }, PREFETCH_DELAY);
    }, [game.game_id, game.league]);

    const handleMouseLeave = useCallback(() => {
        setIsHovered(false);
        if (prefetchTimeoutRef.current) {
            clearTimeout(prefetchTimeoutRef.current);
            prefetchTimeoutRef.current = null;
        }
    }, []);

    const { prediction, market_data, league, market_context } = game;
    const homeModelProb = prediction.stat_model_prob;
    const marketProb = prediction.home_kalshi_prob ?? prediction.kalshi_prob;

    // Determine Predicted Winner
    const isHomePredicted = homeModelProb > 0.5;
    const predictedTeam = isHomePredicted ? game.home_team : game.away_team;
    const predictedProb = isHomePredicted ? homeModelProb : (1 - homeModelProb);
    const predictedMarketProb = isHomePredicted ? marketProb : (1 - (marketProb || 0.5));

    // Calculate EV
    const ev = (homeModelProb - (marketProb || 0.5)) * (isHomePredicted ? 1 : -1) * 100;

    const homeInjuries: Injury[] = market_context?.injuries?.home || [];
    const awayInjuries: Injury[] = market_context?.injuries?.away || [];
    const homeCritical = market_context?.injury_impact?.home?.severity === 'CRITICAL';
    const awayCritical = market_context?.injury_impact?.away?.severity === 'CRITICAL';

    const isFinal = game.status?.toLowerCase().includes('final') || game.status?.toLowerCase().includes('completed');
    // More robust check for live status
    const isLive = !isFinal && (
        game.status?.toLowerCase().includes('live') ||
        game.status?.toLowerCase().includes('in progress') ||
        (game.status?.includes('Q') && !game.status.includes('PM') && !game.status.includes('AM')) ||
        (game.status?.includes('Half'))
    );

    const homeScore = game.home_score;
    const awayScore = game.away_score;
    const homeWon = isFinal && Number(homeScore) > Number(awayScore);
    const awayWon = isFinal && Number(awayScore) > Number(homeScore);
    const predictionCorrect = isFinal && ((isHomePredicted && homeWon) || (!isHomePredicted && awayWon));

    // Format date safely
    const gameDate = game.game_date ? new Date(game.game_date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric'
    }) : 'TBD';

    return (
        <motion.div
            layoutId={`game-${game.game_id}`}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -4 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => onSelect?.(game)}
            className={cn(
                "rounded-xl p-0 cursor-pointer relative overflow-hidden group border transition-all",
                isFinal
                    ? "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/60 opacity-80 hover:opacity-100"
                    : "glass-card border-white/5 bg-surface/40 hover:bg-surface/60"
            )}
        >
            {/* Status Badge */}
            <div className="absolute top-3 right-3 z-10 flex gap-2">
                {isLive && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Live</span>
                    </div>
                )}
                {isFinal && (
                    <div className="px-2 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 backdrop-blur-md">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Final</span>
                    </div>
                )}
                {!isLive && !isFinal && (
                    <div className="px-2 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 backdrop-blur-md">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{gameDate}</span>
                    </div>
                )}
            </div>

            <div className="p-5">
                {/* Teams & Scores */}
                <div className="flex justify-between items-center mb-6 mt-2">
                    {/* Away Team */}
                    <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center border transition-all relative",
                            awayWon ? "bg-emerald-500/10 border-emerald-500/50" : "bg-zinc-800 border-zinc-700 group-hover:border-zinc-600"
                        )}>
                            <span className="text-lg font-bold text-white">{game.away_abbr}</span>
                            {awayCritical && (
                                <div className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-0.5 border border-zinc-800">
                                    <UserMinus size={14} className="text-red-500" />
                                </div>
                            )}
                        </div>
                        <span className={cn(
                            "text-2xl font-bold tabular-nums",
                            awayWon ? "text-emerald-400" : "text-white"
                        )}>
                            {awayScore ?? '-'}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center max-w-[80px] truncate">
                            {game.away_team}
                        </span>
                    </div>

                    {/* VS / Time */}
                    <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">VS</span>
                    </div>

                    {/* Home Team */}
                    <div className="flex flex-col items-center gap-2">
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center border transition-all relative",
                            homeWon ? "bg-emerald-500/10 border-emerald-500/50" : "bg-zinc-800 border-zinc-700 group-hover:border-zinc-600"
                        )}>
                            <span className="text-lg font-bold text-white">{game.home_abbr}</span>
                            {homeCritical && (
                                <div className="absolute -top-1 -right-1 bg-zinc-900 rounded-full p-0.5 border border-zinc-800">
                                    <UserMinus size={14} className="text-red-500" />
                                </div>
                            )}
                        </div>
                        <span className={cn(
                            "text-2xl font-bold tabular-nums",
                            homeWon ? "text-emerald-400" : "text-white"
                        )}>
                            {homeScore ?? '-'}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-center max-w-[80px] truncate">
                            {game.home_team}
                        </span>
                    </div>
                </div>

                {/* Prediction Bar */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end text-xs">
                        <div className="flex items-center gap-1.5">
                            <Zap size={14} className={cn(
                                isHomePredicted ? "text-emerald-400" : "text-rose-400"
                            )} />
                            <span className="font-bold text-zinc-300">
                                {isHomePredicted ? game.home_abbr : game.away_abbr} to Win
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-500">Model:</span>
                            <span className={cn(
                                "font-mono font-bold",
                                predictedProb > 0.6 ? "text-emerald-400" : "text-white"
                            )}>
                                {(predictedProb * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    {/* Probability Bar */}
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden flex">
                        {/* Market Prob (Gray/Blue) */}
                        <div
                            className="h-full bg-blue-500/30"
                            style={{ width: `${predictedMarketProb * 100}%` }}
                        />
                        {/* Model Edge (Green/Red) */}
                        {ev > 0 && (
                            <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${(predictedProb - predictedMarketProb) * 100}%` }}
                            />
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                        <div className="flex items-center gap-2">
                            <Badge variant={ev > 5 ? "default" : "secondary"} className={cn(
                                "text-[10px] font-bold",
                                ev > 10 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                                    ev > 0 ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                                        "bg-zinc-800 text-zinc-500"
                            )}>
                                {ev > 0 ? '+' : ''}{ev.toFixed(1)}% EV
                            </Badge>
                            {prediction.confidence_score === 'HIGH' && (
                                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                                    HIGH CONF
                                </Badge>
                            )}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500">
                            Vol: ${(market_data?.volume || 0).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default memo(GameCardComponent);

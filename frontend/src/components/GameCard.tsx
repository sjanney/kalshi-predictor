import React, { memo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import type { Game, Injury, League } from '../lib/api';
import { api } from '../lib/api';
import { Badge, cn } from './ui/shared';
import { UserMinus, Zap, CheckCircle } from 'lucide-react';

interface GameCardProps {
    game: Game;
    onSelect?: (game: Game) => void;
}

const prefetchCache = new Map<string, Promise<Game>>();
const PREFETCH_DELAY = 500;

const GameCardComponent: React.FC<GameCardProps> = ({ game, onSelect }) => {
    const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleMouseEnter = useCallback(() => {
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

    const isFinal = game.status?.toLowerCase().includes('final');
    const isLive = !isFinal && (!game.status || !game.status.includes('PM')); // Rough check

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            whileHover={{ y: -4 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => onSelect?.(game)}
            className="glass-card rounded-xl p-0 cursor-pointer relative overflow-hidden group border border-white/5 bg-surface/40 hover:bg-surface/60 transition-all"
        >
            {/* Header / Status Bar */}
            <div className="px-5 py-3 border-b border-white/5 flex justify-between items-center bg-black/20">
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold border-white/10 bg-white/5">
                        {league?.toUpperCase() ?? 'NBA'}
                    </Badge>
                    {isLive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-red-400 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> LIVE
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {prediction.divergence > 0.15 && (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-primary">
                            <Zap size={10} className="fill-primary" /> {Math.round(prediction.divergence * 100)}% EDGE
                        </div>
                    )}
                </div>
            </div>

            <div className="p-5">
                {/* Teams & Scores */}
                <div className="space-y-4 mb-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className={cn("text-lg font-bold", game.away_score && Number(game.away_score) > Number(game.home_score ?? 0) ? "text-white" : "text-zinc-400")}>
                                {game.away_team}
                            </span>
                            {!isHomePredicted && <CheckCircle size={14} className="text-primary" />}
                            {awayInjuries.length > 0 && (
                                <UserMinus size={14} className={awayCritical ? "text-red-500" : "text-amber-500"} />
                            )}
                        </div>
                        <span className="text-xl font-mono font-bold text-white">{game.away_score}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className={cn("text-lg font-bold", game.home_score && Number(game.home_score) > Number(game.away_score ?? 0) ? "text-white" : "text-zinc-400")}>
                                {game.home_team}
                            </span>
                            {isHomePredicted && <CheckCircle size={14} className="text-primary" />}
                            {homeInjuries.length > 0 && (
                                <UserMinus size={14} className={homeCritical ? "text-red-500" : "text-amber-500"} />
                            )}
                        </div>
                        <span className="text-xl font-mono font-bold text-white">{game.home_score}</span>
                    </div>
                </div>

                {/* Key Stats Grid */}
                <div className="grid grid-cols-3 gap-px bg-white/5 rounded-lg overflow-hidden border border-white/5">
                    <div className="bg-black/20 p-3 text-center">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Prediction</div>
                        <div className="text-lg font-bold text-white">{(predictedProb * 100).toFixed(0)}%</div>
                        <div className="text-[10px] text-primary font-bold truncate px-1">{predictedTeam}</div>
                    </div>
                    <div className="bg-black/20 p-3 text-center border-x border-white/5">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Market</div>
                        <div className="text-lg font-bold text-zinc-400">{((predictedMarketProb || 0) * 100).toFixed(0)}%</div>
                        <div className="text-[10px] text-zinc-600 truncate px-1">Implied</div>
                    </div>
                    <div className="bg-black/20 p-3 text-center">
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">EV</div>
                        <div className={cn("text-lg font-bold", ev > 0 ? "text-emerald-400" : "text-red-400")}>
                            {ev > 0 ? '+' : ''}{ev.toFixed(1)}%
                        </div>
                        <div className="text-[10px] text-zinc-600">Return</div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-white/5 flex justify-between items-center bg-white/5">
                <div className="text-[10px] text-zinc-500 font-medium">
                    Vol: <span className="text-zinc-300">${(market_data.volume || 0).toLocaleString()}</span>
                </div>
                <div className="flex gap-1.5">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={cn(
                            "w-1.5 h-1.5 rounded-full transition-all",
                            (i === 1) || (i === 2 && prediction.confidence_score !== "LOW") || (i === 3 && prediction.confidence_score === "HIGH")
                                ? "bg-primary shadow-[0_0_6px_rgba(16,185,129,0.4)]"
                                : "bg-zinc-800"
                        )} />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

export default memo(GameCardComponent);

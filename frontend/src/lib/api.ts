export interface Prediction {
    home_win_prob: number;
    stat_model_prob: number;
    kalshi_prob: number;
    home_kalshi_prob: number;
    away_kalshi_prob: number;
    confidence_score: "HIGH" | "MEDIUM" | "LOW";
    recommendation: string;
    predicted_winner?: string;
    suggested_wager?: string;
    value_proposition?: string;
    signal_strength: string;
    divergence: number;
    volatility: string;
    elo_prob?: number;
    form_prob?: number;
    stat_ensemble_prob?: number; // Replaces ml_prob
}

export interface Insight {
    type: string;
    priority: number;
    title: string;
    description: string;
    action: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
}

export interface Analytics {
    volatility_score?: string;
    stat_divergence: number;
    market_pressure?: number;
    model_features?: {
        home_advantage: number;
        record_diff: number;
        recent_form: number;
        elo_advantage: number;
        injury_impact: number;
    };
    reasoning?: string[];
    insights?: Insight[];
    elo_ratings?: {
        home: number;
        away: number;
        difference: number;
    };
    recent_form?: {
        home: {
            win_pct: number;
            avg_point_diff: number;
            momentum: number;
            strength: string;
            games_analyzed: number;
        };
        away: {
            win_pct: number;
            avg_point_diff: number;
            momentum: number;
            strength: string;
            games_analyzed: number;
        };
    };
    head_to_head?: {
        home_wins: number;
        away_wins: number;
        home_win_pct: number;
        avg_point_diff: number;
        games_played: number;
    };
    model_weights?: {
        stats: number;
        kalshi: number;
        elo: number;
        form: number;
        stat_ensemble: number; // Replaces ml
    };
    context_factors?: {
        home_rest_days: number;
        away_rest_days: number;
        travel_distance_km: number;
        time_zone_shift: number;
        home_is_b2b: boolean;
        away_is_b2b: boolean;
    };
}

export interface MarketData {
    price: number;
    yes_bid: number;
    yes_ask: number;
    volume: number;
    spread?: number;
    spread_pct?: number;
    mid_price?: number;
    open_interest?: number;
    liquidity?: number;
    confidence?: "HIGH" | "MEDIUM" | "LOW";
    daily_change?: number;
}

export interface GameFactors {
    home_record: string;
    away_record: string;
    market_volume: number;
    market_trend: string;
}

export interface Game {
    game_id: string;
    league?: string;
    home_team: string;
    away_team: string;
    home_abbr: string;
    away_abbr: string;
    game_date: string;
    status: string;
    home_score?: number;
    away_score?: number;
    prediction: Prediction;
    analytics?: Analytics;
    market_data: MarketData;
    factors: GameFactors;
    market_context?: MarketContext;
    last_updated?: number; // Timestamp from backend
}

export interface WeatherData {
    location: string;
    temperature: number;
    condition: string;
    wind_speed: string;
    precipitation_chance: number;
    updated_at: string;
    correlation_impact?: {
        score: number;
        severity: "HIGH" | "MEDIUM" | "LOW";
        factors: string[];
        note: string;
    };
}

export interface Injury {
    player_name: string;
    position: string;
    status: string;
    injury_type: string;
    updated_at: string;
    body_part?: string;
    details?: string;
}

export interface InjuryImpact {
    total_impact: number;
    key_players_out: Array<{
        name: string;
        position: string;
        injury_type?: string;
    }>;
    position_breakdown: Record<string, {
        count: number;
        impact: number;
        players: Array<{
            name: string;
            status: string;
            injury_type: string;
        }>;
    }>;
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
    summary: string;
    total_count: number;
}

export interface MarketContext {
    weather?: WeatherData;
    injuries: {
        home: Injury[];
        away: Injury[];
    };
    injury_impact?: {
        home: InjuryImpact;
        away: InjuryImpact;
    };
    news: Array<{
        headline: string;
        source: string;
        sentiment: string;
        url: string;
    }>;
    betting_intelligence?: Array<{
        type: string;
        description: string;
        impact: "HIGH" | "MEDIUM" | "LOW";
    }>;
    social_sentiment?: {
        home_sentiment: number;
        away_sentiment: number;
        trending_topics: string[];
        summary: string;
    };
    expert_predictions?: Array<{
        expert: string;
        outlet: string;
        prediction: string;
        confidence: "HIGH" | "MEDIUM" | "LOW";
    }>;
    recent_stats?: {
        home_trend: string;
        away_trend: string;
        key_stat_diff: string;
    };
    injury_analysis?: {
        home_impact: {
            summary: string;
            severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "NONE";
            key_players_out: Array<{
                name: string;
                position: string;
                injury_type?: string;
            }>;
        };
        away_impact: {
            summary: string;
            severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW" | "NONE";
            key_players_out: Array<{
                name: string;
                position: string;
                injury_type?: string;
            }>;
        };
        matchup_implication: string;
    };
}

export type League = 'nba' | 'nfl';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE = `${BASE_URL}/api`;

// Request cache and deduplication
interface CachedRequest<T> {
    data: T;
    timestamp: number;
    promise?: Promise<T>;
}

const requestCache = new Map<string, CachedRequest<any>>();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache
const MAX_CACHE_SIZE = 50; // Maximum number of cached requests
const pendingRequests = new Map<string, Promise<any>>();

// Cleanup old cache entries periodically
const cleanupCache = () => {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    for (const [key, cached] of requestCache.entries()) {
        if (now - cached.timestamp > CACHE_TTL) {
            entriesToDelete.push(key);
        }
    }

    entriesToDelete.forEach(key => requestCache.delete(key));

    // If cache is still too large, remove oldest entries
    if (requestCache.size > MAX_CACHE_SIZE) {
        const sortedEntries = Array.from(requestCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toRemove = sortedEntries.slice(0, requestCache.size - MAX_CACHE_SIZE);
        toRemove.forEach(([key]) => requestCache.delete(key));
    }
};

// Run cleanup every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(cleanupCache, 5 * 60 * 1000);
}

// Helper to get cache key
const getCacheKey = (endpoint: string, params?: Record<string, any>): string => {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${endpoint}:${paramStr}`;
};

// Helper to check if cache is valid
const isCacheValid = (cached: CachedRequest<any>): boolean => {
    return Date.now() - cached.timestamp < CACHE_TTL;
};

export const api = {
    getGames: async (sortBy: string = 'time', league: League = 'nba', options?: { signal?: AbortSignal }): Promise<Game[]> => {
        const cacheKey = getCacheKey('/games', { sortBy, league });

        // Check cache first
        const cached = requestCache.get(cacheKey);
        if (cached && isCacheValid(cached)) {
            return cached.data;
        }

        // Check if request is already in progress (deduplication)
        if (pendingRequests.has(cacheKey)) {
            return pendingRequests.get(cacheKey)!;
        }

        // Create new request
        const requestPromise = fetch(`${API_BASE}/games?sort_by=${sortBy}&league=${league}`, {
            signal: options?.signal,
        })
            .then(async (response) => {
                if (!response.ok) {
                    throw new Error('Failed to fetch games');
                }
                const data = await response.json();

                // Cache the result
                requestCache.set(cacheKey, {
                    data,
                    timestamp: Date.now(),
                });

                // Clean up pending request
                pendingRequests.delete(cacheKey);

                return data;
            })
            .catch((error) => {
                // Clean up pending request on error
                pendingRequests.delete(cacheKey);
                throw error;
            });

        // Store pending request
        pendingRequests.set(cacheKey, requestPromise);

        return requestPromise;
    },

    getGameDetails: async (gameId: string, options?: { signal?: AbortSignal; league?: League }): Promise<Game> => {
        const cacheKey = getCacheKey(`/games/${gameId}`, { league: options?.league });

        // Check cache first (for prefetched data)
        const cached = requestCache.get(cacheKey);
        if (cached && isCacheValid(cached)) {
            return cached.data;
        }

        // Check if request is already in progress (deduplication)
        if (pendingRequests.has(cacheKey)) {
            return pendingRequests.get(cacheKey)!;
        }

        const controller = new AbortController();
        if (options?.signal) {
            // If the parent signal aborts, abort our controller too
            options.signal.addEventListener('abort', () => controller.abort());
        }

        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 second timeout

        // Create request promise
        const requestPromise = (async () => {
            try {
                const url = new URL(`${API_BASE}/games/${gameId}`);
                if (options?.league) {
                    url.searchParams.set('league', options.league);
                }

                const response = await fetch(url.toString(), {
                    signal: controller.signal,
                });
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error('Failed to fetch game details');
                }
                const data = await response.json();

                // Cache the result
                requestCache.set(cacheKey, {
                    data,
                    timestamp: Date.now(),
                });

                // Clean up pending request
                pendingRequests.delete(cacheKey);

                return data;
            } catch (err: any) {
                clearTimeout(timeoutId);
                // Clean up pending request on error
                pendingRequests.delete(cacheKey);
                if (err.name === 'AbortError') {
                    throw new Error('Request timed out');
                }
                throw err;
            }
        })();

        // Store pending request
        pendingRequests.set(cacheKey, requestPromise);

        return requestPromise;
    },

    getMarketContext: async (homeTeam: string, awayTeam: string, gameDate: string, league: string, options?: { signal?: AbortSignal }): Promise<MarketContext> => {
        const params = new URLSearchParams({
            home_team: homeTeam,
            away_team: awayTeam,
            game_date: gameDate,
            league: league
        });
        const response = await fetch(`${API_BASE}/market-context?${params.toString()}`, {
            signal: options?.signal,
        });
        if (!response.ok) {
            throw new Error('Failed to fetch market context');
        }
        return response.json();
    },

    // Accuracy tracking endpoints
    getAccuracyMetrics: async (daysBack: number = 30, options?: { signal?: AbortSignal }): Promise<AccuracyMetrics> => {
        const response = await fetch(`${API_BASE}/accuracy/metrics?days_back=${daysBack}`, {
            signal: options?.signal,
        });
        if (!response.ok) {
            throw new Error('Failed to fetch accuracy metrics');
        }
        return response.json();
    },

    recordGameOutcome: async (gameId: string, homeWon: boolean, homeScore: number, awayScore: number): Promise<void> => {
        const response = await fetch(`${API_BASE}/accuracy/outcome`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                game_id: gameId,
                home_won: homeWon,
                home_score: homeScore,
                away_score: awayScore,
            }),
        });
        if (!response.ok) {
            throw new Error('Failed to record game outcome');
        }
    },

    getGameAccuracy: async (gameId: string, options?: { signal?: AbortSignal }): Promise<GameAccuracy> => {
        const response = await fetch(`${API_BASE}/accuracy/game/${gameId}`, {
            signal: options?.signal,
        });
        if (!response.ok) {
            throw new Error('Failed to fetch game accuracy');
        }
        return response.json();
    },

    // Game result monitoring endpoints
    triggerAutoRecord: async (): Promise<AutoRecordResult> => {
        const response = await fetch(`${API_BASE}/results/auto-record`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to trigger auto-record');
        }
        return response.json();
    },

    // Model calibration endpoints
    getCalibrationStatus: async (options?: { signal?: AbortSignal }): Promise<CalibrationStatus> => {
        const response = await fetch(`${API_BASE}/calibration/status`, {
            signal: options?.signal,
        });
        if (!response.ok) {
            throw new Error('Failed to fetch calibration status');
        }
        return response.json();
    },

    runCalibration: async (minPredictions: number = 50, maxAdjustment: number = 0.05): Promise<CalibrationResult> => {
        const response = await fetch(`${API_BASE}/calibration/run?min_predictions=${minPredictions}&max_adjustment=${maxAdjustment}`, {
            method: 'POST',
        });
        if (!response.ok) {
            throw new Error('Failed to run calibration');
        }
        return response.json();
    },

    getCalibrationReport: async (options?: { signal?: AbortSignal }): Promise<CalibrationReport> => {
        const response = await fetch(`${API_BASE}/calibration/report`, {
            signal: options?.signal,
        });
        if (!response.ok) {
            throw new Error('Failed to fetch calibration report');
        }
        return response.json();
    },

    getMonitorStatus: async (options?: { signal?: AbortSignal }): Promise<MonitorStatus> => {
        const response = await fetch(`${API_BASE}/monitor/status`, {
            signal: options?.signal,
        });
        if (!response.ok) {
            throw new Error('Failed to fetch monitor status');
        }
        return response.json();
    }
};

// Accuracy tracking types
export interface AccuracyMetrics {
    total_predictions: number;
    accuracy: number;
    brier_score: number;
    log_loss: number;
    calibration: Record<number, {
        predicted_prob: number;
        actual_rate: number;
        count: number;
    }>;
    by_model?: Record<string, {
        accuracy: number;
        brier_score: number;
        count: number;
    }>;
}

export interface GameAccuracy {
    status: 'pending' | 'verified';
    prediction?: any;
    error?: number;
    correct?: boolean;
    brier_score?: number;
}

// Game result monitoring types
export interface AutoRecordResult {
    status: string;
    results: {
        nba: string[];
        nfl: string[];
        total_processed: number;
    };
}

export interface MonitorStatus {
    running: boolean;
    check_interval: number;
    processed_games_count: number;
    last_check: string | null;
}

// Model calibration types
export interface CalibrationStatus {
    calibrated: boolean;
    last_calibrated: string | null;
    current_weights: Record<string, number>;
    calibration_count: number;
    component_accuracy: Record<string, {
        accuracy: number;
        brier_score: number;
        count: number;
    }>;
}

export interface CalibrationResult {
    success: boolean;
    message: string;
    weights_before?: Record<string, number>;
    weights_after?: Record<string, number>;
    weight_changes?: Record<string, number>;
    accuracy_before?: number;
    predictions_analyzed?: number;
    component_accuracy?: Record<string, {
        accuracy: number;
        brier_score: number;
        count: number;
    }>;
}

export interface CalibrationReport {
    status: CalibrationStatus;
    current_accuracy: number;
    total_predictions: number;
    brier_score: number;
    calibration_history: Array<{
        timestamp: string;
        predictions_analyzed: number;
        accuracy_before?: number;
        weight_changes: Record<string, number>;
        component_accuracy?: Record<string, any>;
    }>;
    recommendations: string[];
}

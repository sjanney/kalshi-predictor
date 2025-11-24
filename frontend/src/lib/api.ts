export interface Prediction {
    home_win_prob: number;
    stat_model_prob: number;
    kalshi_prob: number;
    home_kalshi_prob: number;
    away_kalshi_prob: number;
    confidence_score: "HIGH" | "MEDIUM" | "LOW";
    recommendation: string;
    signal_strength: string;
    divergence: number;
    volatility: string;
}

export interface Analytics {
    volatility_score: string;
    stat_divergence: number;
    market_pressure: number;
    model_features: {
        home_advantage: number;
        record_diff: number;
        recent_form: number;
    };
    reasoning: string[];
}

export interface MarketData {
    price: number;
    yes_bid: number;
    yes_ask: number;
    volume: number;
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
    prediction: Prediction;
    analytics?: Analytics;
    market_data: MarketData;
    factors: GameFactors;
}

export type League = 'nba' | 'nfl';

const API_BASE = 'http://localhost:8000/api';

export const api = {
    getGames: async (sortBy: string = 'time', league: League = 'nba'): Promise<Game[]> => {
        const response = await fetch(`${API_BASE}/games?sort_by=${sortBy}&league=${league}`);
        if (!response.ok) {
            throw new Error('Failed to fetch games');
        }
        return response.json();
    },
    
    getGameDetails: async (gameId: string): Promise<Game> => {
        const response = await fetch(`${API_BASE}/games/${gameId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch game details');
        }
        return response.json();
    }
};

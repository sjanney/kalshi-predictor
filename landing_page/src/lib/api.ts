export interface Game {
    game_id: string;
    home_team: string;
    away_team: string;
    home_abbr: string;
    away_abbr: string;
    home_score?: number;
    away_score?: number;
    status?: string;
    league: string;
    commence_time: string;
    prediction: {
        stat_model_prob: number;
        kalshi_prob: number;
        home_kalshi_prob: number;
        divergence: number;
        confidence_score: 'LOW' | 'MEDIUM' | 'HIGH';
    };
    market_data: {
        volume: number;
        price: number;
        yes_price: number;
        no_price: number;
    };
    market_context?: {
        injuries?: {
            home: any[];
            away: any[];
        };
        injury_impact?: {
            home: { severity: string };
            away: { severity: string };
        };
    };
}

export const api = {
    getGameDetails: async (id: string) => Promise.resolve({} as Game)
};

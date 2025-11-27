import { Game } from './api';

export const MOCK_GAMES: Game[] = [
    {
        game_id: '1',
        home_team: 'Boston Celtics',
        away_team: 'Miami Heat',
        home_abbr: 'BOS',
        away_abbr: 'MIA',
        home_score: 102,
        away_score: 98,
        status: 'Q4 2:30',
        league: 'nba',
        commence_time: new Date().toISOString(),
        prediction: {
            stat_model_prob: 0.78,
            kalshi_prob: 0.65,
            home_kalshi_prob: 0.65,
            divergence: 0.13,
            confidence_score: 'HIGH'
        },
        market_data: {
            volume: 125000,
            price: 0.65,
            yes_price: 65,
            no_price: 35
        },
        market_context: {
            injuries: { home: [], away: [] },
            injury_impact: { home: { severity: 'LOW' }, away: { severity: 'MEDIUM' } }
        }
    },
    {
        game_id: '2',
        home_team: 'LA Lakers',
        away_team: 'GS Warriors',
        home_abbr: 'LAL',
        away_abbr: 'GSW',
        home_score: 45,
        away_score: 48,
        status: 'Q2 5:12',
        league: 'nba',
        commence_time: new Date().toISOString(),
        prediction: {
            stat_model_prob: 0.42,
            kalshi_prob: 0.55,
            home_kalshi_prob: 0.55,
            divergence: 0.13,
            confidence_score: 'MEDIUM'
        },
        market_data: {
            volume: 85000,
            price: 0.55,
            yes_price: 55,
            no_price: 45
        },
        market_context: {
            injuries: { home: [], away: [] },
            injury_impact: { home: { severity: 'LOW' }, away: { severity: 'LOW' } }
        }
    },
    {
        game_id: '3',
        home_team: 'KC Chiefs',
        away_team: 'BUF Bills',
        home_abbr: 'KC',
        away_abbr: 'BUF',
        home_score: 0,
        away_score: 0,
        status: 'Scheduled',
        league: 'nfl',
        commence_time: new Date().toISOString(),
        prediction: {
            stat_model_prob: 0.62,
            kalshi_prob: 0.45,
            home_kalshi_prob: 0.45,
            divergence: 0.17,
            confidence_score: 'HIGH'
        },
        market_data: {
            volume: 250000,
            price: 0.45,
            yes_price: 45,
            no_price: 55
        },
        market_context: {
            injuries: { home: [], away: [] },
            injury_impact: { home: { severity: 'LOW' }, away: { severity: 'CRITICAL' } }
        }
    }
];

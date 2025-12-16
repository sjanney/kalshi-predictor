# API Endpoints Reference

Complete reference for all Kalshi Predictor API endpoints.

## Base URL

```
http://localhost:8000
```

For production, replace with your deployed API URL.

## Authentication

All endpoints (except `/health` and `/api/license/*`) require a valid license. The license is verified via middleware on every request.

If the license is invalid or missing, you'll receive:
```json
{
  "detail": "License invalid or missing. Please activate your product.",
  "code": "LICENSE_REQUIRED"
}
```

---

## Game Endpoints

### Get All Games

Retrieve all available games with predictions.

**Endpoint**: `GET /api/games`

**Query Parameters**:
- `league` (optional): Filter by league (`NBA` or `NFL`)

**Example Request**:
```bash
curl http://localhost:8000/api/games?league=NBA
```

**Response** (200 OK):
```json
{
  "games": [
    {
      "id": "401584893",
      "league": "NBA",
      "home_team": "Los Angeles Lakers",
      "away_team": "Golden State Warriors",
      "date": "2025-11-27T19:00:00Z",
      "status": "scheduled",
      "prediction": {
        "home_win_prob": 0.6523,
        "away_win_prob": 0.3477,
        "confidence": "HIGH",
        "edge": 0.1523,
        "ev": 3.25,
        "kelly_fraction": 0.0823,
        "recommended_bet": "HOME",
        "recommended_stake": 82.30,
        "reasoning": [
          "Lakers have strong home advantage (+65 Elo)",
          "Recent form: Lakers 4-1 in last 5, Warriors 2-3",
          "Elo ratings: Lakers 1650 vs Warriors 1580",
          "Model predicts 15.23% edge over market"
        ]
      },
      "market_data": {
        "price": 50,
        "yes_bid": 49,
        "yes_ask": 51,
        "mid_price": 50.0,
        "spread": 2,
        "spread_pct": 4.0,
        "volume": 1250,
        "open_interest": 5000,
        "liquidity": 850,
        "confidence": "HIGH",
        "last_traded": "2025-11-27T18:45:00Z",
        "status": "active"
      },
      "signals": [
        {
          "type": "EDGE",
          "strength": "HIGH",
          "description": "Model predicts 15.23% edge over market price",
          "actionable": true,
          "confidence": 0.85
        },
        {
          "type": "MOMENTUM",
          "strength": "MEDIUM",
          "description": "Price trending upward (5% in last hour)",
          "actionable": true,
          "confidence": 0.65
        }
      ],
      "home_record": "12-8",
      "away_record": "10-10",
      "venue": "Crypto.com Arena"
    }
  ]
}
```

**Error Responses**:
- `403 Forbidden`: Invalid or missing license
- `500 Internal Server Error`: Server error

---

### Get Game Details

Retrieve detailed analytics for a specific game.

**Endpoint**: `GET /api/games/{game_id}`

**Path Parameters**:
- `game_id` (required): Unique game identifier

**Example Request**:
```bash
curl http://localhost:8000/api/games/401584893
```

**Response** (200 OK):
```json
{
  "game": {
    "id": "401584893",
    "league": "NBA",
    "home_team": "Los Angeles Lakers",
    "away_team": "Golden State Warriors",
    "date": "2025-11-27T19:00:00Z",
    "prediction": { /* Same as above */ },
    "market_data": { /* Same as above */ },
    "signals": [ /* Same as above */ ]
  },
  "context": {
    "injuries": {
      "home": [
        {
          "player": "Anthony Davis",
          "status": "QUESTIONABLE",
          "position": "C",
          "impact": "HIGH",
          "description": "Ankle sprain"
        }
      ],
      "away": [
        {
          "player": "Stephen Curry",
          "status": "PROBABLE",
          "position": "PG",
          "impact": "CRITICAL",
          "description": "Rest"
        }
      ]
    },
    "weather": null,
    "news": [
      {
        "title": "Lakers extend winning streak to 5 games",
        "summary": "The Lakers defeated the Suns 118-108...",
        "sentiment": 0.82,
        "source": "ESPN",
        "published": "2025-11-26T22:30:00Z",
        "url": "https://espn.com/..."
      }
    ]
  },
  "analytics": {
    "elo_ratings": {
      "home": 1650,
      "away": 1580,
      "difference": 70,
      "home_advantage": 65,
      "adjusted_difference": 135
    },
    "recent_form": {
      "home": {
        "last_5_wins": 4,
        "last_5_losses": 1,
        "win_pct": 0.80,
        "avg_point_diff": 8.2,
        "momentum": "STRONG",
        "trend": "UP"
      },
      "away": {
        "last_5_wins": 2,
        "last_5_losses": 3,
        "win_pct": 0.40,
        "avg_point_diff": -3.5,
        "momentum": "WEAK",
        "trend": "DOWN"
      }
    },
    "head_to_head": {
      "games_played": 12,
      "home_wins": 7,
      "away_wins": 5,
      "home_win_pct": 0.583,
      "avg_point_diff": 3.2,
      "last_meeting": {
        "date": "2025-10-15",
        "winner": "home",
        "score": "115-108"
      }
    },
    "advanced_metrics": {
      "home": {
        "offensive_rating": 118.5,
        "defensive_rating": 110.2,
        "net_rating": 8.3,
        "pace": 102.3
      },
      "away": {
        "offensive_rating": 115.8,
        "defensive_rating": 112.5,
        "net_rating": 3.3,
        "pace": 99.8
      }
    }
  }
}
```

**Error Responses**:
- `404 Not Found`: Game not found
- `403 Forbidden`: Invalid or missing license
- `500 Internal Server Error`: Server error

---

## Market Context Endpoints

### Get Market Context

Retrieve contextual data (weather, injuries, news) for all games.

**Endpoint**: `GET /api/market-context`

**Query Parameters**:
- `league` (optional): Filter by league (`NBA` or `NFL`)

**Example Request**:
```bash
curl http://localhost:8000/api/market-context?league=NFL
```

**Response** (200 OK):
```json
{
  "weather": {
    "401584893": {
      "condition": "Snow",
      "temperature": 28,
      "wind_speed": 15,
      "precipitation": 0.3,
      "severity": "HIGH",
      "impact_score": 7.5
    }
  },
  "injuries": {
    "Los Angeles Lakers": [
      {
        "player": "Anthony Davis",
        "status": "QUESTIONABLE",
        "position": "C",
        "impact": "HIGH"
      }
    ]
  },
  "news": {
    "Los Angeles Lakers": [
      {
        "title": "Lakers extend winning streak",
        "sentiment": 0.82,
        "source": "ESPN"
      }
    ]
  }
}
```

---

## Accuracy Tracking Endpoints

### Get Accuracy Metrics

Retrieve prediction accuracy metrics.

**Endpoint**: `GET /api/accuracy`

**Query Parameters**:
- `days_back` (optional, default: 30): Number of days to look back
- `league` (optional): Filter by league

**Example Request**:
```bash
curl http://localhost:8000/api/accuracy?days_back=30&league=NBA
```

**Response** (200 OK):
```json
{
  "overall": {
    "accuracy": 0.6842,
    "brier_score": 0.1823,
    "log_loss": 0.5234,
    "total_predictions": 152,
    "correct_predictions": 104,
    "incorrect_predictions": 48
  },
  "by_model": {
    "statistical": {
      "accuracy": 0.6513,
      "predictions": 152
    },
    "elo": {
      "accuracy": 0.6250,
      "predictions": 152
    },
    "form": {
      "accuracy": 0.5855,
      "predictions": 152
    },
    "kalshi": {
      "accuracy": 0.7039,
      "predictions": 152
    }
  },
  "by_confidence": {
    "HIGH": {
      "accuracy": 0.7523,
      "predictions": 65
    },
    "MEDIUM": {
      "accuracy": 0.6512,
      "predictions": 58
    },
    "LOW": {
      "accuracy": 0.5517,
      "predictions": 29
    }
  },
  "calibration": [
    {
      "predicted_prob": 0.6,
      "actual_prob": 0.58,
      "count": 25,
      "bucket": "0.5-0.7"
    },
    {
      "predicted_prob": 0.8,
      "actual_prob": 0.82,
      "count": 18,
      "bucket": "0.7-0.9"
    }
  ],
  "recent_performance": [
    {
      "date": "2025-11-26",
      "accuracy": 0.72,
      "predictions": 8
    },
    {
      "date": "2025-11-25",
      "accuracy": 0.65,
      "predictions": 10
    }
  ]
}
```

---

## License Endpoints

### Activate License

Activate a license key.

**Endpoint**: `POST /api/license/activate`

**Request Body**:
```json
{
  "license_key": "eyJ1c2VyX25hbWUiOiJKb2huIERvZSIsImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSJ9.signature"
}
```

**Example Request**:
```bash
curl -X POST http://localhost:8000/api/license/activate \
  -H "Content-Type: application/json" \
  -d '{"license_key": "your_license_key_here"}'
```

**Response** (200 OK):
```json
{
  "status": "activated",
  "user_name": "John Doe",
  "email": "john@example.com",
  "issued_at": "2025-11-27T00:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid license key format
- `403 Forbidden`: License signature verification failed

---

### Get License Status

Check current license status.

**Endpoint**: `GET /api/license/status`

**Example Request**:
```bash
curl http://localhost:8000/api/license/status
```

**Response** (200 OK):
```json
{
  "is_active": true,
  "user_name": "John Doe",
  "email": "john@example.com",
  "issued_at": "2025-11-27T00:00:00Z"
}
```

---

## Health Check

### Health Check

Check if the API is running.

**Endpoint**: `GET /health`

**Example Request**:
```bash
curl http://localhost:8000/health
```

**Response** (200 OK):
```json
{
  "status": "healthy",
  "environment": "development",
  "version": "3.0.0"
}
```

---

## Rate Limiting

Currently, there are no rate limits implemented. In production, consider implementing rate limiting to prevent abuse.

## Error Handling

All errors follow this format:

```json
{
  "detail": "Error message here",
  "code": "ERROR_CODE",
  "timestamp": "2025-11-27T20:00:00Z"
}
```

Common error codes:
- `LICENSE_REQUIRED`: Valid license required
- `GAME_NOT_FOUND`: Game ID not found
- `INVALID_LEAGUE`: Invalid league parameter
- `INTERNAL_ERROR`: Server error

## Pagination

Currently, pagination is not implemented. All games are returned in a single response. For large datasets, consider implementing pagination in future versions.

## Versioning

API version is included in the health check response. Breaking changes will increment the major version number.

Current version: **3.0.0**

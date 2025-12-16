# 🚀 Full Enhancement Implementation Plan

## Overview
Implementing 5 major enhancements to the Kalshi Predictor:
1. ✅ Cache injury data locally (already implemented via SimpleCache)
2. 🔧 Add more market data fields (spread, over/under, liquidity)
3. 🎨 Loading spinners for injury data
4. 🔄 Retry button for failed loads
5. 📊 Market Detail Modal with charts & trading

## Current State
- Backend already caches injury data for 1 hour via `SimpleCache` in `enhanced_data_feeds.py`
- Market data includes: price, yes_bid, yes_ask, volume, spread
- Frontend displays basic market data in GameCard

## Implementation Steps

### Step 1: Backend - Enhance Market Data
**File**: `backend/app/services/kalshi.py`
- Add method to fetch market history/candlestick data
- Enhance `get_market_details()` to include:
  - `open_interest` (total contracts)
  - `liquidity` (depth)
  - `last_traded_time`
  - `24h_change` (price movement)
  - `spread_pct` (bid-ask spread as %)

**File**: `backend/app/services/enhanced_prediction.py`
- Update `market_data` dict to include new fields
- Add `market_depth` analysis

**File**: `backend/app/api/endpoints.py`
- Add new endpoint: `/api/market-history/{market_id}` for chart data
- Add endpoint: `/api/market-details/{market_id}` for deep market info

### Step 2: Frontend - Loading States
**File**: `frontend/src/contexts/GameContext.tsx`
- Add `contextLoading` state per game
- Track which games are fetching injury data

**File**: `frontend/src/components/GameCard.tsx`
- Add skeleton/spinner for injury badges while loading
- Show pulsing animation during fetch

### Step 3: Frontend - Retry Functionality
**File**: `frontend/src/components/GameCard.tsx`
- Add retry button overlay when injury fetch fails
- Implement exponential backoff for retries
- Show toast notification on successful retry

### Step 4: Frontend - Market Detail Modal
**File**: `frontend/src/components/MarketDetailModal.tsx` (NEW)
- Price chart with Recharts (candlestick or line)
- Market depth visualization
- Key metrics display:
  - Current price
  - 24h volume
  - Spread
  - Open interest
  - Liquidity score
- Trading section (if API key available):
  - Buy/Sell buttons
  - Position sizing
  - Order confirmation

### Step 5: Frontend - Enhanced GameCard
**File**: `frontend/src/components/GameCard.tsx`
- Add "View Market" button that opens MarketDetailModal
- Display spread and liquidity indicators
- Color-code based on market quality (high/med/low liquidity)

## Dependencies
- No new npm packages needed (using existing Recharts)
- No new Python packages needed

## Testing Checklist
- [ ] Loading spinners appear during injury fetch
- [ ] Retry button works after failed fetch
- [ ] Market modal opens with chart
- [ ] Chart displays historical data
- [ ] Enhanced market data shows in GameCard
- [ ] No performance degradation with new features

## Estimated Time
- Backend enhancements: 30 min
- Frontend loading/retry: 30 min  
- Market Detail Modal: 60 min
- Testing & polish: 30 min
**Total**: ~2.5 hours

## Priority Order
1. Backend market enhancements (foundation)
2. Loading states (UX improvement)
3. Retry functionality (reliability)
4. Market Detail Modal (showpiece feature)
5. Final polish & testing

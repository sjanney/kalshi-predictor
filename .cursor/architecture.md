# 🏗️ **Technical Architecture Overview**

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     KALSHI PREDICTOR                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐         ┌──────────────┐                │
│  │   FRONTEND   │◄────────┤   BACKEND    │                │
│  │  React/TSX   │  HTTP   │    Flask     │                │
│  │   Vite Dev   │  API    │   Python     │                │
│  │  Electron    │         │              │                │
│  └──────┬───────┘         └──────┬───────┘                │
│         │                        │                          │
│         │                        │                          │
│    ┌────▼────┐            ┌─────▼──────┐                  │
│    │ UI      │            │ Services   │                  │
│    │ Layer   │            │ Layer      │                  │
│    └────┬────┘            └─────┬──────┘                  │
│         │                        │                          │
│    Components:             Services:                       │
│    - Dashboard             - KalshiClient                 │
│    - GameCard              - EnhancedPrediction           │
│    - MarketModal ◄─────NEW - NFLClient                   │
│    - Analytics             - NBAClient                    │
│                            - EnhancedDataFeeds            │
│                                                             │
│                            ┌─────────────┐                 │
│                            │  External   │                 │
│                            │  APIs       │                 │
│                            └─────┬───────┘                 │
│                                  │                          │
│                            - Kalshi API                    │
│                            - ESPN API                      │
│                            - RSS Feeds                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🆕 **New System Components**

### **1. Market Detail Modal (Frontend)**

**File:** `frontend/src/components/MarketDetailModal.tsx`

**Responsibilities:**
- Display enhanced market analytics
- Render responsive charts (Recharts)
- Calculate market quality scores
- Handle modal open/close animations

**Key Functions:**
```typescript
generateMockHistoricalData() // Generates 24h price/volume data
getMarketQuality()          // Calculates market quality score
renderOverview()            // Renders metrics tab
renderChart()               // Renders charts tab
renderTrade()               // Renders trading tab
```

**State Management:**
- `activeTab` - Current visible tab
- `historicalData` - Chart data array
- `loading` - Chart loading state

**Props:**
```typescript
interface MarketDetailModalProps {
    game: Game | null;      // Game data with market_data
    open: boolean;          // Modal visibility
    onClose: () => void;    // Close handler
}
```

---

### **2. Enhanced KalshiClient (Backend)**

**File:** `backend/app/services/kalshi.py`

**Changes:**
- Enhanced `get_market_details()` method
- Added spread percentage calculation
- Added mid-price calculation
- Added 24h price change tracking

**New Return Fields:**
```python
{
    "mid_price": float,        # (bid + ask) / 2
    "spread_pct": float,       # spread / mid_price * 100
    "price_change_24h": float, # % change over 24h
    "open_interest": int,      # Total contracts
    "liquidity": int,          # Depth score
    "last_traded": str,        # ISO timestamp
    "status": str              # Market status
}
```

---

### **3. Enhanced Prediction Engine (Backend)**

**File:** `backend/app/services/enhanced_prediction.py`

**Changes:**
- Expanded `market_data` object in prediction response
- Added market confidence scoring
- Integrated new Kalshi fields

**Enhanced Response:**
```python
"market_data": {
    "price": float,
    "yes_bid": int,
    "yes_ask": int,
    "mid_price": float,       # NEW
    "spread": float,
    "spread_pct": float,      # NEW
    "volume": int,
    "open_interest": int,     # NEW
    "liquidity": int,         # NEW
    "confidence": str         # NEW: "HIGH"|"MEDIUM"|"LOW"
}
```

---

### **4. Enhanced TypeScript Types (Frontend)**

**File:** `frontend/src/lib/api.ts`

**Changes:**
```typescript
export interface MarketData {
    price: number;
    yes_bid: number;
    yes_ask: number;
    volume: number;
    spread?: number;          // NEW - Bid-ask spread
    spread_pct?: number;      // NEW - Spread as %
    mid_price?: number;       // NEW - Midpoint price
    open_interest?: number;   // NEW - Total contracts
    liquidity?: number;       // NEW - Market depth
    confidence?: "HIGH" | "MEDIUM" | "LOW";  // NEW
}
```

All new fields are **optional** for backward compatibility.

---

## 🔄 **Data Flow**

### **Market Data Enhancement Flow:**

```
1. ESPN API (or NBA/NFL API)
   │
   ├──> NFLClient.fetch_games()
   │    │
   │    └──> Returns: game_id, teams, date, status
   │
2. Kalshi API
   │
   ├──> KalshiClient.get_league_markets()
   │    │
   │    └──> Returns: markets with prices, volume, bid/ask
   │
3. Market Matching
   │
   ├──> match_game_to_markets(game, markets)
   │    │
   │    └──> Links games to Kalshi markets
   │
4. Market Enhancement
   │
   ├──> KalshiClient.get_market_details(market)
   │    │
   │    └──> Adds: spread_pct, mid_price, liquidity, etc.
   │
5. Prediction Generation
   │
   ├──> EnhancedPredictionEngine.generate_prediction()
   │    │
   │    └──> Outputs: prediction + enhanced market_data
   │
6. API Response
   │
   ├──> GET /api/games
   │    │
   │    └──> Returns: Game[] with full market_data
   │
7. Frontend Rendering
   │
   ├──> Dashboard displays GameCards
   │    │
   │    └──> GameCard shows "View Market" button
   │         │
   │         └──> Opens MarketDetailModal
   │              │
   │              └──> Displays enhanced analytics
```

---

## 🎯 **Market Quality Scoring Algorithm**

### **Implementation:**
```typescript
const getMarketQuality = () => {
    const volume = market_data?.volume || 0;
    const spreadPct = market_data?.spread_pct || 100;
    
    if (volume > 500 && spreadPct < 5) {
        return {
            label: 'Excellent',
            color: 'text-emerald-400',
            bgColor: 'bg-emerald-500/20'
        };
    }
    
    if (volume > 200 && spreadPct < 10) {
        return {
            label: 'Good',
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/20'
        };
    }
    
    if (volume > 50 && spreadPct < 20) {
        return {
            label: 'Fair',
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/20'
        };
    }
    
    return {
        label: 'Poor',
        color: 'text-rose-400',
        bgColor: 'bg-rose-500/20'
    };
};
```

### **Quality Thresholds:**

| Rating | Volume | Spread | Risk Level |
|--------|--------|--------|------------|
| **Excellent** | >$500 | <5% | Very Low |
| **Good** | >$200 | <10% | Low |
| **Fair** | >$50 | <20% | Medium |
| **Poor** | <$50 | >20% | High |

---

## 🔐 **Security Considerations**

### **Kalshi API Authentication:**
- RSA private key stored in `prediction_api_key.txt`
- Key loaded at runtime via `serialization.load_pem_private_key()`
- Signatures generated using `RSA-PSS` padding
- API key ID stored in environment variable

### **Data Validation:**
- All market fields checked for `undefined`/`null` before accessing
- TypeScript optional chaining (`?.`) used throughout
- Backend validates market data structure before sending

### **Error Handling:**
- Try/catch blocks around all external API calls
- Exponential backoff for retry logic
- Graceful degradation (empty arrays) on failure
- Comprehensive error logging

---

## 📊 **Performance Optimizations**

### **1. Caching Strategy:**

#### **Backend (SimpleCache):**
```python
class SimpleCache:
    ttl = 3600  # 1 hour for injury data
    ttl = 300   # 5 minutes for predictions
```

#### **Frontend (Request Cache):**
```typescript
const CACHE_TTL = 2 * 60 * 1000;  // 2 minutes
const MAX_CACHE_SIZE = 50;        // Max entries
```

### **2. Request Deduplication:**
- Prevents multiple simultaneous requests for same data
- Uses `pendingRequests` Map to track in-flight requests
- Returns existing promise if request already in progress

### **3. Prefetching:**
- GameCard prefetches game details on hover (500ms delay)
- Reduces perceived latency when opening modals
- Cached for 2 minutes to avoid stale data

### **4. Lazy Loading:**
- Market charts only generated when modal opens
- Mock data generated client-side (no API call)
- Future: Real historical data fetched on-demand

---

## 🧪 **Testing Strategy**

### **Unit Tests (Future):**
```bash
# Backend
pytest backend/tests/test_kalshi.py
pytest backend/tests/test_enhanced_prediction.py

# Frontend
npm run test GameCard.test.tsx
npm run test MarketDetailModal.test.tsx
```

### **Integration Tests:**
- Test full data flow from API → Backend → Frontend
- Verify market data transformations
- Check modal rendering with real data

### **E2E Tests:**
- User clicks "View Market Details"
- Modal opens and displays data
- Charts render correctly
- All tabs functional

---

## 🚀 **Deployment Checklist**

- [x] Backend market enhancement deployed
- [x] Frontend types updated
- [x] Modal component added
- [x] GameCard integration complete
- [ ] Historical data endpoint (Phase 2)
- [ ] Live trading integration (Phase 2)
- [ ] Injury loading states wired (Phase 2)
- [ ] Performance profiling
- [ ] Security audit
- [ ] User acceptance testing

---

## 📈 **Future Roadmap**

### **Phase 2: Live Data & Trading**
- Real historical price data from Kalshi
- Live order placement API
- WebSocket for real-time updates
- Position management dashboard

### **Phase 3: Advanced Analytics**
- Candlestick charts
- Order book depth visualization
- Volume profile analysis
- Trade history tracking

### **Phase 4: Injury Integration**
- Loading skeletons for injury badges
- Retry UI with countdown timer
- Real-time injury notifications
- Impact scoring visualization

---

## 🔧 **Developer Tools**

### **Debug Mode:**
```typescript
// Enable in browser console:
localStorage.setItem('DEBUG_MARKET_MODAL', 'true');

// Logs:
- Market quality calculations
- Chart data generation
- API response times
```

### **Mock Data Generator:**
```typescript
// In MarketDetailModal.tsx
generateMockHistoricalData() {
    // Generates realistic 24h price movements
    // Based on current market price
    // Adds random variance for testing
}
```

### **Hot Reload:**
- Vite HMR for instant frontend updates
- Flask auto-reload for backend changes
- No need to restart `./start.sh`

---

**Built with ❤️ for enhanced Kalshi market analysis** 🚀

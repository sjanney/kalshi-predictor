import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { League, MarketContext } from './api';

interface FilterState {
    minConfidence: string; // "ALL", "HIGH", "MEDIUM"
    showCompleted: boolean;
    sortBy: string; // "time", "divergence", "confidence"
    league: League;
    setFilter: (key: keyof FilterState, value: any) => void;
}

export const useFilterStore = create<FilterState>()(
    persist(
        (set) => ({
            minConfidence: "ALL",
            showCompleted: false,
            sortBy: "time",
            league: "nba",
            setFilter: (key, value) => set((state) => ({ ...state, [key]: value })),
        }),
        {
            name: 'kalshi-predictor-filters',
        }
    )
);

interface CachedData<T> {
    data: T;
    timestamp: number;
    lastModified?: string; // From server
    stale: boolean;
    version: number;
}

interface SyncState {
    lastSyncTime: number | null;
    isSyncing: boolean;
    syncError: string | null;
    setSyncStatus: (isSyncing: boolean, error?: string | null) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
    lastSyncTime: null,
    isSyncing: false,
    syncError: null,
    setSyncStatus: (isSyncing, error = null) => set((state) => ({
        isSyncing,
        syncError: error,
        lastSyncTime: !isSyncing && !error ? Date.now() : state.lastSyncTime
    }))
}));

// Validation helper
const validateContext = (context: any): boolean => {
    if (!context || typeof context !== 'object') return false;
    if (!context.weather || typeof context.weather !== 'object') return false;
    if (!context.injuries || typeof context.injuries !== 'object') return false;
    // Optional: check for specific fields if critical
    return true;
};

interface DataState {
    marketContexts: Record<string, CachedData<MarketContext>>;
    setMarketContext: (gameId: string, context: MarketContext, lastModified?: string) => void;
    invalidateContext: (gameId: string) => void;
    getContext: (gameId: string) => { data: MarketContext, timestamp: number, lastModified?: string } | null;
}

export const useDataStore = create<DataState>((set, get) => ({
    marketContexts: {},
    setMarketContext: (gameId, context, lastModified) => {
        if (!validateContext(context)) {
            console.error("Invalid context data structure", context);
            return;
        }
        
        set((state) => {
            const existing = state.marketContexts[gameId];
            
            // Check if existing data is newer based on lastModified from server (if available)
            if (existing?.lastModified && lastModified) {
                 const existingTime = new Date(existing.lastModified).getTime();
                 const newTime = new Date(lastModified).getTime();
                 if (existingTime > newTime) {
                     console.warn(`Ignoring stale update for ${gameId}. Existing: ${existing.lastModified}, New: ${lastModified}`);
                     return state;
                 }
            }

            return {
                marketContexts: {
                    ...state.marketContexts,
                    [gameId]: {
                        data: context,
                        timestamp: Date.now(),
                        lastModified,
                        stale: false,
                        version: (existing?.version || 0) + 1
                    }
                }
            };
        });
    },
    invalidateContext: (gameId) => set((state) => {
        const existing = state.marketContexts[gameId];
        if (!existing) return state;
        return {
            marketContexts: {
                ...state.marketContexts,
                [gameId]: { ...existing, stale: true }
            }
        };
    }),
    getContext: (gameId) => {
        const record = get().marketContexts[gameId];
        // Return data if it exists and isn't older than 5 minutes
        if (record && !record.stale && (Date.now() - record.timestamp < 5 * 60 * 1000)) {
            return { 
                data: record.data, 
                timestamp: record.timestamp,
                lastModified: record.lastModified
            };
        }
        return null;
    }
}));

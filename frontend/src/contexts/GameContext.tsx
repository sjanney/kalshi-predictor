import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, ReactNode } from 'react';
import { api, type Game, type MarketContext, type League } from '../lib/api';
import { useFilterStore, useDataStore, useSyncStore } from '../lib/store';

interface GameContextType {
    // Game data
    games: Game[];
    selectedGame: Game | null;
    selectedGameDetails: Game | null;
    
    // Loading states
    loading: boolean;
    isRefreshing: boolean;
    selectedGameLoading: boolean;
    contextLoading: boolean;
    
    // Sync state
    isSyncing: boolean;
    syncError: string | null;
    lastSyncTime: number | null;
    
    // Error states
    error: string | null;
    selectedGameError: string | null;
    contextError: string | null;
    
    // Refresh management
    lastUpdated: Date | null;
    refreshGames: () => Promise<void>;
    refreshSelectedGame: () => Promise<void>;
    
    // Game selection
    setSelectedGame: (game: Game | null) => void;
    clearSelectedGame: () => void;
    
    // Market context management
    getMarketContext: (gameId: string, game?: Game) => Promise<MarketContext | null>;
    getCachedContext: (gameId: string) => MarketContext | null;
    
    // Enhanced game data with context
    getEnhancedGameData: (gameId: string) => Game | null;
    
    // Analytics helpers
    getGameStats: () => {
        total: number;
        highConf: number;
        opportunities: number;
        avgDivergence: number;
        totalVolume: number;
    };
    
    // Auto-refresh management
    autoRefreshEnabled: boolean;
    setAutoRefreshEnabled: (enabled: boolean) => void;
    refreshIntervalMinutes: 0.5 | 1 | 5 | 10;
    setRefreshIntervalMinutes: (minutes: 0.5 | 1 | 5 | 10) => void;
    nextRefreshTime: Date | null;
    refreshCountdown: string;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

interface GameContextProviderProps {
    children: ReactNode;
}

const GameContextProvider: React.FC<GameContextProviderProps> = ({ children }) => {
    // Store hooks
    const { sortBy, league } = useFilterStore();
    const { getContext, setMarketContext, invalidateContext } = useDataStore();
    const { isSyncing, syncError, lastSyncTime, setSyncStatus } = useSyncStore();
    
    // Game data state
    const [games, setGames] = useState<Game[]>([]);
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [selectedGameDetails, setSelectedGameDetails] = useState<Game | null>(null);
    
    // Loading states
    const [loading, setLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedGameLoading, setSelectedGameLoading] = useState(false);
    const [contextLoading, setContextLoading] = useState(false);
    
    // Error states
    const [error, setError] = useState<string | null>(null);
    const [selectedGameError, setSelectedGameError] = useState<string | null>(null);
    const [contextError, setContextError] = useState<string | null>(null);
    
    // Refresh management
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [lastRefreshTrigger, setLastRefreshTrigger] = useState(Date.now());
    const hasLoadedInitialRef = useRef(false);
    const selectedGameRequestIdRef = useRef(0);
    const lastSelectedGameFetchRef = useRef<{ gameId: string; timestamp: number } | null>(null);
    const selectedGameFetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isFetchingRef = useRef(false);
    const contextFetchingRef = useRef<Set<string>>(new Set()); // Track which game contexts are being fetched
    
    // Auto-refresh state
    const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
    const [refreshIntervalMinutes, setRefreshIntervalMinutes] = useState<0.5 | 1 | 5 | 10>(5);
    const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
    const [refreshCountdown, setRefreshCountdown] = useState('');
    const autoRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    // Load auto-refresh preferences from localStorage
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem('kalshi-auto-refresh');
            if (stored) {
                const parsed = JSON.parse(stored);
                if (typeof parsed.enabled === 'boolean') setAutoRefreshEnabled(parsed.enabled);
                if ([0.5, 1, 5, 10].includes(parsed.interval)) setRefreshIntervalMinutes(parsed.interval);
            }
        } catch (err) {
            console.warn('Failed to load auto-refresh preferences', err);
        }
    }, []);
    
    // Persist auto-refresh preferences
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const payload = JSON.stringify({ enabled: autoRefreshEnabled, interval: refreshIntervalMinutes });
        localStorage.setItem('kalshi-auto-refresh', payload);
    }, [autoRefreshEnabled, refreshIntervalMinutes]);
    
    // Clear auto-refresh timeout helper
    const clearAutoRefreshTimeout = useCallback(() => {
        if (autoRefreshTimeoutRef.current) {
            clearTimeout(autoRefreshTimeoutRef.current);
            autoRefreshTimeoutRef.current = null;
        }
    }, []);
    
    // Fetch games
    const refreshGames = useCallback(async () => {
        try {
            setIsRefreshing(true);
            setSyncStatus(true);
            if (!hasLoadedInitialRef.current) setLoading(true);
            setError(null);
            
            const data = await api.getGames(sortBy, league);
            setGames(data);
            setLastUpdated(new Date());
            hasLoadedInitialRef.current = true;
            setSyncStatus(false);
        } catch (err) {
            console.error("Failed to fetch games:", err);
            setError("Failed to connect to prediction engine.");
            setSyncStatus(false, "Failed to sync games");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            setLastRefreshTrigger(Date.now());
        }
    }, [sortBy, league, setSyncStatus]);
    
    // Initial load and when filters change
    useEffect(() => {
        setGames([]);
        setLoading(true);
        setError(null);
        hasLoadedInitialRef.current = false;
        refreshGames();
        return () => clearAutoRefreshTimeout();
    }, [refreshGames, clearAutoRefreshTimeout]);
    
    // Auto-refresh setup
    useEffect(() => {
        clearAutoRefreshTimeout();
        if (!autoRefreshEnabled) {
            setNextRefreshTime(null);
            return;
        }
        
        const intervalMs = refreshIntervalMinutes * 60000;
        const scheduledTime = new Date(lastRefreshTrigger + intervalMs);
        setNextRefreshTime(scheduledTime);
        const delay = Math.max(scheduledTime.getTime() - Date.now(), 0);
        
        autoRefreshTimeoutRef.current = setTimeout(() => {
            refreshGames();
        }, delay);
        
        return () => clearAutoRefreshTimeout();
    }, [autoRefreshEnabled, refreshIntervalMinutes, lastRefreshTrigger, refreshGames, clearAutoRefreshTimeout]);
    
    // Refresh countdown timer
    useEffect(() => {
        if (!autoRefreshEnabled || !nextRefreshTime) {
            setRefreshCountdown('');
            return;
        }
        
        const updateCountdown = () => {
            const diff = nextRefreshTime.getTime() - Date.now();
            if (diff <= 0) {
                setRefreshCountdown('now');
                return;
            }
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            setRefreshCountdown(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        };
        
        updateCountdown();
        const id = setInterval(updateCountdown, 1000);
        return () => clearInterval(id);
    }, [autoRefreshEnabled, nextRefreshTime]);
    
    // Fetch selected game details (manual refresh)
    const refreshSelectedGame = useCallback(async () => {
        if (!selectedGame) return;
        
        const gameId = selectedGame.game_id;
        const now = Date.now();
        
        // Check if we recently fetched this game (debounce - minimum 3 seconds between requests)
        const MIN_FETCH_INTERVAL = 3000; // 3 seconds
        if (lastSelectedGameFetchRef.current?.gameId === gameId) {
            const timeSinceLastFetch = now - lastSelectedGameFetchRef.current.timestamp;
            if (timeSinceLastFetch < MIN_FETCH_INTERVAL) {
                console.log(`Skipping refresh for ${gameId} - too soon since last fetch`);
                return;
            }
        }
        
        // Don't fetch if already loading
        if (isFetchingRef.current && lastSelectedGameFetchRef.current?.gameId === gameId) {
            return;
        }
        
        let isActive = true;
        const controller = new AbortController();
        const requestId = selectedGameRequestIdRef.current;
        
        // Mark as fetching and update last fetch time
        isFetchingRef.current = true;
        lastSelectedGameFetchRef.current = { gameId, timestamp: now };
        
        setSelectedGameLoading(true);
        setSelectedGameError(null);
        
        try {
            const data = await api.getGameDetails(gameId, { 
                signal: controller.signal,
                league: (selectedGame.league || 'nba') as League
            });
            if (!isActive || selectedGameRequestIdRef.current !== requestId) return;
            if (data.game_id === gameId) {
                setSelectedGameDetails(data);
                // Use functional update to avoid loops
                setSelectedGame(prev => {
                    if (!prev || prev.game_id === gameId) {
                        return data;
                    }
                    return prev;
                });
            }
        } catch (err) {
            if (!isActive || err.name === 'AbortError') return;
            if (selectedGameRequestIdRef.current !== requestId) return;
            console.error(`Failed to load game ${gameId}`, err);
            setSelectedGameError('Unable to sync the latest market snapshot.');
        } finally {
            if (isActive && selectedGameRequestIdRef.current === requestId) {
                setSelectedGameLoading(false);
                isFetchingRef.current = false;
            }
        }
        
        return () => {
            isActive = false;
            isFetchingRef.current = false;
            controller.abort();
        };
    }, [selectedGame]);
    
    // Handle game selection
    const handleSetSelectedGame = useCallback((game: Game | null) => {
        setSelectedGame(game);
        setSelectedGameDetails(game);
        setSelectedGameError(null);
        selectedGameRequestIdRef.current += 1;
    }, []);
    
    const handleClearSelectedGame = useCallback(() => {
        setSelectedGame(null);
        setSelectedGameDetails(null);
        setSelectedGameLoading(false);
        setSelectedGameError(null);
    }, []);
    
    // Fetch selected game details when selectedGame.game_id changes
    useEffect(() => {
        // Clear any pending timeout
        if (selectedGameFetchTimeoutRef.current) {
            clearTimeout(selectedGameFetchTimeoutRef.current);
            selectedGameFetchTimeoutRef.current = null;
        }
        
        if (!selectedGame) {
            setSelectedGameDetails(null);
            setSelectedGameLoading(false);
            setSelectedGameError(null);
            lastSelectedGameFetchRef.current = null;
            return;
        }
        
        const gameId = selectedGame.game_id;
        const gameLeague = selectedGame.league || 'nba';
        const now = Date.now();
        
        // Check if we recently fetched this game (debounce - minimum 3 seconds between requests)
        const MIN_FETCH_INTERVAL = 3000; // 3 seconds
        if (lastSelectedGameFetchRef.current?.gameId === gameId) {
            const timeSinceLastFetch = now - lastSelectedGameFetchRef.current.timestamp;
            if (timeSinceLastFetch < MIN_FETCH_INTERVAL) {
                // Skip this fetch - too soon since last one
                return;
            }
        }
        
        // Don't fetch if already loading the same game
        if (isFetchingRef.current && lastSelectedGameFetchRef.current?.gameId === gameId) {
            return;
        }
        
        let isActive = true;
        const controller = new AbortController();
        const requestId = selectedGameRequestIdRef.current;
        
        // Mark as fetching and update last fetch time immediately to prevent duplicate requests
        isFetchingRef.current = true;
        lastSelectedGameFetchRef.current = { gameId, timestamp: now };
        
        // Set a timeout to abort the request after 15 seconds
        const timeoutId = setTimeout(() => {
            if (isActive && selectedGameRequestIdRef.current === requestId) {
                controller.abort();
                setSelectedGameLoading(false);
                setSelectedGameError('Request timed out. Using cached data.');
            }
        }, 15000);
        
        setSelectedGameLoading(true);
        setSelectedGameError(null);
        
        // Pass league to optimize backend query
        api.getGameDetails(gameId, { 
            signal: controller.signal,
            league: gameLeague as League
        })
            .then((data) => {
                if (!isActive || selectedGameRequestIdRef.current !== requestId) return;
                // Only update if game_id matches (prevent stale updates)
                if (data.game_id === gameId) {
                    setSelectedGameDetails(data);
                    // Only update selectedGame if the game_id is the same (prevent loops)
                    // Use functional update to avoid dependency on selectedGame object
                    setSelectedGame(prev => {
                        if (!prev || prev.game_id === gameId) {
                            return data;
                        }
                        return prev;
                    });
                }
            })
            .catch((err) => {
                if (!isActive || err.name === 'AbortError') return;
                if (selectedGameRequestIdRef.current !== requestId) return;
                console.error(`Failed to load game ${gameId}`, err);
                setSelectedGameError('Unable to sync the latest market snapshot.');
            })
            .finally(() => {
                clearTimeout(timeoutId);
                if (isActive && selectedGameRequestIdRef.current === requestId) {
                    setSelectedGameLoading(false);
                    isFetchingRef.current = false;
                }
            });
        
        return () => {
            isActive = false;
            isFetchingRef.current = false;
            clearTimeout(timeoutId);
            controller.abort();
        };
    }, [selectedGame?.game_id, selectedGame?.league]); // Only depend on game_id and league, not the entire object
    
    // Get market context (with caching)
    const getMarketContext = useCallback(async (gameId: string, game?: Game): Promise<MarketContext | null> => {
        // Check cache first
        const cached = getContext(gameId);
        if (cached) {
            return cached.data;
        }
        
        // Prevent duplicate requests for the same game
        if (contextFetchingRef.current.has(gameId)) {
            console.log(`Context fetch already in progress for ${gameId}`);
            return null;
        }
        
        // Need game data to fetch context
        const gameData = game || games.find(g => g.game_id === gameId);
        if (!gameData) {
            console.warn(`Game ${gameId} not found for context fetch`);
            return null;
        }
        
        // Mark as fetching
        contextFetchingRef.current.add(gameId);
        setContextLoading(true);
        setContextError(null);
        setSyncStatus(true);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, 30000); // 30 second timeout for context fetch (Gemini can be slow)
        
        try {
            const context = await api.getMarketContext(
                gameData.home_team,
                gameData.away_team,
                gameData.game_date,
                gameData.league || 'nba',
                { signal: controller.signal }
            );
            clearTimeout(timeoutId);
            setMarketContext(gameId, context);
            setSyncStatus(false);
            return context;
        } catch (err: any) {
            clearTimeout(timeoutId);
            if (err.name === 'AbortError') {
                console.error("Market context request timed out");
                setContextError("Request timed out. Please try again.");
            } else {
                console.error("Failed to fetch market context", err);
                setContextError("Failed to fetch market context data.");
            }
            setSyncStatus(false, "Failed to fetch market context");
            return null;
        } finally {
            contextFetchingRef.current.delete(gameId);
            setContextLoading(false);
        }
    }, [games, getContext, setMarketContext, setSyncStatus]);
    
    // Get cached context
    const getCachedContext = useCallback((gameId: string): MarketContext | null => {
        const cached = getContext(gameId);
        return cached ? cached.data : null;
    }, [getContext]);
    
    // Get enhanced game data (game + context)
    const getEnhancedGameData = useCallback((gameId: string): Game | null => {
        const game = games.find(g => g.game_id === gameId);
        if (!game) return null;
        
        const cached = getContext(gameId);
        return {
            ...game,
            market_context: cached ? cached.data : game.market_context
        };
    }, [games, getContext]);
    
    // Get game statistics
    const getGameStats = useCallback(() => {
        const total = games.length;
        const highConf = games.filter(g => g.prediction.confidence_score === "HIGH").length;
        const opportunities = games.filter(g => g.prediction.divergence > 0.15).length;
        const avgDivergence = games.length > 0
            ? games.reduce((sum, g) => sum + Math.abs(g.prediction.divergence), 0) / games.length
            : 0;
        const totalVolume = games.reduce((sum, g) => sum + (g.market_data.volume || 0), 0);
        
        return {
            total,
            highConf,
            opportunities,
            avgDivergence,
            totalVolume
        };
    }, [games]);
    
    // Memoize context value to prevent unnecessary re-renders
    const value: GameContextType = useMemo(() => ({
        // Game data
        games,
        selectedGame,
        selectedGameDetails,
        
        // Loading states
        loading,
        isRefreshing,
        selectedGameLoading,
        contextLoading,
        
        // Error states
        error,
        selectedGameError,
        contextError,
        
        // Sync state
        isSyncing,
        syncError,
        lastSyncTime,
        
        // Refresh management
        lastUpdated,
        refreshGames,
        refreshSelectedGame,
        
        // Game selection
        setSelectedGame: handleSetSelectedGame,
        clearSelectedGame: handleClearSelectedGame,
        
        // Market context management
        getMarketContext,
        getCachedContext,
        
        // Enhanced data
        getEnhancedGameData,
        
        // Analytics
        getGameStats,
        
        // Auto-refresh
        autoRefreshEnabled,
        setAutoRefreshEnabled,
        refreshIntervalMinutes,
        setRefreshIntervalMinutes,
        nextRefreshTime,
        refreshCountdown,
    }), [
        games,
        selectedGame,
        selectedGameDetails,
        loading,
        isRefreshing,
        selectedGameLoading,
        contextLoading,
        error,
        selectedGameError,
        contextError,
        isSyncing,
        syncError,
        lastSyncTime,
        lastUpdated,
        refreshGames,
        refreshSelectedGame,
        handleSetSelectedGame,
        handleClearSelectedGame,
        getMarketContext,
        getCachedContext,
        getEnhancedGameData,
        getGameStats,
        autoRefreshEnabled,
        setAutoRefreshEnabled,
        refreshIntervalMinutes,
        setRefreshIntervalMinutes,
        nextRefreshTime,
        refreshCountdown,
    ]);
    
    return (
        <GameContext.Provider value={value}>
            {children}
        </GameContext.Provider>
    );
};

GameContextProvider.displayName = 'GameContextProvider';

export { GameContextProvider };

export const useGameContext = (): GameContextType => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error('useGameContext must be used within a GameContextProvider');
    }
    return context;
};


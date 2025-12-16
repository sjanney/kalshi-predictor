/**
 * Custom hook for connecting to Kalshi WebSocket market data stream
 * Uses Server-Sent Events (SSE) to receive real-time market updates
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export interface MarketUpdate {
    ticker: string;
    title?: string;
    subtitle?: string;
    yes_price: number;
    no_price: number;
    last_price: number;
    volume: number;
    open_interest: number;
    timestamp: string;
    price_history?: Array<{ price: number; timestamp: string }>;
    last_trade?: {
        price: number;
        count: number;
        taker_side: string;
        timestamp: string;
    };
}

export interface WebSocketState {
    markets: MarketUpdate[];
    connected: boolean;
    error: string | null;
}

interface UseKalshiWebSocketOptions {
    sport?: string;
    autoConnect?: boolean;
}

export function useKalshiWebSocket(options: UseKalshiWebSocketOptions = {}) {
    const { sport, autoConnect = true } = options;

    const [state, setState] = useState<WebSocketState>({
        markets: [],
        connected: false,
        error: null,
    });

    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const reconnectAttempts = useRef(0);
    const maxReconnectAttempts = 10;
    const baseReconnectDelay = 1000; // 1 second

    const connect = useCallback(() => {
        // Close existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // Build URL
        const baseUrl = 'http://localhost:8000/api/ws/markets';
        const url = sport ? `${baseUrl}/${sport}` : `${baseUrl}/stream`;

        console.log(`🔌 Connecting to market stream: ${url}`);

        try {
            const eventSource = new EventSource(url);
            eventSourceRef.current = eventSource;

            eventSource.onopen = () => {
                console.log('✅ Connected to market stream');
                setState(prev => ({ ...prev, connected: true, error: null }));
                reconnectAttempts.current = 0;
            };

            eventSource.addEventListener('market_update', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    setState(prev => ({
                        ...prev,
                        markets: data.markets || [],
                        connected: data.connected || false,
                    }));
                } catch (error) {
                    console.error('Failed to parse market update:', error);
                }
            });

            eventSource.onerror = (error) => {
                console.error('❌ Market stream error:', error);
                setState(prev => ({
                    ...prev,
                    connected: false,
                    error: 'Connection lost',
                }));

                eventSource.close();

                // Attempt reconnection with exponential backoff
                if (reconnectAttempts.current < maxReconnectAttempts) {
                    const delay = Math.min(
                        baseReconnectDelay * Math.pow(2, reconnectAttempts.current),
                        30000 // Max 30 seconds
                    );

                    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        reconnectAttempts.current++;
                        connect();
                    }, delay);
                } else {
                    setState(prev => ({
                        ...prev,
                        error: 'Max reconnection attempts reached',
                    }));
                }
            };

        } catch (error) {
            console.error('Failed to create EventSource:', error);
            setState(prev => ({
                ...prev,
                connected: false,
                error: 'Failed to connect',
            }));
        }
    }, [sport]);

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        setState(prev => ({ ...prev, connected: false }));
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    return {
        ...state,
        connect,
        disconnect,
        reconnect: connect,
    };
}

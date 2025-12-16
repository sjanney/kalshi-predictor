/**
 * Trading Terminal Component
 * 
 * Professional trading interface for executing trades and managing positions.
 * 
 * Features:
 * - Order Entry Panel: Quick market/limit order placement
 * - Active Positions Grid: Real-time P&L tracking
 * - Order Status Monitor: Pending orders with cancel actions
 * - P&L Summary Dashboard: Total exposure, balance, performance metrics
 * 
 * Architecture:
 * - Modular sub-components for each panel
 * - Real-time updates via polling  
 * - Professional data grid styling
 * - Color-coded P&L displays
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    api,
    type Game,
    type TradingOrder,
    type TradingPosition,
    type PnLSummary,
    type PlaceOrderRequest
} from '../lib/api';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Activity,
    X,
    Check,
    AlertTriangle,
    RefreshCw
} from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface TradingTerminalProps {
    games: Game[];
    onClose?: () => void;
}

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * P&L Summary Header
 * Shows key account metrics at a glance
 */
const PnLSummaryHeader: React.FC<{ summary: PnLSummary | null; loading: boolean }> = ({
    summary,
    loading
}) => {
    if (loading || !summary) {
        return (
            <div className="grid grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-panel rounded-lg p-4 animate-pulse">
                        <div className="h-4 bg-surface-highlight rounded mb-2" />
                        <div className="h-8 bg-surface-highlight rounded" />
                    </div>
                ))}
            </div>
        );
    }

    const isProfitable = summary.total_pnl >= 0;
    const returnPercent = summary.balance > 0
        ? (summary.total_pnl / summary.balance) * 100
        : 0;

    return (
        <div className="grid grid-cols-4 gap-4 mb-6">
            {/* Total P&L */}
            <div className="glass-panel rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-text-muted text-sm">Total P&L</span>
                    {isProfitable ? (
                        <TrendingUp className="w-4 h-4 text-success" />
                    ) : (
                        <TrendingDown className="w-4 h-4 text-danger" />
                    )}
                </div>
                <div className={`text-2xl font-bold ${isProfitable ? 'text-success' : 'text-danger'
                    }`}>
                    {isProfitable ? '+' : ''}${summary.total_pnl.toFixed(2)}
                </div>
                <div className="text-text-muted text-xs mt-1">
                    {isProfitable ? '+' : ''}{returnPercent.toFixed(2)}%
                </div>
            </div>

            {/* Unrealized P&L */}
            <div className="glass-panel rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-text-muted text-sm">Unrealized</span>
                    <Activity className="w-4 h-4 text-secondary" />
                </div>
                <div className={`text-2xl font-bold ${summary.unrealized_pnl >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                    {summary.unrealized_pnl >= 0 ? '+' : ''}${summary.unrealized_pnl.toFixed(2)}
                </div>
                <div className="text-text-muted text-xs mt-1">
                    {summary.position_count} position{summary.position_count !== 1 ? 's' : ''}
                </div>
            </div>

            {/* Available Capital */}
            <div className="glass-panel rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-text-muted text-sm">Available</span>
                    <DollarSign className="w-4 h-4 text-primary" />
                </div>
                <div className="text-2xl font-bold text-text-main">
                    ${summary.available_capital.toFixed(2)}
                </div>
                <div className="text-text-muted text-xs mt-1">
                    of ${summary.balance.toFixed(2)}
                </div>
            </div>

            {/* Total Exposure */}
            <div className="glass-panel rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-text-muted text-sm">Exposure</span>
                    <AlertTriangle className="w-4 h-4 text-warning" />
                </div>
                <div className="text-2xl font-bold text-text-main">
                    ${summary.total_exposure.toFixed(2)}
                </div>
                <div className="text-text-muted text-xs mt-1">
                    {((summary.total_exposure / summary.balance) * 100).toFixed(1)}% of capital
                </div>
            </div>
        </div>
    );
};

/**
 * Order Entry Panel
 * Quick order placement interface
 */
const OrderEntryPanel: React.FC<{
    game: Game | null;
    onOrderPlaced: () => void;
}> = ({ game, onOrderPlaced }) => {
    const [quantity, setQuantity] = useState(10);
    const [orderType, setOrderType] = useState<"market" | "limit">("market");
    const [limitPrice, setLimitPrice] = useState<string>("");
    const [side, setSide] = useState<"yes" | "no">("yes");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async () => {
        if (!game?.market_ticker) {
            setError("No market selected");
            return;
        }

        setSubmitting(true);
        setError(null);
        setSuccess(null);

        try {
            const request: PlaceOrderRequest = {
                market_ticker: game.market_ticker,
                side,
                quantity,
                order_type: orderType,
                game_id: game.game_id,
            };

            if (orderType === "limit") {
                const price = parseFloat(limitPrice);
                if (isNaN(price) || price <= 0 || price >= 100) {
                    throw new Error("Invalid limit price (must be between 0-100)");
                }
                request.price = price;
            }

            const response = await api.placeOrder(request);
            setSuccess(`Order placed: ${response.message}`);
            onOrderPlaced();

            // Reset form
            setQuantity(10);
            setLimitPrice("");

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to place order");
        } finally {
            setSubmitting(false);
        }
    };

    if (!game) {
        return (
            <div className="glass-panel rounded-lg p-6 text-center text-text-muted">
                <p>Select a game to place an order</p>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Order</h3>

            {/* Game Info */}
            <div className="mb-4 pb-4 border-b border-surface-highlight">
                <div className="font-medium">{game.away_team} @ {game.home_team}</div>
                <div className="text-sm text-text-muted">
                    {game.market_data.price}¢ | Vol: ${game.market_data.volume}
                </div>
            </div>

            {/* Order Side */}
            <div className="mb-4">
                <label className="block text-sm text-text-muted mb-2">Side</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setSide("yes")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${side === "yes"
                                ? "bg-success text-white"
                                : "bg-surface-highlight text-text-muted hover:bg-surface-glass"
                            }`}
                    >
                        YES
                    </button>
                    <button
                        onClick={() => setSide("no")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${side === "no"
                                ? "bg-danger text-white"
                                : "bg-surface-highlight text-text-muted hover:bg-surface-glass"
                            }`}
                    >
                        NO
                    </button>
                </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
                <label className="block text-sm text-text-muted mb-2">Quantity</label>
                <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-full px-3 py-2 bg-surface-highlight rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            {/* Order Type */}
            <div className="mb-4">
                <label className="block text-sm text-text-muted mb-2">Order Type</label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setOrderType("market")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${orderType === "market"
                                ? "bg-primary text-white"
                                : "bg-surface-highlight text-text-muted hover:bg-surface-glass"
                            }`}
                    >
                        Market
                    </button>
                    <button
                        onClick={() => setOrderType("limit")}
                        className={`px-4 py-2 rounded-lg font-medium transition-all ${orderType === "limit"
                                ? "bg-primary text-white"
                                : "bg-surface-highlight text-text-muted hover:bg-surface-glass"
                            }`}
                    >
                        Limit
                    </button>
                </div>
            </div>

            {/* Limit Price (conditional) */}
            {orderType === "limit" && (
                <div className="mb-4">
                    <label className="block text-sm text-text-muted mb-2">Limit Price (¢)</label>
                    <input
                        type="number"
                        value={limitPrice}
                        onChange={(e) => setLimitPrice(e.target.value)}
                        placeholder="0-100"
                        min="0"
                        max="100"
                        step="0.1"
                        className="w-full px-3 py-2 bg-surface-highlight rounded-lg text-text-main focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            )}

            {/* Error/Success Messages */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 p-3 bg-danger/20 border border-danger/50 rounded-lg text-danger text-sm"
                    >
                        {error}
                    </motion.div>
                )}
                {success && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="mb-4 p-3 bg-success/20 border border-success/50 rounded-lg text-success text-sm"
                    >
                        <Check className="inline w-4 h-4 mr-2" />
                        {success}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={submitting || quantity <= 0}
                className="w-full px-4 py-3 bg-primary hover:bg-primary/80 disabled:bg-surface-highlight disabled:text-text-muted text-white font-semibold rounded-lg transition-all flex items-center justify-center"
            >
                {submitting ? (
                    <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Placing Order...
                    </>
                ) : (
                    `Place ${side.toUpperCase()} Order`
                )}
            </button>

            {/* Cost Estimate */}
            <div className="mt-3 text-xs text-text-muted text-center">
                Est. Cost: ${((orderType === "market" ? game.market_data.price : parseFloat(limitPrice) || 0) * quantity / 100).toFixed(2)}
            </div>
        </div>
    );
};

/**
 * Positions Grid
 * Shows all active positions with real-time P&L
 */
const PositionsGrid: React.FC<{
    positions: TradingPosition[];
    loading: boolean;
}> = ({ positions, loading }) => {
    if (loading) {
        return (
            <div className="glass-panel rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Active Positions</h3>
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-16 bg-surface-highlight rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (positions.length === 0) {
        return (
            <div className="glass-panel rounded-lg p-6 text-center text-text-muted">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active positions</p>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
                Active Positions ({positions.length})
            </h3>

            <div className="space-y-2">
                {positions.map((position) => {
                    const pnlPercent = (position.total_pnl / position.position_value) * 100;
                    const isProfitable = position.total_pnl >= 0;

                    return (
                        <motion.div
                            key={position.market_ticker}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-surface-highlight rounded-lg hover:bg-surface-glass transition-all"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <div className="font-medium font-mono text-sm">
                                        {position.market_ticker}
                                    </div>
                                    <div className="text-xs text-text-muted mt-1">
                                        {position.side.toUpperCase()} × {position.quantity} @ {position.average_entry_price}¢
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`text-lg font-bold ${isProfitable ? 'text-success' : 'text-danger'
                                        }`}>
                                        {isProfitable ? '+' : ''}${position.total_pnl.toFixed(2)}
                                    </div>
                                    <div className={`text-xs ${isProfitable ? 'text-success' : 'text-danger'
                                        }`}>
                                        {isProfitable ? '+' : ''}{pnlPercent.toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between text-xs text-text-muted">
                                <div>
                                    Current: {position.current_market_price}¢
                                </div>
                                <div>
                                    Value: ${position.position_value.toFixed(2)}
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * Active Orders Panel
 * Shows pending orders with cancel actions
 */
const ActiveOrdersPanel: React.FC<{
    orders: TradingOrder[];
    loading: boolean;
    onRefresh: () => void;
}> = ({ orders, loading, onRefresh }) => {
    const [cancelling, setCancelling] = useState<string | null>(null);

    const handleCancel = async (orderId: string) => {
        setCancelling(orderId);
        try {
            await api.cancelOrder(orderId);
            onRefresh();
        } catch (err) {
            console.error("Failed to cancel order:", err);
        } finally {
            setCancelling(null);
        }
    };

    if (loading) {
        return (
            <div className="glass-panel rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Active Orders</h3>
                <div className="space-y-2">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} className="h-14 bg-surface-highlight rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="glass-panel rounded-lg p-6 text-center text-text-muted">
                <p>No active orders</p>
            </div>
        );
    }

    return (
        <div className="glass-panel rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
                Active Orders ({orders.length})
            </h3>

            <div className="space-y-2">
                {orders.map((order) => (
                    <motion.div
                        key={order.order_id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 bg-surface-highlight rounded-lg flex justify-between items-center"
                    >
                        <div>
                            <div className="font-mono text-sm">
                                {order.side.toUpperCase()} × {order.quantity}
                            </div>
                            <div className="text-xs text-text-muted">
                                {order.order_type.toUpperCase()} {order.price ? `@ ${order.price}¢` : ''}
                            </div>
                        </div>

                        <button
                            onClick={() => handleCancel(order.order_id)}
                            disabled={cancelling === order.order_id}
                            className="px-3 py-1 bg-danger/20 hover:bg-danger/30 text-danger rounded transition-all disabled:opacity-50"
                        >
                            {cancelling === order.order_id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <X className="w-4 h-4" />
                            )}
                        </button>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

/**
 * Trading Terminal
 * Main terminal interface combining all sub-components
 */
const TradingTerminal: React.FC<TradingTerminalProps> = ({ games, onClose }) => {
    const [selectedGame, setSelectedGame] = useState<Game | null>(null);
    const [positions, setPositions] = useState<TradingPosition[]>([]);
    const [activeOrders, setActiveOrders] = useState<TradingOrder[]>([]);
    const [pnlSummary, setPnlSummary] = useState<PnLSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Load trading data
    const loadTradingData = async () => {
        try {
            setRefreshing(true);
            const [positionsData, ordersData, pnlData] = await Promise.all([
                api.getPositions(),
                api.getActiveOrders(),
                api.getPnLSummary(),
            ]);

            setPositions(positionsData);
            setActiveOrders(ordersData);
            setPnlSummary(pnlData);
        } catch (err) {
            console.error("Failed to load trading data:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Initial load
    useEffect(() => {
        loadTradingData();

        // Auto-refresh every 10 seconds
        const interval = setInterval(loadTradingData, 10000);
        return () => clearInterval(interval);
    }, []);

    // Select first game with market ticker
    useEffect(() => {
        if (!selectedGame && games.length > 0) {
            const gameWithMarket = games.find(g => g.market_ticker);
            if (gameWithMarket) {
                setSelectedGame(gameWithMarket);
            }
        }
    }, [games, selectedGame]);

    return (
        <div className="min-h-screen bg-background p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-gradient">Trading Terminal</h1>
                    <p className="text-text-muted mt-1">Execute trades and manage positions</p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={loadTradingData}
                        disabled={refreshing}
                        className="px-4 py-2 bg-surface-highlight hover:bg-surface-glass rounded-lg transition-all flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-surface-highlight hover:bg-surface-glass rounded-lg transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* P&L Summary */}
            <PnLSummaryHeader summary={pnlSummary} loading={loading} />

            {/* Main Grid */}
            <div className="grid grid-cols-3 gap-6">
                {/* Left Column: Order Entry */}
                <div className="col-span-1">
                    <OrderEntryPanel
                        game={selectedGame}
                        onOrderPlaced={loadTradingData}
                    />

                    {/* Game Selector */}
                    <div className="mt-4 glass-panel rounded-lg p-4">
                        <h4 className="text-sm font-semibold mb-3">Select Market</h4>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {games.filter(g => g.market_ticker).map((game) => (
                                <button
                                    key={game.game_id}
                                    onClick={() => setSelectedGame(game)}
                                    className={`w-full text-left px-3 py-2 rounded transition-all ${selectedGame?.game_id === game.game_id
                                            ? 'bg-primary text-white'
                                            : 'bg-surface-highlight hover:bg-surface-glass'
                                        }`}
                                >
                                    <div className="text-sm font-medium">
                                        {game.away_team} @ {game.home_team}
                                    </div>
                                    <div className="text-xs opacity-75">
                                        {game.market_data.price}¢
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Middle Column: Positions */}
                <div className="col-span-1">
                    <PositionsGrid positions={positions} loading={loading} />
                </div>

                {/* Right Column: Active Orders */}
                <div className="col-span-1">
                    <ActiveOrdersPanel
                        orders={activeOrders}
                        loading={loading}
                        onRefresh={loadTradingData}
                    />
                </div>
            </div>
        </div>
    );
};

export default TradingTerminal;

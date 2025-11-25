import React from 'react';
import { cn } from './shared';

// Game Card Skeleton
export const GameCardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <div className={cn("h-[280px] bg-surface rounded-2xl border border-zinc-800/50 p-5 space-y-4 overflow-hidden relative", className)}>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
            <div className="flex justify-between">
                <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
            </div>
            <div className="space-y-2 mt-4">
                <div className="h-8 w-full bg-zinc-800/50 rounded animate-pulse" />
                <div className="h-8 w-full bg-zinc-800/50 rounded animate-pulse" />
            </div>
            <div className="h-20 bg-zinc-800/30 rounded-xl mt-6 animate-pulse" />
        </div>
    );
};

// Insights Panel Skeleton
export const InsightsPanelSkeleton: React.FC = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {[1, 2].map((i) => (
                <div key={i} className="bg-surface border border-zinc-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
                            <div className="space-y-2">
                                <div className="h-5 w-32 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-3 w-48 bg-zinc-800/50 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                    <div className="h-64 w-full bg-zinc-900/30 rounded-lg border border-zinc-800/50 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]" />
                        <div className="p-4 space-y-3">
                            {[1, 2, 3, 4].map((j) => (
                                <div key={j} className="h-8 bg-zinc-800/50 rounded animate-pulse" />
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// Game Analytics Modal Skeleton
export const GameAnalyticsModalSkeleton: React.FC = () => {
    return (
        <div className="w-full max-w-2xl bg-zinc-900/95 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-xl relative max-h-[90vh] flex flex-col">
            {/* Header Skeleton */}
            <div className="p-5 md:p-6 pb-0 space-y-4 flex-shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-2">
                        <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-6 w-64 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse" />
                    </div>
                    <div className="h-8 w-32 bg-zinc-800 rounded-full animate-pulse" />
                </div>
                
                {/* Key Metrics Row Skeleton */}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
                            <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse mb-2" />
                            <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
                        </div>
                    ))}
                </div>

                {/* Tabs Skeleton */}
                <div className="flex items-center gap-6 border-b border-zinc-800 mt-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                    ))}
                </div>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 p-5 md:p-6 overflow-y-auto space-y-5">
                {/* Probability Breakdown */}
                <div className="space-y-3">
                    <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="space-y-1">
                                <div className="flex justify-between">
                                    <div className="h-3 w-24 bg-zinc-800/50 rounded animate-pulse" />
                                    <div className="h-3 w-12 bg-zinc-800/50 rounded animate-pulse" />
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Market Snapshot */}
                <div className="space-y-3">
                    <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                                <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse mb-2" />
                                <div className="h-4 w-20 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Analytics Grid */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                        <div className="bg-zinc-900/30 rounded-2xl border border-zinc-800/50 p-4 h-60">
                            <div className="space-y-3">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-4 w-full bg-zinc-800/50 rounded animate-pulse" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-4 w-24 bg-zinc-800 rounded animate-pulse" />
                        <div className="grid grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
                                    <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse mb-2" />
                                    <div className="h-5 w-16 bg-zinc-800 rounded animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Skeleton */}
            <div className="p-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3 text-[11px] flex-shrink-0">
                <div className="h-3 w-24 bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse" />
                <div className="h-3 w-16 bg-zinc-800 rounded animate-pulse" />
            </div>
        </div>
    );
};

// Generic Skeleton Bar
export const SkeletonBar: React.FC<{ width?: string; height?: string; className?: string }> = ({ 
    width = '100%', 
    height = '1rem', 
    className 
}) => {
    return (
        <div 
            className={cn("bg-zinc-800 rounded animate-pulse", className)}
            style={{ width, height }}
        />
    );
};

// Generic Skeleton Circle
export const SkeletonCircle: React.FC<{ size?: string; className?: string }> = ({ 
    size = '2rem', 
    className 
}) => {
    return (
        <div 
            className={cn("bg-zinc-800 rounded-full animate-pulse", className)}
            style={{ width: size, height: size }}
        />
    );
};


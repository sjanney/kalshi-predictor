import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { League } from './api';

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

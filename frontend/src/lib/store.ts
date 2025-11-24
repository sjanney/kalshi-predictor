import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FilterState {
    minConfidence: string; // "ALL", "HIGH", "MEDIUM"
    showCompleted: boolean;
    sortBy: string; // "time", "divergence", "confidence"
    setFilter: (key: keyof FilterState, value: any) => void;
}

export const useFilterStore = create<FilterState>()(
    persist(
        (set) => ({
            minConfidence: "ALL",
            showCompleted: false,
            sortBy: "time",
            setFilter: (key, value) => set((state) => ({ ...state, [key]: value })),
        }),
        {
            name: 'kalshi-predictor-filters',
        }
    )
);


import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const Badge: React.FC<{
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'outline';
    children: React.ReactNode;
    className?: string;
}> = ({ variant = 'default', children, className }) => {
    const variants = {
        default: 'bg-zinc-800 text-zinc-300',
        success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
        danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
        outline: 'border border-zinc-700 text-zinc-400'
    };

    return (
        <span className={cn("px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider", variants[variant], className)}>
            {children}
        </span>
    );
};

export const Card: React.FC<{
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}> = ({ children, className, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className={cn(
                "bg-surface border border-zinc-800 rounded-xl overflow-visible transition-all duration-300", 
                onClick && "cursor-pointer hover:border-zinc-700 hover:bg-surface_highlight/50",
                className
            )}
        >
            {children}
        </div>
    );
};


'use client';

import React from 'react';
import { Sunrise, Sun, Moon, Coffee, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SpecialMenuType } from '@/types';
import type { ActiveSpecialCategory } from './useVendorSpecials';

export function getSpecialIcon(type: SpecialMenuType, className?: string) {
  switch (type) {
    case 'Breakfast':
      return <Sunrise className={cn("h-4 w-4", className)} />;
    case 'Lunch':
      return <Sun className={cn("h-4 w-4", className)} />;
    case 'Evening Snacks':
      return <Coffee className={cn("h-4 w-4", className)} />;
    case 'Dinner':
      return <Moon className={cn("h-4 w-4", className)} />;
    default:
      return <Sparkles className={cn("h-4 w-4", className)} />;
  }
}

export function getSpecialTheme(type: SpecialMenuType) {
  switch (type) {
    case 'Breakfast':
      return {
        badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        bannerGradient: 'from-amber-500/15 via-orange-500/10 to-amber-500/5 border-amber-500/30',
        iconBg: 'bg-amber-500 text-white shadow-amber-500/30',
        pillActive: 'bg-amber-500 text-white border-amber-500 shadow-amber-500/25',
        pillInactive: 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20',
        dotColor: 'bg-amber-500',
        accentColor: 'text-amber-600 dark:text-amber-400',
      };
    case 'Lunch':
      return {
        badgeBg: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30',
        bannerGradient: 'from-orange-500/15 via-amber-500/10 to-orange-500/5 border-orange-500/30',
        iconBg: 'bg-orange-500 text-white shadow-orange-500/30',
        pillActive: 'bg-orange-500 text-white border-orange-500 shadow-orange-500/25',
        pillInactive: 'bg-orange-500/10 border-orange-500/25 text-orange-700 dark:text-orange-300 hover:bg-orange-500/20',
        dotColor: 'bg-orange-500',
        accentColor: 'text-orange-600 dark:text-orange-400',
      };
    case 'Evening Snacks':
      return {
        badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        bannerGradient: 'from-rose-500/15 via-amber-500/10 to-rose-500/5 border-rose-500/30',
        iconBg: 'bg-rose-500 text-white shadow-rose-500/30',
        pillActive: 'bg-rose-500 text-white border-rose-500 shadow-rose-500/25',
        pillInactive: 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20',
        dotColor: 'bg-rose-500',
        accentColor: 'text-rose-600 dark:text-rose-400',
      };
    case 'Dinner':
      return {
        badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        bannerGradient: 'from-indigo-500/15 via-purple-500/10 to-indigo-500/5 border-indigo-500/30',
        iconBg: 'bg-indigo-500 text-white shadow-indigo-500/30',
        pillActive: 'bg-indigo-500 text-white border-indigo-500 shadow-indigo-500/25',
        pillInactive: 'bg-indigo-500/10 border-indigo-500/25 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20',
        dotColor: 'bg-indigo-500',
        accentColor: 'text-indigo-600 dark:text-indigo-400',
      };
  }
}

interface VendorSpecialBannerProps {
  special: ActiveSpecialCategory;
  onResetCategory: () => void;
}

export function VendorSpecialBanner({ special, onResetCategory }: VendorSpecialBannerProps) {
  const theme = getSpecialTheme(special.type);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-4 sm:p-5 mb-5 border shadow-sm bg-gradient-to-r",
        theme.bannerGradient
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          {/* Animated Icon Avatar */}
          <div
            className={cn(
              "w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md",
              theme.iconBg
            )}
          >
            {getSpecialIcon(special.type, "h-5 w-5")}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border",
                  theme.badgeBg
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", theme.dotColor)} />
                Chef&apos;s Special
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {special.itemCount} {special.itemCount === 1 ? 'Dish' : 'Dishes'} Available
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-foreground tracking-tight">
              {special.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              Freshly prepared from the kitchen for your {special.type.toLowerCase()}
            </p>
          </div>
        </div>

        {/* Action Button: Clear filter */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onResetCategory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-background/80 hover:bg-background border border-border/80 shadow-xs hover:border-foreground/20 text-foreground transition-all cursor-pointer"
          >
            <span>View All Categories</span>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

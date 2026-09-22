'use client';

import React from 'react';
import Image from 'next/image';
import { Utensils, Tag, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActiveSpecialCategory } from './useVendorSpecials';
import { getSpecialIcon, getSpecialTheme } from './VendorSpecialBanner';

export interface CategoryPillsBarProps {
  isDineInMode: boolean;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  vendorCategories: string[];
  categoryItemCounts: Record<string, number>;
  totalCategoryItemsCount: number;
  discountedItemsCount: number;
  getCategoryThumbnail: (category: string) => string | undefined;
  activeSpecials?: ActiveSpecialCategory[];
}

export function CategoryPillsBar({
  isDineInMode,
  activeCategory,
  onSelectCategory,
  vendorCategories,
  categoryItemCounts,
  totalCategoryItemsCount,
  discountedItemsCount,
  getCategoryThumbnail,
  activeSpecials = [],
}: CategoryPillsBarProps) {
  const totalDisplayCategories =
    vendorCategories.length +
    activeSpecials.length +
    (discountedItemsCount > 0 ? 1 : 0);

  return (
    <div
      className={cn(
        "sticky top-[58px] bg-background/95 backdrop-blur-md z-40 -mx-4 px-4 border-y border-border/60 shadow-xs",
        isDineInMode ? "py-1.5 sm:py-2 my-2 sm:my-2.5" : "py-2 sm:py-2.5 my-2.5 sm:my-3"
      )}
    >
      <div className="max-w-5xl mx-auto">
        {/* Clean Eyebrow Header: Uncluttered single-line metadata */}
        <div className="flex items-center justify-between pb-1 px-0.5 mb-0.5">
          <div className="flex items-center gap-1.5">
            <LayoutGrid className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-foreground/80">
              Browse Categories
            </span>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold text-muted-foreground">
            {totalDisplayCategories} {totalDisplayCategories === 1 ? 'Category' : 'Categories'}
          </span>
        </div>

        {/* Option A: Single-Row Unified Horizontal Scroll Track */}
        <div className="overflow-x-auto hide-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex items-center gap-1.5 sm:gap-2 w-max py-0.5">
            {/* 1. "All" Option */}
            <button
              type="button"
              onClick={() => onSelectCategory('all')}
              className={cn(
                "rounded-full border h-8 sm:h-9 pl-2 pr-2.5 sm:pr-3.5 shrink-0 transition-all flex items-center gap-1.5 shadow-2xs group cursor-pointer",
                activeCategory === 'all'
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-card/95 border-border/80 text-foreground hover:bg-muted/80 hover:border-primary/40"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                  activeCategory === 'all'
                    ? "bg-white/20 text-white"
                    : "bg-primary/10 text-primary group-hover:bg-primary/20"
                )}
              >
                <Utensils className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              </div>
              <span className="text-xs sm:text-sm font-bold">All</span>
              {totalCategoryItemsCount > 0 && (
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-bold",
                    activeCategory === 'all'
                      ? "bg-white/25 text-white"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {totalCategoryItemsCount}
                </span>
              )}
            </button>

            {/* 2. Active Vendor Specials (e.g. Breakfast, Lunch, Dinner) */}
            {activeSpecials.map((special) => {
              const isSpecialActive = activeCategory === special.categoryKey;
              const theme = getSpecialTheme(special.type);

              return (
                <button
                  key={special.id}
                  type="button"
                  onClick={() => onSelectCategory(special.categoryKey)}
                  className={cn(
                    "rounded-full border h-8 sm:h-9 pl-2 pr-2.5 sm:pr-3.5 shrink-0 transition-all flex items-center gap-1.5 shadow-2xs group cursor-pointer",
                    isSpecialActive ? theme.pillActive : theme.pillInactive
                  )}
                >
                  <div
                    className={cn(
                      "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                      isSpecialActive ? "bg-white/20 text-white" : theme.badgeBg
                    )}
                  >
                    {getSpecialIcon(special.type, "h-2.5 w-2.5 sm:h-3 sm:w-3")}
                  </div>
                  <span className="text-xs sm:text-sm font-bold whitespace-nowrap">
                    {special.title}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-bold",
                      isSpecialActive
                        ? "bg-white/25 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {special.itemCount}
                  </span>
                </button>
              );
            })}

            {/* 3. Special Deals (Shortened label "Deals" to save width) */}
            {discountedItemsCount > 0 && (
              <button
                type="button"
                onClick={() => onSelectCategory('special-deals')}
                className={cn(
                  "rounded-full border h-8 sm:h-9 pl-2 pr-2.5 sm:pr-3.5 shrink-0 transition-all flex items-center gap-1.5 shadow-2xs group cursor-pointer",
                  activeCategory === 'special-deals'
                    ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                    activeCategory === 'special-deals'
                      ? "bg-white/20 text-white"
                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                  )}
                >
                  <Tag className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                </div>
                <span className="text-xs sm:text-sm font-bold whitespace-nowrap">Deals</span>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-bold",
                    activeCategory === 'special-deals'
                      ? "bg-white/25 text-white"
                      : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                  )}
                >
                  {discountedItemsCount}
                </span>
              </button>
            )}

            {/* 4. Food Categories */}
            {vendorCategories.map((category) => {
              const thumb = getCategoryThumbnail(category);
              const count = categoryItemCounts[category] || 0;
              const isActive = activeCategory === category;

              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onSelectCategory(category)}
                  className={cn(
                    "rounded-full border h-8 sm:h-9 pl-2 pr-2.5 sm:pr-3.5 shrink-0 transition-all flex items-center gap-1.5 shadow-2xs group cursor-pointer",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card/95 border-border/80 text-foreground hover:bg-muted/80 hover:border-primary/40"
                  )}
                >
                  {thumb ? (
                    <div className="relative w-4 h-4 sm:w-5 sm:h-5 rounded-full overflow-hidden shrink-0 border border-border/50 shadow-xs bg-muted">
                      <Image
                        src={thumb}
                        alt={category}
                        fill
                        sizes="20px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px] sm:text-xs",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-primary/10 text-primary"
                      )}
                    >
                      {category.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs sm:text-sm font-bold whitespace-nowrap">
                    {category}
                  </span>
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-[10px] sm:text-[11px] px-1.5 py-0.2 rounded-full font-bold",
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

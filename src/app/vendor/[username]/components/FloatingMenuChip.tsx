'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Utensils, Tag, Check, ChevronDown, X, Sparkles } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ActiveSpecialCategory } from './useVendorSpecials';
import { getSpecialIcon, getSpecialTheme } from './VendorSpecialBanner';

export interface FloatingMenuChipProps {
  vendorCategories: string[];
  activeCategory: string;
  onSelectCategory: (category: string) => void;
  categoryItemCounts: Record<string, number>;
  totalCategoryItemsCount: number;
  discountedItemsCount: number;
  getCategoryThumbnail: (category: string) => string | undefined;
  hasBottomBar?: boolean;
  activeSpecials?: ActiveSpecialCategory[];
}

export function FloatingMenuChip({
  vendorCategories,
  activeCategory,
  onSelectCategory,
  categoryItemCounts,
  totalCategoryItemsCount,
  discountedItemsCount,
  getCategoryThumbnail,
  hasBottomBar = false,
  activeSpecials = [],
}: FloatingMenuChipProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (vendorCategories.length === 0 && activeSpecials.length === 0) return null;

  const isFiltered = activeCategory !== 'all';
  const selectedSpecial = activeSpecials.find((s) => s.categoryKey === activeCategory);

  const activeCount = isFiltered
    ? selectedSpecial
      ? selectedSpecial.itemCount
      : activeCategory === 'special-deals'
        ? discountedItemsCount
        : (categoryItemCounts[activeCategory] || 0)
    : vendorCategories.length;

  const displayLabel = activeCategory === 'all'
    ? 'Menu'
    : selectedSpecial
      ? selectedSpecial.title
      : activeCategory === 'special-deals'
        ? 'Deals'
        : activeCategory;

  return (
    <>
      {/* Floating Pill Trigger on Left Side: Vibrant Primary Theme Pill that stands out */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85, x: -24 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className={cn(
          "fixed left-3.5 sm:left-6 z-40 flex items-center rounded-full transition-all duration-300",
          "bg-primary text-primary-foreground shadow-[0_12px_32px_hsl(var(--primary)/0.45)]",
          "border border-white/30 hover:scale-[1.03] active:scale-95",
          hasBottomBar ? "bottom-20 sm:bottom-20" : "bottom-5 sm:bottom-6"
        )}
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open menu categories"
          className="flex items-center gap-2 pl-3.5 pr-2.5 py-2.5 rounded-full cursor-pointer min-w-0"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center text-primary-foreground shrink-0 shadow-xs">
            {selectedSpecial ? (
              getSpecialIcon(selectedSpecial.type, "h-3 w-3 sm:h-3.5 sm:w-3.5")
            ) : activeCategory === 'special-deals' ? (
              <Tag className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            ) : (
              <UtensilsCrossed className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            )}
          </div>
          <span className="text-xs sm:text-sm font-black tracking-wide text-primary-foreground truncate max-w-[120px] sm:max-w-[180px]">
            {displayLabel}
          </span>
          <span className="text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full bg-white/25 text-primary-foreground shrink-0 shadow-2xs">
            {activeCount}
          </span>
        </button>

        {/* Quick Reset Button: Instantly jump back to 'All Dishes' / original chip view mode */}
        {isFiltered && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory('all');
            }}
            title="Reset to all dishes (original mode)"
            className="pr-3 pl-0.5 py-2 text-primary-foreground/80 hover:text-primary-foreground hover:scale-110 active:scale-90 transition-all cursor-pointer"
          >
            <div className="w-4 h-4 rounded-full bg-white/25 hover:bg-white/40 flex items-center justify-center transition-colors">
              <X className="h-2.5 w-2.5" />
            </div>
          </button>
        )}
      </motion.div>

      {/* Category Bottom Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent
          side="bottom"
          className="inset-x-0 bottom-0 max-w-lg mx-auto rounded-t-3xl max-h-[80vh] p-0 flex flex-col border-t border-border/60 shadow-2xl bg-card"
        >
          {/* Top Drag Handle / Pull-Down Bar: Click to slide down */}
          <div
            className="w-full pt-3 pb-1 flex justify-center cursor-pointer group"
            onClick={() => setIsOpen(false)}
            title="Slide down to menu chip"
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/60 transition-colors" />
          </div>

          {/* Top Header Section */}
          <SheetHeader
            className="px-4 pb-3 pt-1 border-b border-border/60 text-left select-none"
          >
            <div className="flex items-center justify-between">
              <div
                className="flex items-center gap-2.5 cursor-pointer flex-1"
                onClick={() => setIsOpen(false)}
              >
                <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <div>
                  <SheetTitle className="text-base font-black text-foreground">
                    Menu Categories
                  </SheetTitle>
                  <p className="text-xs text-muted-foreground">
                    {totalCategoryItemsCount} {totalCategoryItemsCount === 1 ? 'dish' : 'dishes'} • {vendorCategories.length} categories
                  </p>
                </div>
              </div>

              {/* Close / Slide Down Icon Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <ChevronDown className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Category List */}
          <ScrollArea className="flex-1 overflow-y-auto px-3.5 py-2">
            <div className="space-y-1.5 py-1">
              {/* Today's Specials Section (if any active) */}
              {activeSpecials.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 px-2 pb-1.5 mb-1 border-b border-border/40">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                      Today&apos;s Specials
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    {activeSpecials.map((special) => {
                      const isSpecialActive = activeCategory === special.categoryKey;
                      const theme = getSpecialTheme(special.type);
                      return (
                        <button
                          key={special.id}
                          type="button"
                          onClick={() => {
                            onSelectCategory(special.categoryKey);
                            setIsOpen(false);
                          }}
                          className={cn(
                            "w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-left cursor-pointer border",
                            isSpecialActive
                              ? cn(theme.pillActive, "font-bold shadow-xs")
                              : cn(theme.pillInactive, "font-semibold")
                          )}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                              isSpecialActive ? "bg-white/20 text-white" : theme.badgeBg
                            )}>
                              {getSpecialIcon(special.type, "h-4 w-4")}
                            </div>
                            <div>
                              <span className="text-xs sm:text-sm font-bold block">{special.title}</span>
                              <span className="text-[10px] opacity-80 block capitalize">{special.type} special menu</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "text-xs font-bold px-2 py-0.5 rounded-full",
                              isSpecialActive ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                            )}>
                              {special.itemCount}
                            </span>
                            {isSpecialActive && <Check className="h-4 w-4 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Categories Section Header (if specials exist) */}
              {activeSpecials.length > 0 && (
                <div className="flex items-center gap-1.5 px-2 pb-1.5 mb-1 border-b border-border/40">
                  <Utensils className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                    Menu Categories
                  </span>
                </div>
              )}

              {/* "All Dishes" Option */}
              <button
                type="button"
                onClick={() => {
                  onSelectCategory('all');
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-left cursor-pointer",
                  activeCategory === 'all'
                    ? "bg-primary text-primary-foreground font-bold shadow-xs"
                    : "hover:bg-muted/70 text-foreground font-semibold"
                )}
              >
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                    activeCategory === 'all' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    <Utensils className="h-4 w-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold">All Dishes</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    activeCategory === 'all' ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                  )}>
                    {totalCategoryItemsCount}
                  </span>
                  {activeCategory === 'all' && <Check className="h-4 w-4 text-white" />}
                </div>
              </button>

              {/* Special Deals (if available) */}
              {discountedItemsCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectCategory('special-deals');
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-left cursor-pointer",
                    activeCategory === 'special-deals'
                      ? "bg-amber-500 text-white font-bold shadow-xs"
                      : "hover:bg-amber-500/10 text-foreground font-semibold"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                      activeCategory === 'special-deals' ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                    )}>
                      <Tag className="h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold">Special Deals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      activeCategory === 'special-deals' ? "bg-white/25 text-white" : "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                    )}>
                      {discountedItemsCount}
                    </span>
                    {activeCategory === 'special-deals' && <Check className="h-4 w-4 text-white" />}
                  </div>
                </button>
              )}

              {/* Food Categories */}
              {vendorCategories.map((category) => {
                const count = categoryItemCounts[category] || 0;
                const thumb = getCategoryThumbnail(category);
                const isActive = activeCategory === category;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      onSelectCategory(category);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-2.5 sm:p-3 rounded-2xl transition-all text-left cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "hover:bg-muted/70 text-foreground font-semibold"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      {thumb ? (
                        <div className="relative w-8 h-8 rounded-xl overflow-hidden shrink-0 border border-border/50 bg-muted">
                          <Image
                            src={thumb}
                            alt={category}
                            fill
                            sizes="32px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className={cn(
                          "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                          isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                        )}>
                          {category.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs sm:text-sm font-bold">{category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        isActive ? "bg-white/25 text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {count}
                      </span>
                      {isActive && <Check className="h-4 w-4 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}

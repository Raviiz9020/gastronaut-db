'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChefHat, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuItem as MenuItemType, Vendor } from '@/types';
import { VendorStatus } from '@/types';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';

export interface CombinedMenuItemRowProps {
  items: MenuItemType[];
  onImageClick: (item: MenuItemType, layoutId: string) => void;
  onRowClick: (items: MenuItemType[]) => void;
  prefix: string;
  itemRef?: React.Ref<HTMLDivElement>;
  vendor?: Vendor | null;
  totalQuantity?: number;
  kitchenQuantity?: number;
  kitchenRound?: number;
  onQuantityChange?: (item: MenuItemType, change: number) => void;
}

export const CombinedMenuItemRow: React.FC<CombinedMenuItemRowProps> = ({
  items,
  onImageClick,
  onRowClick,
  prefix,
  itemRef,
  vendor,
  totalQuantity = 0,
  kitchenQuantity = 0,
  kitchenRound = 1,
  onQuantityChange,
}) => {
  const primaryItem = items[0]; // Use the first item for common details
  const layoutId = `${prefix}-${primaryItem.id}`;
  const imageToDisplay = primaryItem.imageDataUrl || primaryItem.image;
  const baseName = primaryItem.name.replace(/\s+(full|half)$/i, '').trim();
  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
  const isEffectivelyAvailable = items.some(item => isItemInStock(item, vendor?.isInventory)) && isShopOpen;

  const halfPortion = items.find(item => item.name.toLowerCase().includes('half'));
  const fullPortion = items.find(item => item.name.toLowerCase().includes('full'));

  const halfPrice = halfPortion ? (halfPortion.isDiscountActive && halfPortion.discountPrice ? halfPortion.discountPrice : halfPortion.price) : null;
  const fullPrice = fullPortion ? (fullPortion.isDiscountActive && fullPortion.discountPrice ? fullPortion.discountPrice : fullPortion.price) : null;

  const halfStock = halfPortion?.stock;
  const fullStock = fullPortion?.stock;

  return (
    <div
      ref={itemRef}
      className={cn(
        "flex items-start justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-border/60 bg-card transition-all duration-200 relative group",
        isEffectivelyAvailable
          ? "cursor-pointer hover:border-primary/40 hover:shadow-xs hover:bg-card/95"
          : "opacity-60 grayscale-[0.5] cursor-not-allowed bg-muted/20"
      )}
      onClick={() => isEffectivelyAvailable && onRowClick(items)}
    >
      {/* Left: Dish Details & Portions */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span
            className={cn(
              "w-3.5 h-3.5 rounded-xs border flex items-center justify-center bg-background shrink-0",
              primaryItem.isVeg ? "border-emerald-600" : "border-red-600"
            )}
            title={primaryItem.isVeg ? "Vegetarian" : "Non-Vegetarian"}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                primaryItem.isVeg ? "bg-emerald-600" : "bg-red-600"
              )}
            />
          </span>
          <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground border border-border/50">
            2 Portions
          </span>

          {kitchenQuantity > 0 && (
            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
              <ChefHat className="h-2.5 w-2.5" />
              <span>{kitchenQuantity} in kitchen{kitchenRound ? ` (R${kitchenRound})` : ''}</span>
            </span>
          )}
        </div>

        <h4 className="font-bold text-xs sm:text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
          {baseName}
        </h4>

        {primaryItem.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 sm:line-clamp-2 mt-0.5 leading-relaxed">
            {primaryItem.description}
          </p>
        )}

        <div className="flex items-baseline gap-1.5 mt-1.5 text-xs sm:text-sm font-extrabold text-foreground flex-wrap">
          {halfPrice !== null && (
            <span className="bg-muted/80 px-2.5 py-0.5 rounded-full border border-border/50 text-[11px] font-bold">
              Half: ₹{halfPrice.toFixed(0)}
            </span>
          )}
          {fullPrice !== null && (
            <span className="bg-muted/80 px-2.5 py-0.5 rounded-full border border-border/50 text-[11px] font-bold">
              Full: ₹{fullPrice.toFixed(0)}
            </span>
          )}
        </div>

        <div className="text-[10px] text-destructive font-bold mt-1 space-x-1.5">
          {typeof halfStock === 'number' && halfStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || halfStock <= 5) && <span>Only {halfStock} half left! </span>}
          {typeof fullStock === 'number' && fullStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || fullStock <= 5) && <span>Only {fullStock} full left!</span>}
        </div>
      </div>

      {/* Right: Food Thumbnail & Add Button */}
      <div className="flex flex-col items-center shrink-0">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted/60 border border-border/50 shadow-2xs">
          <motion.div
            layoutId={layoutId}
            className="w-full h-full relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(primaryItem, layoutId);
            }}
          >
            <Image
              src={imageToDisplay || 'https://placehold.co/100x100.png'}
              alt={baseName}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              data-ai-hint={primaryItem.aiHint}
              placeholder={primaryItem.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={primaryItem.blurDataUrl}
            />
          </motion.div>

          {!isEffectivelyAvailable && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex items-center justify-center z-10 p-1">
              <span className="text-[9px] font-extrabold text-destructive text-center uppercase tracking-wider">
                {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Sold Out'}
              </span>
            </div>
          )}
        </div>

        {isEffectivelyAvailable && (
          <div className="w-auto min-w-[64px] -mt-3.5 z-10 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {totalQuantity > 0 ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center justify-between gap-1 bg-background border-2 border-primary rounded-full px-2 py-0.5 shadow-md h-7 min-w-[64px]">
                  <span className="font-extrabold text-xs text-primary select-none pl-1">
                    {totalQuantity}
                  </span>
                  <button
                    type="button"
                    className="h-5 w-5 rounded-full flex items-center justify-center text-primary hover:bg-primary/15 transition-colors cursor-pointer ml-1"
                    onClick={() => onRowClick(items)}
                    title="Select more portions"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                  </button>
                </div>
                <span className="text-[8px] text-muted-foreground text-center block mt-0.5 font-semibold">
                  select portion
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-16 h-7 rounded-full border-2 border-primary text-primary font-extrabold text-[11px] bg-background hover:bg-primary hover:text-primary-foreground shadow-sm transition-all uppercase tracking-wider flex items-center justify-center gap-0.5 p-0 cursor-pointer"
                  onClick={() => onRowClick(items)}
                >
                  ADD <ChevronDown className="h-3 w-3" />
                </Button>
                <span className="text-[8px] text-muted-foreground text-center block mt-0.5 font-semibold">
                  select portion
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CombinedMenuItemRow;

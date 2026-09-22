'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChefHat, Minus, Plus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MenuItem as MenuItemType, Vendor } from '@/types';
import { VendorStatus } from '@/types';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';

export interface MenuItemRowProps {
  item: MenuItemType;
  onImageClick: (item: MenuItemType, layoutId: string) => void;
  onRowClick: (item: MenuItemType) => void;
  prefix: string;
  itemRef?: React.Ref<HTMLDivElement>;
  vendor?: Vendor | null;
  simpleQuantity?: number;
  totalQuantity?: number;
  kitchenQuantity?: number;
  kitchenRound?: number;
  onQuantityChange?: (item: MenuItemType, change: number) => void;
}

export const MenuItemRow: React.FC<MenuItemRowProps> = ({
  item,
  onImageClick,
  onRowClick,
  prefix,
  itemRef,
  vendor,
  simpleQuantity = 0,
  totalQuantity = 0,
  kitchenQuantity = 0,
  kitchenRound = 1,
  onQuantityChange,
}) => {
  const hasDiscount =
    !!(item.isDiscountActive && item.discountPrice && item.discountPrice > 0);

  const isCustomizable = item.customizations && item.customizations.length > 0;
  const hasMandatoryCustomization = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;

  const startingPrice = useMemo(() => {
    if (!isCustomizable) {
      return hasDiscount ? item.discountPrice! : item.price;
    }

    const basePrice = hasMandatoryCustomization ? 0 : (hasDiscount ? item.discountPrice! : item.price);

    let mandatoryCustomizationsPrice = 0;
    item.customizations?.forEach(c => {
      if (Number(c.minSelect) > 0) {
        const groupMinOptionPrice = Math.min(...c.options.map(o => {
          return item.isDiscountActive ? o.price : (o.originalPrice || o.price);
        }));
        if (groupMinOptionPrice !== Infinity) {
          mandatoryCustomizationsPrice += groupMinOptionPrice;
        }
      }
    });

    const calculatedPrice = basePrice + mandatoryCustomizationsPrice;

    if (calculatedPrice === 0) {
      let minOptPrice = Infinity;
      item.customizations?.forEach(group => {
        group.options.forEach(o => {
          const optPrice = item.isDiscountActive ? o.price : (o.originalPrice || o.price);
          if (optPrice < minOptPrice) {
            minOptPrice = optPrice;
          }
        });
      });
      if (minOptPrice !== Infinity) {
        return minOptPrice;
      }
    }

    return calculatedPrice;
  }, [item, isCustomizable, hasMandatoryCustomization, hasDiscount]);

  const displayPrice = startingPrice || 0;
  const layoutId = `${prefix}-${item.id}`;
  const imageToDisplay = item.imageDataUrl || item.image;
  const isEffectivelyInStock = isItemInStock(item, vendor?.isInventory);

  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
  const isItemEffectivelyAvailable = item.isAvailable && isShopOpen && isEffectivelyInStock;

  return (
    <div
      ref={itemRef}
      className={cn(
        "flex items-start justify-between gap-3 p-3 sm:p-3.5 rounded-2xl border border-border/60 bg-card transition-all duration-200 relative group",
        isItemEffectivelyAvailable
          ? "cursor-pointer hover:border-primary/40 hover:shadow-xs hover:bg-card/95"
          : "opacity-60 grayscale-[0.5] cursor-not-allowed bg-muted/20"
      )}
      onClick={() => {
        if (!isItemEffectivelyAvailable) return;
        if (isCustomizable) {
          onRowClick(item);
        } else if (simpleQuantity === 0) {
          onRowClick(item);
        }
      }}
    >
      {/* Left: Dietary Icon, Dish Details & Pricing */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          {/* Veg/Non-Veg icon */}
          <span
            className={cn(
              "w-3.5 h-3.5 rounded-xs border flex items-center justify-center bg-background shrink-0",
              item.isVeg ? "border-emerald-600" : "border-red-600"
            )}
            title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
          >
            <span
              className={cn(
                "w-1.5 h-1.5 rounded-full",
                item.isVeg ? "bg-emerald-600" : "bg-red-600"
              )}
            />
          </span>

          {hasDiscount && (
            <span className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
              Offer
            </span>
          )}

          {kitchenQuantity > 0 && (
            <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
              <ChefHat className="h-2.5 w-2.5" />
              <span>{kitchenQuantity} in kitchen{kitchenRound ? ` (R${kitchenRound})` : ''}</span>
            </span>
          )}
        </div>

        <h4 className="font-bold text-xs sm:text-sm text-foreground leading-snug group-hover:text-primary transition-colors line-clamp-1">
          {item.name}
        </h4>

        {item.description && (
          <p className="text-[11px] text-muted-foreground line-clamp-1 sm:line-clamp-2 mt-0.5 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
          {isCustomizable && (
            <span className="text-[9px] text-muted-foreground font-semibold">From</span>
          )}
          <span className="text-sm sm:text-base font-extrabold text-foreground tracking-tight">
            ₹{displayPrice.toFixed(0)}
          </span>
          {hasDiscount && item.price > 0 && (
            <span className="text-[11px] text-muted-foreground line-through font-medium">
              ₹{item.price.toFixed(0)}
            </span>
          )}
        </div>

        {typeof item.stock === 'number' && item.stock > 0 && !item.customizations?.length && (vendor?.isInventory || vendor?.category === 'Bakery' || item.stock <= 5) && (
          <p className={cn(
            "text-[10px] font-bold mt-1",
            item.stock <= 5 ? "text-destructive" : "text-amber-600 dark:text-amber-400"
          )}>
            Only {item.stock} left!
          </p>
        )}
      </div>

      {/* Right: Food Thumbnail & Add Button */}
      <div className="flex flex-col items-center shrink-0">
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted/60 border border-border/50 shadow-2xs">
          <motion.div
            layoutId={layoutId}
            className="w-full h-full relative cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(item, layoutId);
            }}
          >
            <Image
              src={imageToDisplay || 'https://placehold.co/100x100.png'}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              data-ai-hint={item.aiHint}
              placeholder={item.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={item.blurDataUrl}
            />
          </motion.div>

          {/* Sold Out / Unavailable Overlay */}
          {!isItemEffectivelyAvailable && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-xs flex items-center justify-center z-10 p-1">
              <span className="text-[9px] font-extrabold text-destructive text-center uppercase tracking-wider">
                {!isShopOpen ? (shopStatus?.msg || 'Closed') : (!isEffectivelyInStock ? 'Sold Out' : 'Out')}
              </span>
            </div>
          )}
        </div>

        {/* Tactile Stepper / ADD Button */}
        {isItemEffectivelyAvailable && (
          <div className="w-auto min-w-[64px] -mt-3.5 z-10 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            {!isCustomizable ? (
              simpleQuantity > 0 ? (
                <div className="flex items-center justify-between gap-1 bg-background border-2 border-primary rounded-full px-1 py-0.5 shadow-md h-7 min-w-[76px]">
                  <button
                    type="button"
                    className="h-5 w-5 rounded-full flex items-center justify-center text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                    onClick={() => onQuantityChange ? onQuantityChange(item, -1) : onRowClick(item)}
                    title="Decrease"
                  >
                    <Minus className="h-3 w-3 stroke-[2.5]" />
                  </button>
                  <span className="font-extrabold text-xs text-primary text-center select-none px-1">
                    {simpleQuantity}
                  </span>
                  <button
                    type="button"
                    className="h-5 w-5 rounded-full flex items-center justify-center text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                    onClick={() => onQuantityChange ? onQuantityChange(item, 1) : onRowClick(item)}
                    title="Increase"
                  >
                    <Plus className="h-3 w-3 stroke-[2.5]" />
                  </button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-16 h-7 rounded-full border-2 border-primary text-primary font-extrabold text-[11px] bg-background hover:bg-primary hover:text-primary-foreground shadow-sm transition-all uppercase tracking-wider flex items-center justify-center p-0 cursor-pointer"
                  onClick={() => onRowClick(item)}
                >
                  ADD
                </Button>
              )
            ) : (
              totalQuantity > 0 ? (
                <div className="flex flex-col items-center">
                  <div className="flex items-center justify-between gap-1 bg-background border-2 border-primary rounded-full px-2 py-0.5 shadow-md h-7 min-w-[64px]">
                    <span className="font-extrabold text-xs text-primary select-none pl-1">
                      {totalQuantity}
                    </span>
                    <button
                      type="button"
                      className="h-5 w-5 rounded-full flex items-center justify-center text-primary hover:bg-primary/15 transition-colors cursor-pointer ml-1"
                      onClick={() => onQuantityChange ? onQuantityChange(item, 1) : onRowClick(item)}
                      title="Add more customized"
                    >
                      <Plus className="h-3 w-3 stroke-[2.5]" />
                    </button>
                  </div>
                  <span className="text-[8px] text-muted-foreground text-center block mt-0.5 font-semibold">
                    customisable
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-16 h-7 rounded-full border-2 border-primary text-primary font-extrabold text-[11px] bg-background hover:bg-primary hover:text-primary-foreground shadow-sm transition-all uppercase tracking-wider flex items-center justify-center gap-0.5 p-0 cursor-pointer"
                    onClick={() => onRowClick(item)}
                  >
                    ADD <ChevronDown className="h-3 w-3" />
                  </Button>
                  <span className="text-[8px] text-muted-foreground text-center block mt-0.5 font-semibold">
                    customisable
                  </span>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItemRow;

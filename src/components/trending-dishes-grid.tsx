'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Flame, Plus, Minus } from 'lucide-react';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import { useLocation } from '@/context/location-context';
import { useCart } from '@/context/cart-context';
import { useOrder } from '@/context/order-context';
import { useToast } from '@/hooks/use-toast';
import { isVendorServiceable } from '@/lib/location-utils';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';
import { cn } from '@/lib/utils';
import OrderCustomizationSheet from '@/components/order-customization-sheet';
import SelfPickupDialog from '@/components/self-pickup-dialog';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import type { MenuItem as MenuItemType, Vendor } from '@/types';

export default function TrendingDishesGrid() {
  const { menuItems, fetchAllItems } = useMenu();
  const { vendors } = useVendor();
  const { userLocation } = useLocation();
  const { cartItems, addToCart, updateCartItemQuantity } = useCart();
  const { orders } = useOrder();
  const { toast } = useToast();

  const [selectedCustomItem, setSelectedCustomItem] = useState<MenuItemType | null>(null);
  const [selectedCustomVendor, setSelectedCustomVendor] = useState<Vendor | null>(null);

  // Self Pickup Selection Dialog state
  const [selfPickupState, setSelfPickupState] = useState<{
    open: boolean;
    item: MenuItemType | null;
    vendor: Vendor | null;
    selectedOptions: Record<string, string | string[]>;
    quantity: number;
  }>({
    open: false,
    item: null,
    vendor: null,
    selectedOptions: {},
    quantity: 1,
  });

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  // Compute trending / high-demand dishes strictly available in the serviceable area
  const trendingDishes = useMemo(() => {
    // 1. Serviceable approved vendors
    let approvedVendors = vendors.filter((v) => v.isApproved && v.shopName);
    if (userLocation) {
      approvedVendors = approvedVendors.filter((v) => isVendorServiceable(v, userLocation));
    }
    const vendorMap = new Map(approvedVendors.map((v) => [v.username, v]));

    // 2. Count actual order frequency from database orders
    const itemOrderCounts = new Map<string, number>();
    orders.forEach((o) => {
      if (o.status === 'Delivered' || o.status === 'Accepted') {
        o.items?.forEach((it: any) => {
          const id = it.menuItemId || it.id;
          if (id) {
            itemOrderCounts.set(id, (itemOrderCounts.get(id) || 0) + (it.quantity || 1));
          }
        });
      }
    });

    // 3. Filter available & in-stock items (exclude low-ticket utility items < ₹40 like water bottles/tea)
    const availableItems = menuItems.filter((item) => {
      const vendor = vendorMap.get(item.vendorUsername);
      if (!vendor) return false;
      if (!item.isAvailable) return false;
      const effectivePrice = item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price;
      if (effectivePrice < 40) return false;
      return isItemInStock(item, vendor.isInventory);
    });

    if (availableItems.length === 0) return [];

    // 4. Score dishes dynamically based on real order volume, popularity tags, and ratings
    const scoredItems = availableItems.map((item) => {
      const orderVolume = itemOrderCounts.get(item.id) || 0;
      let score = orderVolume * 15;
      if (item.isPopular) score += 50;
      if (item.isDiscountActive && item.discountPrice) score += 25;
      if (item.ratingCount && item.ratingCount > 0) score += item.ratingCount * 5;
      if (item.image) score += 10;
      return { item, score, vendor: vendorMap.get(item.vendorUsername)! };
    });

    scoredItems.sort((a, b) => b.score - a.score);

    return scoredItems.slice(0, 12);
  }, [menuItems, vendors, userLocation, orders]);

  const handleAddToCartWithDeliveryCheck = (
    item: MenuItemType,
    vendor: Vendor,
    selectedOptions: Record<string, string | string[]> = {},
    quantity = 1
  ) => {
    const shopStatus = vendor ? VendorStatusManager.getShopStatus(vendor) : null;
    if (shopStatus && shopStatus.status !== VendorStatus.OPEN) {
      toast({
        title: 'Shop is Closed',
        description: `${vendor.shopName || 'Vendor'} is currently closed (${shopStatus.msg}).`,
        variant: 'destructive',
      });
      return;
    }

    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    const isFirstItemFromThisVendor = cartItems.every(
      (ci) => ci.vendorUsername !== item.vendorUsername
    );
    const isCartEmpty = cartItems.length === 0;

    if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
      setSelfPickupState({
        open: true,
        item,
        vendor,
        selectedOptions,
        quantity,
      });
    } else {
      addToCart(item, selectedOptions, quantity);
    }
  };

  const handleSelfPickupChoice = (choice: 'delivery' | 'pickup') => {
    const { item, selectedOptions, quantity, vendor } = selfPickupState;
    if (item) {
      const shopStatus = vendor ? VendorStatusManager.getShopStatus(vendor) : null;
      if (shopStatus && shopStatus.status !== VendorStatus.OPEN) {
        toast({
          title: 'Shop is Closed',
          description: `${vendor?.shopName || 'Vendor'} is currently closed (${shopStatus.msg}).`,
          variant: 'destructive',
        });
        setSelfPickupState({
          open: false,
          item: null,
          vendor: null,
          selectedOptions: {},
          quantity: 1,
        });
        return;
      }
      const forceSelfPickup = choice === 'pickup';
      addToCart(item, selectedOptions, quantity, forceSelfPickup);
    }
    setSelfPickupState({
      open: false,
      item: null,
      vendor: null,
      selectedOptions: {},
      quantity: 1,
    });
  };

  const handleAddClick = (item: MenuItemType, vendor: Vendor) => {
    const shopStatus = vendor ? VendorStatusManager.getShopStatus(vendor) : null;
    if (shopStatus && shopStatus.status !== VendorStatus.OPEN) {
      toast({
        title: 'Shop is Closed',
        description: `${vendor.shopName || 'Vendor'} is currently closed (${shopStatus.msg}).`,
        variant: 'destructive',
      });
      return;
    }

    if (!isItemInStock(item, vendor?.isInventory)) {
      toast({
        title: 'Item Unavailable',
        description: `${item.name} is currently out of stock.`,
        variant: 'destructive',
      });
      return;
    }

    const hasCustomizations = item.customizations && item.customizations.length > 0;

    if (hasCustomizations) {
      setSelectedCustomItem(item);
      setSelectedCustomVendor(vendor);
    } else {
      handleAddToCartWithDeliveryCheck(item, vendor, {}, 1);
    }
  };

  const handleQuantityChange = (
    e: React.MouseEvent,
    item: MenuItemType,
    vendor: Vendor,
    delta: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const shopStatus = vendor ? VendorStatusManager.getShopStatus(vendor) : null;
    if (shopStatus && shopStatus.status !== VendorStatus.OPEN) {
      toast({
        title: 'Shop is Closed',
        description: `${vendor.shopName || 'Vendor'} is currently closed (${shopStatus.msg}).`,
        variant: 'destructive',
      });
      return;
    }

    const simpleCartItem = cartItems.find(
      (ci) => ci.id === item.id && Object.keys(ci.customizationDetails || {}).length === 0
    );

    if (!simpleCartItem) {
      if (delta > 0) {
        handleAddClick(item, vendor);
      }
    } else {
      const newQty = simpleCartItem.quantity + delta;
      updateCartItemQuantity(simpleCartItem.cartItemId, newQty);
    }
  };

  if (trendingDishes.length === 0) {
    return null;
  }

  return (
    <section className="py-5">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
            <Flame className="h-3.5 w-3.5 fill-red-500" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-headline tracking-tight">
              Trending in Your Area
            </h2>
            <p className="text-[11px] text-muted-foreground">
              Most ordered dishes by your neighbors
            </p>
          </div>
        </div>
      </div>

      <Carousel
        opts={{
          align: 'start',
          loop: trendingDishes.length > 5,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-2.5">
          {trendingDishes.map(({ item, vendor }) => {
            const shopStatus = VendorStatusManager.getShopStatus(vendor);
            const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
            const isEffectivelyInStock = isItemInStock(item, vendor?.isInventory);
            const isEffectivelyAvailable = isEffectivelyInStock && isShopOpen;

            const simpleCartItem = cartItems.find(
              (ci) => ci.id === item.id && Object.keys(ci.customizationDetails || {}).length === 0
            );
            const totalQty = cartItems
              .filter((ci) => ci.id === item.id)
              .reduce((sum, ci) => sum + ci.quantity, 0);

            const hasCustomizations = item.customizations && item.customizations.length > 0;
            const price =
              item.isDiscountActive && item.discountPrice
                ? item.discountPrice
                : item.price;
            const originalPrice = item.price;
            const hasDiscount = item.isDiscountActive && item.discountPrice && item.discountPrice < item.price;
            const discountPercent = hasDiscount
              ? Math.round(((originalPrice - price) / originalPrice) * 100)
              : 0;

            const vendorIdentifier = vendor.slug || vendor.username;

            return (
              <CarouselItem
                key={item.id}
                className="basis-[45%] sm:basis-1/3 md:basis-1/4 lg:basis-[18.5%] pl-2.5"
              >
                <div className={cn(
                  "group relative bg-card rounded-2xl border border-border/60 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full",
                  !isEffectivelyAvailable && "opacity-70 grayscale-[25%]"
                )}>
                  {/* Compact Dish Image */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                    <Image
                      src={item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 160px, 200px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                      blurDataURL={item.blurDataUrl}
                    />

                    {/* Veg/Non-Veg indicator */}
                    <div className="absolute top-2 left-2 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-md p-0.5 shadow-sm flex items-center justify-center">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                    </div>

                    {/* Discount Badge */}
                    {hasDiscount && isEffectivelyAvailable && (
                      <div className="absolute top-2 right-2 z-10 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md">
                        {discountPercent}% OFF
                      </div>
                    )}

                    {/* Closed / Out of Stock Overlay */}
                    {!isEffectivelyAvailable && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-[1.5px] flex items-center justify-center z-20 p-2">
                        <span className="text-foreground font-bold text-[11px] text-center px-2.5 py-1 rounded-full bg-muted/95 border border-border shadow-sm">
                          {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Out of Stock'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-2.5 flex flex-col justify-between flex-1">
                    <div>
                      <Link
                        href={`/menu?vendor=${vendorIdentifier}`}
                        className="text-[10px] font-medium text-muted-foreground hover:text-primary transition-colors truncate block mb-0.5"
                      >
                        {vendor.shopName}
                      </Link>
                      <h3 className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {item.name}
                      </h3>
                    </div>

                    {/* Price and Stepper Action */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                      <div className="flex items-baseline gap-1">
                        <span className="font-bold text-sm text-foreground">
                          ₹{price.toFixed(0)}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-muted-foreground line-through">
                            ₹{originalPrice.toFixed(0)}
                          </span>
                        )}
                      </div>

                      {/* Interactive Stepper Button */}
                      {totalQty > 0 && !hasCustomizations && isEffectivelyAvailable ? (
                        <div className="flex items-center bg-primary text-primary-foreground rounded-full h-7 px-1 shadow-sm">
                          <button
                            onClick={(e) => handleQuantityChange(e, item, vendor, -1)}
                            className="w-5 h-full flex items-center justify-center hover:bg-black/10 rounded-full transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="text-[11px] font-bold w-4 text-center">
                            {totalQty}
                          </span>
                          <button
                            onClick={(e) => handleQuantityChange(e, item, vendor, 1)}
                            className="w-5 h-full flex items-center justify-center hover:bg-black/10 rounded-full transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!isEffectivelyAvailable}
                          className={cn(
                            "h-7 px-2.5 text-[11px] font-bold rounded-full shadow-sm transition-all",
                            !isEffectivelyAvailable
                              ? "text-muted-foreground border-border/40 opacity-60 cursor-not-allowed"
                              : "text-primary border-primary/40 hover:bg-primary hover:text-white group-hover:border-primary"
                          )}
                          onClick={() => isEffectivelyAvailable && handleAddClick(item, vendor)}
                        >
                          ADD <Plus className="h-2.5 w-2.5 ml-0.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {/* Customization Sheet for customizable dishes */}
      {selectedCustomItem && (
        <OrderCustomizationSheet
          open={!!selectedCustomItem}
          item={selectedCustomItem}
          vendor={selectedCustomVendor}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedCustomItem(null);
              setSelectedCustomVendor(null);
            }
          }}
          onAdd={(item, selectedOptions, quantity) => {
            if (selectedCustomVendor) {
              handleAddToCartWithDeliveryCheck(
                item,
                selectedCustomVendor,
                selectedOptions,
                quantity
              );
            }
          }}
        />
      )}

      {/* Self-Pickup vs Delivery Choice Dialog */}
      <SelfPickupDialog
        open={selfPickupState.open}
        onOpenChange={(open) => {
          if (!open) {
            setSelfPickupState((prev) => ({ ...prev, open: false }));
          }
        }}
        vendorName={selfPickupState.vendor?.shopName || selfPickupState.item?.shopName}
        minOrderAmount={selfPickupState.vendor?.minOrderAmount || 0}
        onSelectOption={handleSelfPickupChoice}
      />
    </section>
  );
}

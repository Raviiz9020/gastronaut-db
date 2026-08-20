'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RotateCcw, Plus, Minus, ShoppingBag, Check } from 'lucide-react';
import { useCustomer } from '@/context/customer-context';
import { useOrder } from '@/context/order-context';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from '@/context/location-context';
import { isVendorServiceable } from '@/lib/location-utils';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';
import { cn } from '@/lib/utils';
import SelfPickupDialog from '@/components/self-pickup-dialog';
import OrderCustomizationSheet from '@/components/order-customization-sheet';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import type { MenuItem as MenuItemType, Vendor } from '@/types';

export default function OrderAgainShelf() {
  const { customer } = useCustomer();
  const { orders, loadUserOrders } = useOrder();
  const { menuItems, fetchAllItems } = useMenu();
  const { vendors, fetchAllVendors } = useVendor();
  const { addToCart, updateCartItemQuantity, cartItems } = useCart();
  const { userLocation } = useLocation();
  const { toast } = useToast();

  const [selectedCustomItem, setSelectedCustomItem] = useState<MenuItemType | null>(null);
  const [selectedCustomVendor, setSelectedCustomVendor] = useState<Vendor | null>(null);

  const [selfPickupState, setSelfPickupState] = useState<{
    open: boolean;
    item: MenuItemType | null;
    vendor: Vendor | null;
    selectedOptions?: Record<string, string | string[]>;
    quantity?: number;
  }>({
    open: false,
    item: null,
    vendor: null,
    selectedOptions: {},
    quantity: 1,
  });

  // Load customer orders using customer.username (standardized Firestore key)
  useEffect(() => {
    const userIdentifier = customer?.username || customer?.contact;
    if (userIdentifier) {
      const unsubscribe = loadUserOrders(userIdentifier, 'customer');
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [customer?.username, customer?.contact, loadUserOrders]);

  useEffect(() => {
    fetchAllItems();
    fetchAllVendors();
  }, [fetchAllItems, fetchAllVendors]);

  // Compute unique previously ordered dishes that are still available on the platform
  const repeatItems = useMemo(() => {
    if (!customer || !orders || orders.length === 0) return [];

    // Include all active or completed placed orders (exclude cancelled)
    const validOrders = orders.filter((o) => o.status !== 'Cancelled');

    if (validOrders.length === 0) return [];

    // Map of unique item IDs / names to their details
    const itemMap = new Map<
      string,
      {
        item: MenuItemType;
        orderCount: number;
        lastOrderedVendor: string;
      }
    >();

    validOrders.forEach((order) => {
      if (!order.items) return;
      order.items.forEach((orderItem: any) => {
        const matchingMenuItem = menuItems.find(
          (m) =>
            m.id === orderItem.menuItemId ||
            m.id === orderItem.id ||
            m.name?.toLowerCase() === orderItem.name?.toLowerCase()
        );

        if (matchingMenuItem && matchingMenuItem.isAvailable) {
          const vendor = vendors.find((v) => v.username === matchingMenuItem.vendorUsername);
          // Strictly ensure vendor is approved, has an active shop name, and is serviceable
          const isServiceable = vendor ? (userLocation ? isVendorServiceable(vendor, userLocation) : true) : false;
          if (vendor && vendor.isApproved && vendor.shopName && isServiceable && isItemInStock(matchingMenuItem, vendor.isInventory)) {
            const key = matchingMenuItem.id;
            const existing = itemMap.get(key);
            if (existing) {
              existing.orderCount += 1;
            } else {
              itemMap.set(key, {
                item: matchingMenuItem,
                orderCount: 1,
                lastOrderedVendor:
                  vendor.shopName ||
                  (order as any).vendorName ||
                  matchingMenuItem.shopName ||
                  matchingMenuItem.vendorUsername,
              });
            }
          }
        }
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => b.orderCount - a.orderCount);
  }, [customer, orders, menuItems, vendors, userLocation]);

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
    const { item, vendor, selectedOptions, quantity } = selfPickupState;
    if (item && vendor) {
      if (!vendor.isApproved) {
        toast({
          title: 'Vendor Unavailable',
          description: 'This vendor is no longer active or approved.',
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

      const shopStatus = VendorStatusManager.getShopStatus(vendor);
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
      addToCart(item, selectedOptions || {}, quantity || 1, forceSelfPickup);
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
    if (!vendor || !vendor.isApproved) {
      toast({
        title: 'Vendor Unavailable',
        description: 'This vendor is no longer active or approved.',
        variant: 'destructive',
      });
      return;
    }

    const shopStatus = VendorStatusManager.getShopStatus(vendor);
    if (shopStatus && shopStatus.status !== VendorStatus.OPEN) {
      toast({
        title: 'Shop is Closed',
        description: `${vendor?.shopName || 'Vendor'} is currently closed (${shopStatus.msg}).`,
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
        description: `${vendor?.shopName || 'Vendor'} is currently closed (${shopStatus.msg}).`,
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

  // If user is not logged in or has no placed past orders, hide section
  if (!customer || repeatItems.length === 0) {
    return null;
  }

  return (
    <section className="py-6">
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <RotateCcw className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-headline tracking-tight">
              Order Again
            </h2>
            <p className="text-xs text-muted-foreground">
              Your past favorite dishes ready for 1-tap reorder
            </p>
          </div>
        </div>
      </div>

      <Carousel
        opts={{
          align: 'start',
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {repeatItems.map(({ item, lastOrderedVendor }) => {
            const vendor = vendors.find((v) => v.username === item.vendorUsername);
            const shopStatus = vendor ? VendorStatusManager.getShopStatus(vendor) : null;
            const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
            const isEffectivelyInStock = isItemInStock(item, vendor?.isInventory);
            const isEffectivelyAvailable = isEffectivelyInStock && isShopOpen;

            const itemCartEntries = cartItems.filter((ci) => ci.id === item.id);
            const totalQty = itemCartEntries.reduce((sum, ci) => sum + ci.quantity, 0);
            const hasCustomizations = item.customizations && item.customizations.length > 0;

            const price =
              item.isDiscountActive && item.discountPrice
                ? item.discountPrice
                : item.price;

            return (
              <CarouselItem
                key={item.id}
                className="basis-[78%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 pl-3"
              >
                <div className={cn(
                  "group relative bg-card rounded-2xl border border-border/60 hover:border-primary/40 shadow-xs hover:shadow-md transition-all duration-300 p-3 pb-3.5 flex items-center gap-3.5",
                  !isEffectivelyAvailable && "opacity-70 grayscale-[25%]"
                )}>
                  {/* Dish Thumbnail & Overlaid Add Button / Stepper */}
                  <div className="relative shrink-0 flex flex-col items-center">
                    <div className="relative w-[72px] h-[72px] rounded-xl overflow-hidden bg-muted">
                      <Image
                        src={item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        fill
                        sizes="72px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {/* Veg/Non-Veg indicator */}
                      <div className="absolute top-1 left-1 bg-white/90 dark:bg-zinc-900/90 rounded p-0.5 shadow-xs z-10">
                        <span
                          className={`block w-1.5 h-1.5 rounded-full ${
                            item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                          }`}
                        />
                      </div>
                      {/* Closed / Out of Stock Overlay on Thumbnail */}
                      {!isEffectivelyAvailable && (
                        <div className="absolute inset-0 bg-background/85 backdrop-blur-[1px] flex items-center justify-center p-1 z-10">
                          <span className="text-foreground font-bold text-[9px] text-center leading-tight">
                            {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Out of Stock'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Overlapping Add Button / Stepper (Swiggy / Zomato Style Pill) */}
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 z-20">
                      {totalQty > 0 && !hasCustomizations && isEffectivelyAvailable && vendor ? (
                        <div className="flex items-center bg-primary text-primary-foreground rounded-full h-6 px-1 shadow-xs border border-primary">
                          <button
                            onClick={(e) => handleQuantityChange(e, item, vendor, -1)}
                            className="w-5 h-full flex items-center justify-center hover:bg-black/10 rounded-full transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-2.5 w-2.5" />
                          </button>
                          <span className="text-[11px] font-extrabold w-4 text-center">
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
                            "h-6 px-3 text-[11px] font-bold rounded-full shadow-xs transition-all whitespace-nowrap bg-background border border-primary/40 text-primary hover:bg-primary hover:text-white",
                            !isEffectivelyAvailable
                              ? "opacity-60 cursor-not-allowed text-muted-foreground border-border/40 bg-muted"
                              : totalQty > 0
                              ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
                              : ""
                          )}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (isEffectivelyAvailable && vendor) {
                              handleAddClick(item, vendor);
                            }
                          }}
                        >
                          {hasCustomizations && totalQty > 0 ? (
                            <span className="text-[10px]">{totalQty} in cart</span>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-0.5" /> ADD
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Dish Info (Full width text container) */}
                  <div className="flex-1 min-w-0 py-0.5">
                    <p className="text-[11px] font-medium text-muted-foreground truncate mb-0.5">
                      {lastOrderedVendor}
                    </p>
                    <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-baseline gap-1.5 mt-1">
                      <span className="font-extrabold text-xs sm:text-sm text-foreground">
                        ₹{price.toFixed(0)}
                      </span>
                      {item.isDiscountActive && item.discountPrice && (
                        <span className="text-[10px] text-muted-foreground line-through">
                          ₹{item.price.toFixed(0)}
                        </span>
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

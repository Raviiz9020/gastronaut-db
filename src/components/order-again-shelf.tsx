'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RotateCcw, Plus, ShoppingBag, Check } from 'lucide-react';
import { useCustomer } from '@/context/customer-context';
import { useOrder } from '@/context/order-context';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { isItemInStock } from '@/lib/vendorStatusManager';
import SelfPickupDialog from '@/components/self-pickup-dialog';
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
  const { addToCart, cartItems } = useCart();
  const { toast } = useToast();

  const [selfPickupState, setSelfPickupState] = useState<{
    open: boolean;
    item: MenuItemType | null;
    vendor: Vendor | null;
  }>({
    open: false,
    item: null,
    vendor: null,
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
          // Ensure item is currently in stock
          if (vendor && isItemInStock(matchingMenuItem, vendor.isInventory)) {
            const key = matchingMenuItem.id;
            const existing = itemMap.get(key);
            if (existing) {
              existing.orderCount += 1;
            } else {
              itemMap.set(key, {
                item: matchingMenuItem,
                orderCount: 1,
                lastOrderedVendor:
                  (order as any).vendorName ||
                  vendor.shopName ||
                  matchingMenuItem.shopName ||
                  matchingMenuItem.vendorUsername,
              });
            }
          }
        }
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => b.orderCount - a.orderCount);
  }, [customer, orders, menuItems, vendors]);

  const handleQuickAdd = (e: React.MouseEvent, item: MenuItemType) => {
    e.preventDefault();
    e.stopPropagation();

    const vendor = vendors.find((v) => v.username === item.vendorUsername);
    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    const isFirstItemFromThisVendor = cartItems.every(
      (ci) => ci.vendorUsername !== item.vendorUsername
    );
    const isCartEmpty = cartItems.length === 0;

    if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
      setSelfPickupState({
        open: true,
        item,
        vendor: vendor || null,
      });
    } else {
      addToCart(item, {}, 1);
      toast({
        title: 'Added to Cart! 🛒',
        description: `${item.name} added to your cart.`,
      });
    }
  };

  const handleSelfPickupChoice = (choice: 'delivery' | 'pickup') => {
    const { item } = selfPickupState;
    if (item) {
      const forceSelfPickup = choice === 'pickup';
      addToCart(item, {}, 1, forceSelfPickup);
      toast({
        title: 'Added to Cart! 🛒',
        description: `${item.name} added to your cart.`,
      });
    }
    setSelfPickupState({
      open: false,
      item: null,
      vendor: null,
    });
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
            const inCart = cartItems.some((ci) => ci.id === item.id);
            const price =
              item.isDiscountActive && item.discountPrice
                ? item.discountPrice
                : item.price;

            return (
              <CarouselItem
                key={item.id}
                className="basis-[75%] sm:basis-1/2 md:basis-1/3 lg:basis-1/4 pl-3"
              >
                <div className="group relative bg-card rounded-2xl border border-border/60 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-300 p-3 flex items-center gap-3">
                  {/* Dish Thumbnail */}
                  <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                    <Image
                      src={item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=80'}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-1 left-1 bg-white/90 dark:bg-zinc-900/90 rounded p-0.5 shadow-xs">
                      <span
                        className={`block w-1.5 h-1.5 rounded-full ${
                          item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Dish Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-muted-foreground truncate">
                      {lastOrderedVendor}
                    </p>
                    <h3 className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="font-extrabold text-xs text-foreground mt-0.5">
                      ₹{price.toFixed(0)}
                    </p>
                  </div>

                  {/* Add Action Button */}
                  <Button
                    size="sm"
                    variant={inCart ? 'default' : 'outline'}
                    className={`h-7 px-3 text-xs font-bold rounded-full transition-all shrink-0 ${
                      inCart
                        ? 'bg-primary text-primary-foreground'
                        : 'text-primary border-primary/30 hover:bg-primary hover:text-white'
                    }`}
                    onClick={(e) => handleQuickAdd(e, item)}
                  >
                    {inCart ? (
                      <>
                        <Check className="h-3 w-3 mr-1" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" /> Add
                      </>
                    )}
                  </Button>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

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

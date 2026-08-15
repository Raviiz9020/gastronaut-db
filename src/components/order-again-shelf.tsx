'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RotateCcw, Plus, ShoppingBag, Check } from 'lucide-react';
import { useCustomer } from '@/context/customer-context';
import { useOrder } from '@/context/order-context';
import { useMenu } from '@/context/menu-context';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import type { MenuItem as MenuItemType, CartItem } from '@/types';

export default function OrderAgainShelf() {
  const { customer } = useCustomer();
  const { orders, loadUserOrders } = useOrder();
  const { menuItems, fetchAllItems } = useMenu();
  const { addToCart, cartItems } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (customer?.contact || customer?.username) {
      const userIdentifier = customer.contact || customer.username;
      const unsubscribe = loadUserOrders(userIdentifier, 'customer');
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, [customer, loadUserOrders]);

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  // Compute unique previously ordered dishes that are still available on the platform
  const repeatItems = useMemo(() => {
    if (!customer || !orders || orders.length === 0) return [];

    const deliveredOrders = orders.filter(
      (o) => o.status === 'Delivered' || o.status === 'Accepted'
    );

    if (deliveredOrders.length === 0) return [];

    // Map of unique item IDs / names to their details
    const itemMap = new Map<
      string,
      {
        item: MenuItemType;
        orderCount: number;
        lastOrderedVendor: string;
      }
    >();

    deliveredOrders.forEach((order) => {
      if (!order.items) return;
      order.items.forEach((orderItem: any) => {
        const matchingMenuItem = menuItems.find(
          (m) =>
            m.id === orderItem.menuItemId ||
            m.id === orderItem.id ||
            m.name.toLowerCase() === orderItem.name?.toLowerCase()
        );

        if (matchingMenuItem && matchingMenuItem.isAvailable) {
          const key = matchingMenuItem.id;
          const existing = itemMap.get(key);
          if (existing) {
            existing.orderCount += 1;
          } else {
            itemMap.set(key, {
              item: matchingMenuItem,
              orderCount: 1,
              lastOrderedVendor: (order as any).vendorName || matchingMenuItem.shopName || matchingMenuItem.vendorUsername,
            });
          }
        }
      });
    });

    return Array.from(itemMap.values()).sort((a, b) => b.orderCount - a.orderCount);
  }, [customer, orders, menuItems]);

  const handleQuickAdd = (e: React.MouseEvent, item: MenuItemType) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(item, {}, 1);
    toast({
      title: 'Added to Cart! 🛒',
      description: `${item.name} from ${item.shopName} added.`,
    });
  };

  // If user is not logged in or has no delivered past orders, hide section
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
                className="basis-2/3 sm:basis-1/2 md:basis-1/3 lg:basis-1/4 pl-3"
              >
                <div className="group relative bg-card rounded-2xl border border-border/60 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col p-3">
                  <div className="flex gap-3">
                    {/* Dish Image */}
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                      <Image
                        src={item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=80'}
                        alt={item.name}
                        fill
                        sizes="80px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                        blurDataURL={item.blurDataUrl}
                      />
                    </div>

                    {/* Dish Details */}
                    <div className="flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.isVeg ? 'bg-emerald-500' : 'bg-red-500'
                            }`}
                          />
                          <span className="text-[11px] text-muted-foreground truncate font-medium">
                            {lastOrderedVendor}
                          </span>
                        </div>
                        <h3 className="font-bold text-sm text-foreground line-clamp-1 leading-snug">
                          {item.name}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-border/40">
                        <span className="font-bold text-sm text-foreground">
                          ₹{price.toFixed(0)}
                        </span>
                        <Button
                          size="sm"
                          variant={inCart ? 'secondary' : 'outline'}
                          className={`h-7 px-3.5 text-xs font-semibold rounded-full ${
                            inCart
                              ? 'bg-primary/10 text-primary border-primary/20'
                              : 'hover:bg-primary hover:text-white border-primary/40 text-primary'
                          }`}
                          onClick={(e) => handleQuickAdd(e, item)}
                        >
                          {inCart ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </section>
  );
}

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Header from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Tag,
  Flame,
  Search,
  Store,
  ChevronRight,
  Star,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  X
} from 'lucide-react';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import { useLocation } from '@/context/location-context';
import { isVendorServiceable, calculateDistanceInKm } from '@/lib/location-utils';
import type { MenuItem, Vendor } from '@/types';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import OrderCustomizationSheet from '@/components/order-customization-sheet';
import SelfPickupDialog from '@/components/self-pickup-dialog';
import FloatingCartBar from '@/components/floating-cart-bar';
import { cn } from '@/lib/utils';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';

interface PopularPickItemCardProps {
  item: MenuItem;
  vendor?: Vendor | null;
  onCustomize: (item: MenuItem) => void;
  onAddToCart: (item: MenuItem) => void;
}

const PopularPickItemCard = ({
  item,
  vendor,
  onCustomize,
  onAddToCart,
}: PopularPickItemCardProps) => {
  const { cartItems, updateCartItemQuantity } = useCart();

  const isCustomizable = !!(item.customizations && item.customizations.length > 0);
  const hasMandatoryCustomization = item.customizations?.some((c) => Number(c.minSelect) > 0) ?? false;
  const hasDiscount = !!(item.isDiscountActive && item.discountPrice && item.discountPrice > 0);

  const startingPrice = useMemo(() => {
    if (!isCustomizable) {
      return hasDiscount ? item.discountPrice! : item.price;
    }

    const basePrice = hasMandatoryCustomization ? 0 : (hasDiscount ? item.discountPrice! : item.price);

    let mandatoryCustomizationsPrice = 0;
    item.customizations?.forEach((c) => {
      if (Number(c.minSelect) > 0) {
        const groupMinOptionPrice = Math.min(
          ...c.options.map((o) => (item.isDiscountActive ? o.price : (o.originalPrice || o.price)))
        );
        if (groupMinOptionPrice !== Infinity) {
          mandatoryCustomizationsPrice += groupMinOptionPrice;
        }
      }
    });

    const calculatedPrice = basePrice + mandatoryCustomizationsPrice;

    if (calculatedPrice === 0) {
      let minOptPrice = Infinity;
      item.customizations?.forEach((group) => {
        group.options.forEach((o) => {
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

  const discountPercentage = useMemo(() => {
    if (!item.isDiscountActive) return 0;

    let maxPct = 0;
    if (item.discountPrice && item.discountPrice > 0 && item.price > 0) {
      maxPct = Math.round(((item.price - item.discountPrice) / item.price) * 100);
    }

    item.customizations?.forEach((c) => {
      c.options.forEach((o) => {
        if (o.originalPrice && o.originalPrice > o.price) {
          const pct = Math.round(((o.originalPrice - o.price) / o.originalPrice) * 100);
          if (pct > maxPct) maxPct = pct;
        }
      });
    });

    return maxPct;
  }, [item]);

  const simpleCartItem = cartItems.find((i) => i.id === item.id && Object.keys(i.customizationDetails || {}).length === 0);
  const simpleQuantityInCart = simpleCartItem ? simpleCartItem.quantity : 0;

  const handleQuantityChange = (change: number) => {
    if (!simpleCartItem) return;
    const newQuantity = simpleCartItem.quantity + change;
    updateCartItemQuantity(simpleCartItem.cartItemId, newQuantity);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isCustomizable) {
      onCustomize(item);
    } else {
      onAddToCart(item);
    }
  };

  const getItemUrl = (item: MenuItem) => {
    const vendorIdentifier = vendor?.slug || item.vendorUsername;
    return `/menu?vendor=${vendorIdentifier}&item=${item.id}`;
  };

  const isEffectivelyInStock = isItemInStock(item, vendor?.isInventory);
  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
  const isEffectivelyAvailable = item.isAvailable && isShopOpen && isEffectivelyInStock;

  return (
    <div className="w-40 sm:w-44 shrink-0 snap-start">
      <Link href={getItemUrl(item)} passHref>
        <Card className={cn(
          "flex flex-col overflow-hidden rounded-2xl border border-border/60 hover:border-primary/40 bg-card shadow-xs hover:shadow-md transition-all duration-300 h-full group relative",
          !isEffectivelyAvailable && "opacity-60 grayscale-[30%]"
        )}>
          {/* Dish Image Container (4:3 aspect ratio) */}
          <div className="aspect-[4/3] relative w-full overflow-hidden bg-muted">
            <Image
              src={item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&auto=format&fit=crop&q=80'}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 160px, 176px"
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              placeholder={item.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={item.blurDataUrl}
            />

            {/* Veg / Non-Veg Indicator */}
            <div className="absolute top-2 left-2 z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-md p-0.5 shadow-xs flex items-center justify-center">
              <span className={cn(
                "w-2 h-2 rounded-full",
                item.isVeg ? "bg-emerald-500" : "bg-red-500"
              )} />
            </div>

            {/* Discount Badge */}
            {discountPercentage > 0 && isEffectivelyAvailable && (
              <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-[9px] font-bold flex items-center justify-center shadow-xs">
                <Tag className="h-2.5 w-2.5 mr-0.5" />
                <span>{discountPercentage}% OFF</span>
              </div>
            )}

            {/* Closed / Out of Stock Overlay */}
            {!isEffectivelyAvailable && (
              <div className="absolute inset-0 bg-background/85 backdrop-blur-[1px] flex items-center justify-center p-2 z-20">
                <span className="text-foreground font-bold text-[10px] text-center px-2 py-0.5 rounded-full bg-muted border border-border shadow-xs">
                  {!isShopOpen ? (shopStatus?.msg || 'Closed') : (!isEffectivelyInStock ? 'Out of Stock' : 'Unavailable')}
                </span>
              </div>
            )}
          </div>

          {/* Dish Details */}
          <CardContent className="p-2.5 flex-1 flex flex-col justify-between">
            <div>
              <h3
                className="font-bold text-[11px] sm:text-xs text-foreground line-clamp-2 leading-tight min-h-[2.4em] group-hover:text-primary transition-colors"
                title={item.name}
              >
                {item.name}
              </h3>
              {!isCustomizable && item.stock !== undefined && item.stock > 0 && (vendor?.category === 'Bakery' || item.stock <= 5) && (
                <p className="text-[9px] text-destructive font-semibold mt-0.5">
                  {item.stock} available
                </p>
              )}
            </div>

            {/* Price & Action Row */}
            <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/40">
              <div className="flex items-baseline gap-1">
                {isCustomizable && (
                  <span className="text-[9px] text-muted-foreground font-normal">From</span>
                )}
                <span className="font-bold text-xs sm:text-sm text-foreground">
                  ₹{startingPrice.toFixed(0)}
                </span>
                {hasDiscount && item.price > (item.discountPrice || 0) && (
                  <span className="text-[9px] text-muted-foreground line-through">
                    ₹{item.price.toFixed(0)}
                  </span>
                )}
              </div>

              {simpleQuantityInCart > 0 && !isCustomizable ? (
                <div className="flex items-center bg-primary text-primary-foreground rounded-full h-6 px-1 shadow-xs">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleQuantityChange(-1);
                    }}
                    className="w-4 h-full flex items-center justify-center hover:bg-black/10 rounded-full transition-colors"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-2 w-2" />
                  </button>
                  <span className="font-bold text-[10px] w-3.5 text-center">
                    {simpleQuantityInCart}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleQuantityChange(1);
                    }}
                    className="w-4 h-full flex items-center justify-center hover:bg-black/10 rounded-full transition-colors"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-2 w-2" />
                  </button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={handleAddClick}
                  className="h-6 text-[11px] px-3 font-bold rounded-full shadow-xs transition-all hover:scale-105"
                  disabled={!isEffectivelyAvailable}
                >
                  Add
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};

export default function PopularPicksPage() {
  const { menuItems, isFetchingItems } = useMenu();
  const { vendors } = useVendor();
  const { userLocation } = useLocation();
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const { addToCart, cartItems, totalItems } = useCart();
  const { toast } = useToast();

  // Search and Dietary Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');

  const [selfPickupState, setSelfPickupState] = useState<{
    open: boolean;
    item: MenuItem | null;
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

  // Approved & Serviceable Vendors sorted by proximity
  const approvedVendors = useMemo(() => {
    if (!vendors) return [];
    let list = vendors.filter((v) => v.isApproved);

    if (userLocation) {
      list = list.filter((v) => isVendorServiceable(v, userLocation));

      list.sort((a, b) => {
        if (a.latitude === undefined || a.longitude === undefined || b.latitude === undefined || b.longitude === undefined) return 0;
        const distA = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
        const distB = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    return list;
  }, [vendors, userLocation]);

  // Filtered popular picks based on location, availability, and active user filters
  const popularPicks = useMemo(() => {
    const approvedVendorUsernames = new Set(approvedVendors.map((v) => v.username));
    let items = menuItems.filter(
      (item) =>
        item.isPopular &&
        item.isAvailable &&
        approvedVendorUsernames.has(item.vendorUsername) &&
        isItemInStock(item, vendors.find((v) => v.username === item.vendorUsername)?.isInventory)
    );

    if (dietaryFilter === 'veg') {
      items = items.filter((item) => item.isVeg);
    } else if (dietaryFilter === 'non-veg') {
      items = items.filter((item) => !item.isVeg);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      items = items.filter((item) => {
        const vendor = approvedVendors.find((v) => v.username === item.vendorUsername);
        return (
          item.name.toLowerCase().includes(q) ||
          item.description?.toLowerCase().includes(q) ||
          vendor?.shopName?.toLowerCase().includes(q)
        );
      });
    }

    return items;
  }, [menuItems, approvedVendors, vendors, dietaryFilter, searchQuery]);

  // Group popular picks by vendor preserving distance order
  const popularPicksByVendor = useMemo(() => {
    const grouped: { vendor: Vendor; items: MenuItem[] }[] = [];

    approvedVendors.forEach((vendor) => {
      const items = popularPicks.filter((item) => item.vendorUsername === vendor.username);
      if (items.length > 0) {
        grouped.push({ vendor, items });
      }
    });

    return grouped;
  }, [popularPicks, approvedVendors]);

  const handleCustomize = useCallback((item: MenuItem) => {
    setSelectedItem(item);
  }, []);

  const handleCloseCustomization = useCallback((open: boolean) => {
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleAddToCartWithDeliveryCheck = (
    item: MenuItem,
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

  if (isFetchingItems) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className={cn(
        "flex flex-col min-h-screen bg-background text-foreground transition-[padding] duration-300",
        totalItems > 0 ? "pb-28 lg:pb-0" : ""
      )}>
        <Header />

        <main className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
          {/* Top Bar Navigation & Hero Title */}
          <div className="mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider">
                <Flame className="h-3.5 w-3.5 fill-orange-500" />
                Community Favorites
              </span>

              <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs font-semibold gap-1.5 border-border/80 hover:border-primary/50">
                <Link href="/">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Home
                </Link>
              </Button>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-headline text-foreground tracking-tight">
              Popular Picks Near You
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
              Most loved dishes and signature delicacies from top-rated kitchens delivering to your address.
            </p>
          </div>

          {/* Search & Dietary Filter Control Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/60 shadow-xs mb-8">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search favorite dishes, kitchens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs sm:text-sm rounded-xl border-border/50 bg-background/60 focus-visible:bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Dietary Filter Segmented Control */}
            <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setDietaryFilter('all')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  dietaryFilter === 'all'
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                All Picks
              </button>
              <button
                onClick={() => setDietaryFilter('veg')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  dietaryFilter === 'veg'
                    ? "bg-background text-emerald-600 shadow-xs dark:text-emerald-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Veg
              </button>
              <button
                onClick={() => setDietaryFilter('non-veg')}
                className={cn(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5",
                  dietaryFilter === 'non-veg'
                    ? "bg-background text-red-600 shadow-xs dark:text-red-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Non-Veg
              </button>
            </div>
          </div>

          {/* Popular Picks by Vendor Showcase */}
          {popularPicksByVendor.length > 0 ? (
            <div className="space-y-6 sm:space-y-7">
              {popularPicksByVendor.map(({ vendor, items }) => {
                const shopStatus = VendorStatusManager.getShopStatus(vendor);
                if (shopStatus.status !== VendorStatus.OPEN) return null;

                const distance = userLocation && vendor.latitude && vendor.longitude
                  ? calculateDistanceInKm(userLocation.latitude, userLocation.longitude, vendor.latitude, vendor.longitude)
                  : null;

                const vendorIdentifier = vendor.slug || vendor.username;

                return (
                  <section key={vendor.username} className="space-y-2.5">
                    {/* Compact Vendor Header Bar */}
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 hover:border-primary/30 shadow-xs transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-sm sm:text-base font-bold font-headline text-foreground">
                              {vendor.shopName}
                            </h2>
                            {vendor.category && (
                              <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                {vendor.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-medium">
                            {vendor.totalRatingSum && vendor.ratingCount && vendor.ratingCount > 0 ? (
                              <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                <Star className="h-3 w-3 fill-amber-400" />
                                {(vendor.totalRatingSum / vendor.ratingCount).toFixed(1)}
                              </span>
                            ) : null}
                            {distance !== null && (
                              <span className="flex items-center gap-0.5 text-muted-foreground">
                                <MapPin className="h-2.5 w-2.5" />
                                {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)} km`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* View Menu Action */}
                      <Button asChild variant="ghost" size="sm" className="rounded-full h-7 px-2.5 text-[11px] font-semibold text-primary hover:text-primary gap-0.5 group">
                        <Link href={`/menu?vendor=${vendorIdentifier}`}>
                          View Menu
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                      </Button>
                    </div>

                    {/* Smooth Horizontal Carousel of Dish Cards */}
                    <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-1 -mx-1 px-1">
                      <div className="flex items-stretch gap-2.5 sm:gap-3 w-max">
                        {items.map((item) => (
                          <PopularPickItemCard
                            key={item.id}
                            item={item}
                            vendor={vendor}
                            onCustomize={handleCustomize}
                            onAddToCart={(item) => handleAddToCartWithDeliveryCheck(item, vendor, {}, 1)}
                          />
                        ))}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 px-4 rounded-3xl bg-card border border-border/60 shadow-xs max-w-md mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mx-auto text-muted-foreground mb-3">
                <UtensilsCrossed className="h-7 w-7" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                {searchQuery || dietaryFilter !== 'all' ? 'No matching popular dishes' : 'No Popular Picks Available'}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchQuery || dietaryFilter !== 'all'
                  ? 'Try changing your search keywords or dietary filters.'
                  : (userLocation ? 'No active kitchens in your delivery area have marked popular items today.' : 'Check back later for top-rated dishes in your area!')}
              </p>
              {(searchQuery || dietaryFilter !== 'all') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setDietaryFilter('all');
                  }}
                  className="mt-4 rounded-full text-xs font-semibold"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          )}
        </main>

        {/* Customization Drawer Sheet */}
        {selectedItem && (
          <OrderCustomizationSheet
            item={selectedItem}
            vendor={vendors.find((v) => v.username === selectedItem.vendorUsername) || null}
            open={!!selectedItem}
            onOpenChange={handleCloseCustomization}
            onAdd={(item, selectedOptions, quantity) => {
              const vendor = vendors.find((v) => v.username === item.vendorUsername);
              if (vendor) {
                handleAddToCartWithDeliveryCheck(item, vendor, selectedOptions, quantity);
              }
            }}
          />
        )}
      </div>

      {/* Floating Cart Bar */}
      <FloatingCartBar />

      {/* Self-Pickup Modal */}
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
    </>
  );
}

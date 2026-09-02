'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { MenuItem as MenuItemType, SpecialMenu, SpecialMenuType, Vendor } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/header';
import { useCart } from '@/context/cart-context';
import {
  Star,
  Loader2,
  Minus,
  Plus,
  Tag,
  Sparkles,
  ArrowLeft,
  Search,
  Store,
  ChevronRight,
  MapPin,
  UtensilsCrossed,
  X,
  Sun,
  Sunrise,
  Sunset,
  Moon
} from 'lucide-react';
import { useSpecialMenu } from '@/context/special-menu-context';
import { useVendor } from '@/context/vendor-context';
import { useLocation } from '@/context/location-context';
import { useToast } from '@/hooks/use-toast';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { isVendorServiceable, calculateDistanceInKm } from '@/lib/location-utils';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';
import { cn } from '@/lib/utils';
import OrderCustomizationSheet from '@/components/order-customization-sheet';
import SelfPickupDialog from '@/components/self-pickup-dialog';
import FloatingCartBar from '@/components/floating-cart-bar';

const specialMenuTypes: { type: SpecialMenuType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'Breakfast', label: 'Breakfast', icon: Sunrise },
  { type: 'Lunch', label: 'Lunch', icon: Sun },
  { type: 'Evening Snacks', label: 'Snacks', icon: Sunset },
  { type: 'Dinner', label: 'Dinner', icon: Moon },
];

const ZoomedImageOverlay = ({
  item,
  onClose,
}: {
  item: { layoutId: string; image: string; name: string } | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (item) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [item, onClose]);

  if (!item) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-80 h-80 sm:w-96 sm:h-96"
        onClick={(e) => e.stopPropagation()}
      >
        <motion.div
          className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl"
          layoutId={item.layoutId}
        >
          <Image src={item.image || ''} alt={item.name} fill className="object-cover" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

interface MenuItemCardProps {
  item: MenuItemType;
  averageRating: number;
  ratingCount: number;
  vendor?: Vendor;
  onCustomize: () => void;
  onAddToCart: (item: MenuItemType) => void;
  onImageClick: (item: MenuItemType, layoutId: string) => void;
}

const MenuItemCard = ({
  item,
  averageRating,
  ratingCount,
  vendor,
  onCustomize,
  onAddToCart,
  onImageClick,
}: MenuItemCardProps) => {
  const { cartItems, updateCartItemQuantity } = useCart();
  const layoutId = `image-${item.id}`;

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
      onCustomize();
    } else {
      onAddToCart(item);
    }
  };

  const getItemUrl = (item: MenuItemType) => {
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

            {/* Rating Pill if available */}
            {ratingCount > 0 && isEffectivelyAvailable && (
              <div className="absolute bottom-2 left-2 z-10 bg-black/75 backdrop-blur-md text-amber-400 rounded-md px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-0.5 shadow-xs">
                <Star className="h-2.5 w-2.5 fill-amber-400" />
                <span>{averageRating.toFixed(1)}</span>
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

function SpecialsPageContent() {
  const { specialMenus, fetchAllSpecialMenus } = useSpecialMenu();
  const { vendors, fetchAllVendors } = useVendor();
  const { userLocation } = useLocation();
  const { addToCart, cartItems, totalItems } = useCart();
  const { toast } = useToast();

  const [menuItems, setMenuItems] = useState<MenuItemType[]>([]);
  const [isFetchingItems, setIsFetchingItems] = useState(true);
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const [zoomedItem, setZoomedItem] = useState<{
    layoutId: string;
    image: string;
    name: string;
  } | null>(null);

  // Search and Dietary Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'veg' | 'non-veg'>('all');

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

  const searchParams = useSearchParams();
  const specialTypeParam = searchParams.get('type') as SpecialMenuType | null;
  const vendorIdentifier = searchParams.get('vendor') as string | null;

  const [currentTab, setCurrentTab] = useState<SpecialMenuType>(specialTypeParam || 'Breakfast');

  useEffect(() => {
    fetchAllSpecialMenus();
    fetchAllVendors();
  }, [fetchAllSpecialMenus, fetchAllVendors]);

  useEffect(() => {
    if (specialTypeParam && specialMenuTypes.some((s) => s.type === specialTypeParam)) {
      setCurrentTab(specialTypeParam);
    }
  }, [specialTypeParam]);

  // Real-time listener for menu items associated with active specials
  useEffect(() => {
    const activeSpecials = specialMenus.filter((s) => s.isActive);
    const allItemIds = Array.from(new Set(activeSpecials.flatMap((s) => s.itemIds)));

    if (allItemIds.length === 0) {
      setMenuItems([]);
      setIsFetchingItems(false);
      return () => {};
    }

    setIsFetchingItems(true);
    const itemBatches: string[][] = [];
    for (let i = 0; i < allItemIds.length; i += 30) {
      itemBatches.push(allItemIds.slice(i, i + 30));
    }

    const unsubscribers = itemBatches.map((batch) => {
      if (batch.length === 0) return () => {};
      const q = query(collection(db, 'menuItems'), where('__name__', 'in', batch));
      return onSnapshot(
        q,
        (snapshot) => {
          const fetchedItems = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MenuItemType));
          setMenuItems((prevItems) => {
            const itemMap = new Map(prevItems.map((item) => [item.id, item]));
            fetchedItems.forEach((item) => itemMap.set(item.id, item));
            return Array.from(itemMap.values());
          });
          setIsFetchingItems(false);
        },
        (error) => {
          console.error('Error fetching menu items for specials:', error);
          setIsFetchingItems(false);
        }
      );
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [specialMenus]);

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

  // Filter specials to show based on selected meal tab, serviceable vendors, dietary choice and search
  const specialsToShow = useMemo(() => {
    const approvedVendorUsernames = new Set(approvedVendors.map((v) => v.username));
    const specialsToFilter = specialMenus.filter((special) => special.type === currentTab && special.isActive);

    const specialsWithItemsAndVendor = specialsToFilter
      .map((special) => {
        const specialVendor = approvedVendors.find((v) => v.username === special.vendorUsername);
        if (!specialVendor) return null;

        let items = special.itemIds
          .map((id) => menuItems.find((item) => item.id === id))
          .filter((item): item is MenuItemType => !!item && isItemInStock(item, specialVendor.isInventory));

        if (dietaryFilter === 'veg') {
          items = items.filter((item) => item.isVeg);
        } else if (dietaryFilter === 'non-veg') {
          items = items.filter((item) => !item.isVeg);
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          items = items.filter((item) =>
            item.name.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            specialVendor.shopName?.toLowerCase().includes(q)
          );
        }

        return { ...special, items, vendor: specialVendor };
      })
      .filter((s): s is (SpecialMenu & { items: MenuItemType[]; vendor: Vendor }) => {
        if (!s || !s.items.length || !s.vendor || !s.vendor.isApproved) return false;
        const shopStatus = VendorStatusManager.getShopStatus(s.vendor);
        return shopStatus.status !== VendorStatus.CLOSED_TEMP;
      });

    // Prioritize the vendor from the URL if specified
    if (vendorIdentifier) {
      specialsWithItemsAndVendor.sort((a, b) => {
        const aIsPrioritized = a.vendor.slug === vendorIdentifier || a.vendor.username === vendorIdentifier;
        const bIsPrioritized = b.vendor.slug === vendorIdentifier || b.vendor.username === vendorIdentifier;
        if (aIsPrioritized && !bIsPrioritized) return -1;
        if (!aIsPrioritized && bIsPrioritized) return 1;
        return 0;
      });
    }

    return specialsWithItemsAndVendor;
  }, [specialMenus, menuItems, approvedVendors, currentTab, vendorIdentifier, dietaryFilter, searchQuery]);

  const handleOpenCustomization = useCallback((item: MenuItemType) => {
    setSelectedItem(item);
  }, []);

  const handleCloseCustomization = useCallback((open: boolean) => {
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleImageClick = (item: MenuItemType, layoutId: string) => {
    setZoomedItem({ layoutId, image: item.image, name: item.name });
  };

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

  return (
    <div className={cn(
      "flex flex-col min-h-screen bg-background text-foreground transition-[padding] duration-300",
      totalItems > 0 ? "pb-28 lg:pb-0" : ""
    )}>
      <Header />

      <AnimatePresence>
        {zoomedItem && (
          <ZoomedImageOverlay item={zoomedItem} onClose={() => setZoomedItem(null)} />
        )}
      </AnimatePresence>

      <main className="container mx-auto px-4 py-6 sm:py-8 max-w-6xl">
        {/* Top Bar Navigation & Hero Title */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
              <Sparkles className="h-3.5 w-3.5 fill-primary" />
              Daily Curated Menus
            </span>

            <Button asChild variant="outline" size="sm" className="rounded-full h-8 text-xs font-semibold gap-1.5 border-border/80 hover:border-primary/50">
              <Link href="/menu">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to All Menu
              </Link>
            </Button>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-headline text-foreground tracking-tight">
            Today's Specials
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
            Fresh chef specials crafted for today from verified kitchens delivering to your address.
          </p>
        </div>

        {/* Meal Segmented Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 mb-4">
          {specialMenuTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              onClick={() => setCurrentTab(type)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all shrink-0 border",
                currentTab === type
                  ? "bg-primary text-primary-foreground border-primary shadow-xs scale-105"
                  : "bg-card text-muted-foreground border-border/60 hover:border-primary/40 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Search & Dietary Filter Control Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-card border border-border/60 shadow-xs mb-8">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={`Search ${currentTab.toLowerCase()} specials, kitchens...`}
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
              All Specials
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

        {/* Specials Content Area */}
        {isFetchingItems ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : specialsToShow.length > 0 ? (
          <div className="space-y-6 sm:space-y-7">
            {specialsToShow.map((special) => {
              const distance = userLocation && special.vendor.latitude && special.vendor.longitude
                ? calculateDistanceInKm(userLocation.latitude, userLocation.longitude, special.vendor.latitude, special.vendor.longitude)
                : null;

              const vendorIdentifier = special.vendor.slug || special.vendor.username;

              return (
                <section key={special.id} className="space-y-2.5">
                  {/* Compact Vendor Header Bar */}
                  <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-card border border-border/60 hover:border-primary/30 shadow-xs transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                        <Store className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-sm sm:text-base font-bold font-headline text-foreground">
                            {special.vendor.shopName}
                          </h2>
                          {special.vendor.category && (
                            <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                              {special.vendor.category}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground font-medium">
                          {special.vendor.totalRatingSum && special.vendor.ratingCount && special.vendor.ratingCount > 0 ? (
                            <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                              <Star className="h-3 w-3 fill-amber-400" />
                              {(special.vendor.totalRatingSum / special.vendor.ratingCount).toFixed(1)}
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

                  {/* Horizontal Scrollable Shelf of Special Dishes */}
                  <div className="w-full overflow-x-auto hide-scrollbar scroll-smooth pb-1 -mx-1 px-1">
                    <div className="flex items-stretch gap-2.5 sm:gap-3 w-max">
                      {special.items.map((item) => (
                        <MenuItemCard
                          key={item.id}
                          item={item}
                          averageRating={item.totalRatingSum && item.ratingCount ? item.totalRatingSum / item.ratingCount : 0}
                          ratingCount={item.ratingCount || 0}
                          vendor={special.vendor}
                          onCustomize={() => handleOpenCustomization(item)}
                          onAddToCart={(item) => handleAddToCartWithDeliveryCheck(item, special.vendor, {}, 1)}
                          onImageClick={handleImageClick}
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
              {searchQuery || dietaryFilter !== 'all'
                ? `No matching ${currentTab.toLowerCase()} specials`
                : `No ${currentTab} Specials Available`}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery || dietaryFilter !== 'all'
                ? 'Try changing your search query or dietary filters.'
                : (userLocation ? `No kitchens in your serviceable area have posted ${currentTab.toLowerCase()} specials today.` : 'Check back later or explore other meal categories!')}
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
    </div>
  );
}

export default function SpecialsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <SpecialsPageContent />
    </Suspense>
  );
}

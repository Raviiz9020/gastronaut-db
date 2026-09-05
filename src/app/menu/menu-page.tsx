'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { MenuItem as MenuItemType, Category, Order, Vendor, SearchResult, Offer, SpecialMenuType, SpecialMenu } from '@/types';
import { VendorStatus } from '@/types';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Image from 'next/image';
import OrderCustomizationSheet from '@/components/order-customization-sheet';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/header';
import { useMenu } from '@/context/menu-context';
import { useSpecialMenu } from '@/context/special-menu-context';
import { useOrder } from '@/context/order-context';
import { useCart } from '@/context/cart-context';
import { Star, Building, ShoppingCart, Loader2, Minus, Plus, Utensils, X, Sparkles, Gift, Search, Hand, Tag, ArrowLeft, Fingerprint, Leaf, Bike, Beef, ChevronDown, ChevronLeft, ChevronRight, Flame, Percent, UtensilsCrossed } from 'lucide-react';
import { useVendor } from '@/context/vendor-context';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useOffer } from '@/context/offer-context';
import MultiOfferSplashDialog from '@/components/multi-offer-splash-dialog';
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Link from 'next/link';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useSearchParams, useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import FloatingCartBar from '@/components/floating-cart-bar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLocation } from '@/context/location-context';
import { isVendorServiceable, calculateDistanceInKm } from '@/lib/location-utils';


const PortionSelectDialog = ({
  items,
  open,
  onOpenChange,
  vendor,
  onConfirm
}: {
  items: MenuItemType[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor?: Vendor;
  onConfirm: (item: MenuItemType, quantity: number) => void;
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open && items && items.length > 0) {
      const defaultItem = items.find(item => item.isAvailable) || items[0];
      setSelectedItemId(defaultItem.id);
      setQuantity(1);
    }
  }, [open, items]);

  if (!items || items.length === 0) return null;

  const primaryItem = items[0];
  const baseName = primaryItem.name.replace(/\s+(full|half)$/i, '').trim();

  const handleConfirmClick = () => {
    const selectedItem = items.find(item => item.id === selectedItemId);
    if (!selectedItem) {
      // This should ideally not happen if an item is pre-selected
      return;
    }
    onConfirm(selectedItem, quantity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{baseName}</DialogTitle>
          <DialogDescription>Select your desired portion size.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedItemId} onValueChange={setSelectedItemId} className="space-y-2">
            {items.map(item => {
              const variation = item.name.match(/\s+(full|half)$/i)?.[1] || 'Portion';
              const price = (item.isDiscountActive && item.discountPrice) ? item.discountPrice : item.price;
              return (
                <Label
                  key={item.id}
                  htmlFor={item.id}
                  className={cn(
                    "flex items-center justify-between rounded-full border p-3 cursor-pointer transition-colors",
                    selectedItemId === item.id && "border-primary bg-primary/5",
                    !item.isAvailable && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="font-semibold">{variation.charAt(0).toUpperCase() + variation.slice(1)}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm">₹{price.toFixed(2)}</span>
                    <RadioGroupItem value={item.id} id={item.id} disabled={!item.isAvailable} />
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
        <DialogFooter className="sm:justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-bold text-lg w-10 text-center">{quantity}</span>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => q + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleConfirmClick} disabled={!selectedItemId}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


const ZoomedImageOverlay = ({ item, onClose }: { item: { id: string; image: string; name: string } | null, onClose: () => void }) => {
  useEffect(() => {
    if (item) {
      const timer = setTimeout(() => {
        onClose();
      }, 1500); // 1.5 seconds
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
          className="relative w-full h-full rounded-full overflow-hidden shadow-2xl"
          layoutId={`image-${item.id}`}
        >
          <Image
            src={item.image || ''}
            alt={item.name}
            layout="fill"
            objectFit="cover"
            unoptimized={typeof item.image === 'string' && item.image.startsWith('data:')}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export const getItemStartingPrice = (item: MenuItemType): number => {
  const isCustomizable = item.customizations && item.customizations.length > 0;
  const hasMandatoryOptions = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;
  const hasDiscount = !!(item.isDiscountActive && item.discountPrice && item.discountPrice > 0);

  if (!isCustomizable) {
    return hasDiscount ? item.discountPrice! : (item.price || 0);
  }

  const basePrice = hasMandatoryOptions ? 0 : (hasDiscount ? item.discountPrice! : (item.price || 0));

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

  let calculatedPrice = basePrice + mandatoryCustomizationsPrice;

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
      calculatedPrice = minOptPrice;
    }
  }

  if (calculatedPrice === 0 && item.price > 0) {
    calculatedPrice = item.price;
  }

  return calculatedPrice;
};

const PopularPickItemCard = ({
  item,
  vendor,
  onAddToCart,
  onCustomise,
}: {
  item: MenuItemType;
  vendor?: Vendor | null;
  onAddToCart: (item: MenuItemType) => void;
  onCustomise: (item: MenuItemType) => void;
}) => {
  const { cartItems, updateCartItemQuantity } = useCart();
  const simpleCartItem = cartItems.find(i => i.id === item.id && Object.keys(i.customizationDetails).length === 0);
  const simpleQuantity = simpleCartItem ? simpleCartItem.quantity : 0;
  const totalQuantity = cartItems.filter(i => i.id === item.id).reduce((sum, i) => sum + i.quantity, 0);

  const hasDiscount = !!(item.isDiscountActive && item.discountPrice && item.discountPrice > 0);
  const isCustomizable = item.customizations && item.customizations.length > 0;
  const hasMandatoryVariants = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;

  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
  const isEffectivelyInStock = isItemInStock(item, vendor?.isInventory);
  const isItemEffectivelyAvailable = isEffectivelyInStock && isShopOpen;
  const isOutOfStock = !isEffectivelyInStock;

  const handleSimpleQuantityChange = (e: React.MouseEvent, change: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isItemEffectivelyAvailable) return;
    if (!simpleCartItem && change > 0) {
      onAddToCart(item);
    } else if (simpleCartItem) {
      updateCartItemQuantity(simpleCartItem.cartItemId, simpleCartItem.quantity + change);
    }
  };

  const startingPrice = useMemo(() => {
    return getItemStartingPrice(item);
  }, [item]);

  const handleAction = (
    e: React.MouseEvent,
    item: MenuItemType
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isItemEffectivelyAvailable) return;
    if (isCustomizable) {
      onCustomise(item);
    } else {
      onAddToCart(item);
    }
  };

  const getItemUrl = (item: MenuItemType) => {
    const vendorIdentifier = vendor?.slug || item.vendorUsername;
    return `/menu?vendor=${vendorIdentifier}&item=${item.id}`;
  };

  return (
    <div className="h-full select-none">
      <Link href={getItemUrl(item)} passHref>
        <Card className={cn(
          "rounded-2xl overflow-hidden group h-full flex flex-col text-left bg-card/70 hover:bg-card border border-border/50 shadow-xs hover:shadow-md transition-all duration-200",
          !isItemEffectivelyAvailable && "opacity-65 grayscale-[25%]"
        )}>
          <CardContent className="p-1.5 flex flex-col flex-1">
            {/* Image Container */}
            <div className="w-full aspect-[4/3] relative rounded-xl overflow-hidden bg-muted">
              <Image
                src={item.image}
                alt={item.name}
                fill
                data-ai-hint={item.aiHint}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                blurDataURL={item.blurDataUrl}
                unoptimized={typeof item.image === 'string' && item.image.startsWith('data:')}
              />

              {/* Smart Discount Badge */}
              {(() => {
                let maxPct = 0;
                if (item.isDiscountActive && item.discountPrice && item.price > 0) {
                  maxPct = Math.round(((item.price - item.discountPrice) / item.price) * 100);
                }
                if (item.isDiscountActive) {
                  item.customizations?.forEach(c => {
                    c.options.forEach(o => {
                      if (o.originalPrice && o.originalPrice > o.price) {
                        const pct = Math.round(((o.originalPrice - o.price) / o.originalPrice) * 100);
                        if (pct > maxPct) maxPct = pct;
                      }
                    });
                  });
                }
                if (maxPct > 0 && isItemEffectivelyAvailable) {
                  return (
                    <div className="absolute top-1 left-1 z-10 bg-destructive text-white text-[8px] font-bold px-1 py-0.5 rounded-md shadow flex items-center gap-0.5">
                      <Tag className="h-2 w-2 fill-current" />
                      {maxPct}%
                    </div>
                  );
                }
                return null;
              })()}

              {/* Shop Closed / Out of Stock Overlay */}
              {!isItemEffectivelyAvailable && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] flex items-center justify-center z-20 p-1">
                  <span className="text-foreground font-bold text-[9px] text-center px-1.5 py-0.5 rounded-full bg-muted/95 border border-border shadow-xs">
                    {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Sold Out'}
                  </span>
                </div>
              )}
            </div>

            {/* Content Details */}
            <div className="pt-1.5 px-0.5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-[11px] leading-snug line-clamp-2 h-7 text-foreground" title={item.name}>
                  {item.name}
                </h3>
                {vendor && (
                  <p className="text-[9px] text-muted-foreground truncate leading-tight mt-0.5">
                    {vendor.shopName}
                  </p>
                )}
              </div>

              {/* Price & Action Row */}
              <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-border/30">
                <div className="font-bold text-[11px] text-foreground">
                  {hasDiscount && !isCustomizable ? (
                    <span className="flex items-baseline gap-1">
                      <span className="text-red-600 dark:text-red-400">
                        ₹{item.discountPrice?.toFixed(0)}
                      </span>
                      <span className="text-[9px] text-muted-foreground line-through font-normal">
                        ₹{item.price.toFixed(0)}
                      </span>
                    </span>
                  ) : (
                    <span>₹{startingPrice.toFixed(0)}</span>
                  )}
                </div>

                <div className="flex items-center">
                  {!isCustomizable ? (
                    simpleQuantity > 0 && isItemEffectivelyAvailable ? (
                      <div className="flex items-center gap-0.5 bg-primary/10 rounded-full px-1 py-0.5">
                        <button className="h-4 w-4 rounded-full flex items-center justify-center text-primary hover:bg-primary/20 transition-colors" onClick={(e) => handleSimpleQuantityChange(e, -1)}>
                          <Minus className="h-2.5 w-2.5" />
                        </button>
                        <span className="font-bold text-[10px] text-primary px-0.5">{simpleQuantity}</span>
                        <button className="h-4 w-4 rounded-full flex items-center justify-center text-primary hover:bg-primary/20 transition-colors" onClick={(e) => handleSimpleQuantityChange(e, 1)}>
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        className="h-5 w-5 rounded-full shadow-xs text-primary-foreground bg-primary hover:bg-primary/90"
                        onClick={(e) => handleAction(e, item)}
                        disabled={!isItemEffectivelyAvailable}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    )
                  ) : (
                    totalQuantity > 0 && isItemEffectivelyAvailable ? (
                      <div className="flex items-center gap-0.5 bg-purple-500/10 rounded-full px-1.5 py-0.5">
                        <span className="font-bold text-[10px] text-purple-600 dark:text-purple-400">{totalQuantity}</span>
                        <button
                          className="h-4 w-4 rounded-full flex items-center justify-center text-purple-600 hover:bg-purple-500/20 ml-0.5"
                          onClick={(e) => handleAction(e, item)}
                        >
                          <Plus className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ) : (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-5 w-5 rounded-full border-primary/40 text-primary hover:bg-primary hover:text-white"
                        onClick={(e) => handleAction(e, item)}
                        disabled={!isItemEffectivelyAvailable}
                      >
                        <ChevronDown className="h-2.5 w-2.5" />
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
};


const MenuItemCard = ({
  item,
  averageRating,
  ratingCount,
  vendor,
  onAdd,
  onCustomize,
  onImageClick,
}: {
  item: MenuItemType;
  averageRating: number;
  ratingCount: number;
  vendor?: Vendor;
  onAdd: (item: MenuItemType) => void;
  onCustomize: (item: MenuItemType) => void;
  onImageClick: (item: { id: string, image: string, name: string }) => void;
}) => {
  const { getCartItemCount, updateCartItemQuantity, cartItems } = useCart();

  const simpleCartItem = cartItems.find(i => i.id === item.id && Object.keys(i.customizationDetails).length === 0);
  const quantityInCart = simpleCartItem ? simpleCartItem.quantity : 0;
  const totalQuantityInCart = cartItems.filter(i => i.id === item.id).reduce((sum, i) => sum + i.quantity, 0);

  const handleSimpleQuantityChange = (change: number) => {
    if (!simpleCartItem) return;
    const newQuantity = simpleCartItem.quantity + change;
    updateCartItemQuantity(simpleCartItem.cartItemId, newQuantity);
  };

  const handleAddClick = () => {
    if (item.customizations && item.customizations.length > 0) {
      onCustomize(item);
    } else {
      onAdd(item);
    }
  }

  const imageToDisplay = item.imageDataUrl || item.image;
  const showImage = imageToDisplay && !imageToDisplay.includes('placehold.co');
  const hasMandatoryVariants = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;

  const isEffectivelyInStock = isItemInStock(item, vendor?.isInventory);

  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
  const isItemEffectivelyAvailable = isEffectivelyInStock && isShopOpen;
  const hasDiscount = !!(item.isDiscountActive && item.discountPrice && item.discountPrice > 0);
  const discountPercentage = useMemo(() => {
    if (!item.isDiscountActive) return 0;

    let maxPct = 0;
    if (item.discountPrice && item.discountPrice > 0 && item.price > 0) {
      maxPct = Math.round(((item.price - item.discountPrice!) / item.price) * 100);
    }

    // Also check customizations for higher discounts
    item.customizations?.forEach(c => {
      c.options.forEach(o => {
        if (o.originalPrice && o.originalPrice > o.price) {
          const pct = Math.round(((o.originalPrice - o.price) / o.originalPrice) * 100);
          if (pct > maxPct) maxPct = pct;
        }
      });
    });

    return maxPct;
  }, [item]);

  const isCustomizable = item.customizations && item.customizations.length > 0;
  const hasMandatoryOptions = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;

  const startingPrice = useMemo(() => {
    return getItemStartingPrice(item);
  }, [item]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className={cn(
        "w-full h-full flex flex-col overflow-hidden border-border/60 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl bg-card relative group",
        !isItemEffectivelyAvailable && "border-border/40 bg-card/60 shadow-none hover:border-border/40"
      )}>
        <CardContent className="p-4 sm:p-5 relative flex-1 flex flex-col">
          <div className="flex flex-row items-stretch justify-between gap-4 flex-1">
            {/* Left side: Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className={cn(
                    "w-4 h-4 border rounded-[4px] p-[2px] flex items-center justify-center flex-shrink-0",
                    item.isVeg ? "border-green-600" : "border-red-600"
                  )} title={item.isVeg ? "Veg" : "Non-Veg"}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      item.isVeg ? "bg-green-600" : "bg-red-600"
                    )} />
                  </span>
                  {discountPercentage > 0 && isItemEffectivelyAvailable && (
                    <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full px-2 py-0.5 text-[9px] font-extrabold shadow-sm flex items-center gap-0.5">
                      <Tag className="h-2.5 w-2.5 fill-current" />
                      {discountPercentage}% OFF
                    </span>
                  )}
                  {item.isPopular && isItemEffectivelyAvailable && (
                    <span className="text-[10px] font-extrabold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5 fill-amber-500" /> Bestseller
                    </span>
                  )}
                  {!isItemEffectivelyAvailable && (
                    <span className="text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                      {!isShopOpen ? (shopStatus?.msg || 'Shop Closed') : 'Out of Stock'}
                    </span>
                  )}
                </div>

                <h3 className={cn(
                  "font-headline text-base sm:text-lg font-bold leading-snug transition-colors",
                  isItemEffectivelyAvailable ? "text-foreground group-hover:text-primary" : "text-foreground/80"
                )}>
                  {item.name}
                </h3>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md font-medium" title={`Vendor: ${vendor?.shopName}`}>
                    <Building className="h-3 w-3 text-amber-500" />
                    {item.shopName || 'Unknown Vendor'}
                  </span>
                  {ratingCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {averageRating.toFixed(1)} <span className="text-[9px] text-muted-foreground font-normal">({ratingCount})</span>
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground text-xs sm:text-sm mt-2 line-clamp-2 leading-relaxed">{item.description}</p>

                {isItemEffectivelyAvailable && typeof item.stock === 'number' && item.stock > 0 && !isCustomizable && (vendor?.isInventory || vendor?.category === 'Bakery' || item.stock <= 5) && (
                  <p className={cn(
                    "text-[11px] font-semibold mt-1",
                    item.stock <= 5 ? "text-destructive" : "text-amber-600"
                  )}>
                    Only {item.stock} left!
                  </p>
                )}
              </div>

              <div className="mt-3 pt-2">
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    "text-base sm:text-lg font-extrabold",
                    isItemEffectivelyAvailable ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {isCustomizable && <span className="text-[10px] text-muted-foreground font-normal block -mb-1">From</span>}
                    ₹{startingPrice.toFixed(0)}
                  </span>
                  {hasDiscount && !isCustomizable && isItemEffectivelyAvailable && (
                    <span className="text-xs text-muted-foreground line-through">₹{item.price.toFixed(0)}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Image + Floating ADD Pill */}
            <div className="w-28 sm:w-32 flex-shrink-0 flex flex-col items-center justify-start relative self-center pb-3">
              {showImage ? (
                <motion.div
                  layoutId={`image-${item.id}`}
                  className="w-28 h-28 sm:w-32 sm:h-32 relative rounded-2xl overflow-hidden cursor-pointer border border-border/50 shadow-sm"
                  onClick={() => onImageClick({ id: item.id, image: imageToDisplay, name: item.name })}
                >
                  {typeof imageToDisplay === 'string' && imageToDisplay.startsWith('data:') ? (
                    <img
                      src={imageToDisplay}
                      alt={item.name}
                      data-ai-hint={item.aiHint}
                      className={cn(
                        "w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110",
                        !isItemEffectivelyAvailable && "grayscale-[35%] opacity-85"
                      )}
                    />
                  ) : (
                    <Image
                      src={imageToDisplay}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 128px, 160px"
                      data-ai-hint={item.aiHint}
                      className={cn(
                        "object-cover transition-transform duration-500 ease-in-out group-hover:scale-110",
                        !isItemEffectivelyAvailable && "grayscale-[35%] opacity-85"
                      )}
                      placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                      blurDataURL={item.blurDataUrl}
                    />
                  )}
                  {!isItemEffectivelyAvailable && (
                    <div className="absolute inset-0 bg-black/35 backdrop-blur-[1px] flex items-center justify-center p-1">
                      <span className="text-[10px] font-bold text-white bg-black/70 px-2 py-0.5 rounded-md uppercase tracking-wider text-center shadow-xs">
                        {!isShopOpen ? 'Closed' : 'Sold Out'}
                      </span>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center text-muted-foreground relative">
                  <Utensils className="h-8 w-8 opacity-40" />
                  {!isItemEffectivelyAvailable && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center p-1 rounded-2xl">
                      <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-md uppercase tracking-wider text-center">
                        {!isShopOpen ? 'Closed' : 'Sold Out'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Overlapping ADD Pill Button */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
                {!isItemEffectivelyAvailable ? (
                  <div className="h-7 px-2.5 rounded-xl border border-border bg-muted text-muted-foreground font-bold text-[10px] uppercase tracking-wider shadow-xs flex items-center justify-center whitespace-nowrap cursor-not-allowed">
                    Out of Stock
                  </div>
                ) : !isCustomizable ? (
                  quantityInCart > 0 ? (
                    <div className="flex items-center gap-1 bg-background border-2 border-primary rounded-xl px-1.5 py-0.5 shadow-md">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg text-primary hover:bg-primary/10" onClick={() => handleSimpleQuantityChange(-1)} disabled={!isItemEffectivelyAvailable}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-extrabold w-5 text-center text-xs text-primary">{quantityInCart}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-lg text-primary hover:bg-primary/10" onClick={() => handleSimpleQuantityChange(1)} disabled={!isItemEffectivelyAvailable}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleAddClick}
                      variant="outline"
                      size="sm"
                      className="h-8 px-4 rounded-xl border-2 border-primary text-primary font-extrabold text-xs bg-background hover:bg-primary hover:text-primary-foreground shadow-md transition-all uppercase tracking-wider"
                      disabled={!isItemEffectivelyAvailable}
                    >
                      ADD
                    </Button>
                  )
                ) : (
                  totalQuantityInCart > 0 ? (
                    <div className="flex items-center gap-1 bg-background border-2 border-primary rounded-xl px-2 py-0.5 shadow-md">
                      <span className="font-extrabold text-xs text-primary">{totalQuantityInCart}</span>
                      <Button onClick={handleAddClick} variant="ghost" size="icon" className="h-6 w-6 rounded-lg text-primary hover:bg-primary/10" disabled={!isItemEffectivelyAvailable}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleAddClick}
                      variant="outline"
                      size="sm"
                      className="h-8 px-3 rounded-xl border-2 border-primary text-primary font-extrabold text-xs bg-background hover:bg-primary hover:text-primary-foreground shadow-md transition-all uppercase tracking-wider flex items-center gap-0.5"
                      disabled={!isItemEffectivelyAvailable}
                    >
                      ADD <ChevronDown className="h-3 w-3" />
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>

  )
};

const CombinedMenuItemCard = ({
  items,
  averageRating,
  ratingCount,
  vendor,
  onAddClick,
  onImageClick
}: {
  items: MenuItemType[];
  averageRating: number;
  ratingCount: number;
  vendor?: Vendor;
  onAddClick: (items: MenuItemType[]) => void;
  onImageClick: (item: { id: string, image: string, name: string }) => void;
}) => {
  const primaryItem = items[0];
  const baseName = primaryItem.name.replace(/\s+(full|half)$/i, '').trim();
  const imageToDisplay = primaryItem.imageDataUrl || primaryItem.image;
  const showImage = imageToDisplay && !imageToDisplay.includes('placehold.co');
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="h-full"
    >
      <Card className={cn(
        "w-full h-full flex flex-col overflow-hidden border-border/60 hover:border-primary/40 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl bg-card relative group",
        !isEffectivelyAvailable && "bg-muted/40 border-muted-foreground/10 hover:border-muted-foreground/10 shadow-none"
      )}>
        <CardContent className="p-4 sm:p-5 relative flex-1 flex flex-col">
          {!isEffectivelyAvailable && (
            <div className="absolute inset-0 bg-background/85 backdrop-blur-[2px] flex items-center justify-center z-20 rounded-3xl">
              <span className="text-foreground font-bold text-sm text-center px-4 py-1.5 rounded-full bg-muted border border-border shadow-sm">
                {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Out of Stock'}
              </span>
            </div>
          )}
          <div className={cn("flex flex-row items-stretch justify-between gap-4 flex-1", !isEffectivelyAvailable && "filter grayscale opacity-50")}>
            {/* Left side: Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap mb-1">
                  <span className={cn(
                    "w-4 h-4 border rounded-[4px] p-[2px] flex items-center justify-center flex-shrink-0",
                    primaryItem.isVeg ? "border-green-600" : "border-red-600"
                  )} title={primaryItem.isVeg ? "Veg" : "Non-Veg"}>
                    <span className={cn(
                      "w-2 h-2 rounded-full",
                      primaryItem.isVeg ? "bg-green-600" : "bg-red-600"
                    )} />
                  </span>
                  {(() => {
                    let maxPct = 0;
                    items.forEach(item => {
                      if (item.isDiscountActive) {
                        if (item.discountPrice && item.price > 0) {
                          const pct = Math.round(((item.price - item.discountPrice) / item.price) * 100);
                          if (pct > maxPct) maxPct = pct;
                        }
                        item.customizations?.forEach(c => {
                          c.options.forEach(o => {
                            if (o.originalPrice && o.originalPrice > o.price) {
                              const pct = Math.round(((o.originalPrice - o.price) / o.originalPrice) * 100);
                              if (pct > maxPct) maxPct = pct;
                            }
                          });
                        });
                      }
                    });
                    if (maxPct > 0) {
                      return (
                        <span className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-full px-2 py-0.5 text-[9px] font-extrabold shadow-sm flex items-center gap-0.5">
                          <Tag className="h-2.5 w-2.5 fill-current" />
                          {maxPct}% OFF
                        </span>
                      );
                    }
                    return null;
                  })()}
                  {primaryItem.isPopular && (
                    <span className="text-[10px] font-extrabold text-amber-600 bg-amber-500/15 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <Sparkles className="h-2.5 w-2.5 fill-amber-500" /> Bestseller
                    </span>
                  )}
                </div>

                <h3 className="font-headline text-base sm:text-lg font-bold leading-snug text-foreground group-hover:text-primary transition-colors">{baseName}</h3>

                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md font-medium" title={`Vendor: ${vendor?.shopName}`}>
                    <Building className="h-3 w-3 text-amber-500" />
                    {primaryItem.shopName || 'Unknown Vendor'}
                  </span>
                  {ratingCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {averageRating.toFixed(1)} <span className="text-[9px] text-muted-foreground font-normal">({ratingCount})</span>
                    </span>
                  )}
                </div>

                <p className="text-muted-foreground text-xs sm:text-sm mt-2 line-clamp-2 leading-relaxed">{primaryItem.description}</p>
                <div className="text-[11px] text-destructive font-semibold mt-1">
                  {typeof halfStock === 'number' && halfStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || halfStock <= 5) && <span>Only {halfStock} half left. </span>}
                  {typeof fullStock === 'number' && fullStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || fullStock <= 5) && <span>Only {fullStock} full left.</span>}
                </div>
              </div>
              <div className="mt-3 pt-2">
                <p className="text-sm font-extrabold text-foreground">
                  {halfPrice !== null && `Half: ₹${halfPrice.toFixed(0)}`}
                  {halfPrice !== null && fullPrice !== null && ' / '}
                  {fullPrice !== null && `Full: ₹${fullPrice.toFixed(0)}`}
                </p>
              </div>
            </div>

            {/* Right side: Image + Floating ADD Pill */}
            <div className="w-28 sm:w-32 flex-shrink-0 flex flex-col items-center justify-start relative self-center pb-3">
              {showImage ? (
                <motion.div
                  layoutId={`image-${primaryItem.id}`}
                  className="w-28 h-28 sm:w-32 sm:h-32 relative rounded-2xl overflow-hidden cursor-pointer border border-border/50 shadow-sm"
                  onClick={() => onImageClick({ id: primaryItem.id, image: imageToDisplay, name: baseName })}
                >
                  {typeof imageToDisplay === 'string' && imageToDisplay.startsWith('data:') ? (
                    <img
                      src={imageToDisplay}
                      alt={baseName}
                      data-ai-hint={primaryItem.aiHint}
                      className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                    />
                  ) : (
                    <Image
                      src={imageToDisplay}
                      alt={baseName}
                      fill
                      sizes="(max-width: 768px) 128px, 160px"
                      data-ai-hint={primaryItem.aiHint}
                      className="object-cover transition-transform duration-500 ease-in-out group-hover:scale-110"
                      placeholder={primaryItem.blurDataUrl ? 'blur' : 'empty'}
                      blurDataURL={primaryItem.blurDataUrl}
                    />
                  )}
                </motion.div>
              ) : (
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center text-muted-foreground">
                  <Utensils className="h-8 w-8 opacity-40" />
                </div>
              )}

              {/* Overlapping ADD Pill Button */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 z-10">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-4 rounded-xl border-2 border-primary text-primary font-extrabold text-xs bg-background hover:bg-primary hover:text-primary-foreground shadow-md transition-all uppercase tracking-wider flex items-center gap-0.5"
                  disabled={!isEffectivelyAvailable}
                  onClick={() => onAddClick(items)}
                >
                  ADD <ChevronDown className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};


export default function MenuPageContent() {
  const [selectedItem, setSelectedItem] = useState<MenuItemType | null>(null);
  const { menuItems, fetchAllItems, isFetchingItems, globalCategories } = useMenu();
  const { specialMenus, fetchAllSpecialMenus } = useSpecialMenu();
  const { orders } = useOrder();
  const { userLocation } = useLocation();

  const { vendors, fetchAllVendors } = useVendor();
  const [selectedVendor, setSelectedVendor] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const [filterMode, setFilterMode] = useState<'all' | 'veg' | 'non-veg'>('all');

  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const { toast } = useToast();

  const { offers, fetchAllOffers } = useOffer();
  const { cartItems, addToCart, totalItems } = useCart();
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [isOfferOpen, setIsOfferOpen] = useState(false);

  const [selfPickupDialogState, setSelfPickupDialogState] = useState<{ open: boolean; item?: MenuItemType | null; items?: MenuItemType[] | null; selectedOptions: Record<string, string | string[]>; quantity: number; }>({ open: false, item: null, items: null, selectedOptions: {}, quantity: 1 });


  const [zoomedItem, setZoomedItem] = useState<{ id: string, image: string, name: string } | null>(null);
  const handleImageClick = (item: { id: string, image: string, name: string }) => {
    setZoomedItem(item);
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const vendorParam = searchParams.get('vendor');
  const itemParam = searchParams.get('item');
  const maxPriceParam = searchParams.get('maxPrice');
  const vendorCategoryParam = searchParams.get('vendorCategory');
  const searchParam = searchParams.get('search');
  const vegOnlyParam = searchParams.get('vegOnly');
  const fastDeliveryParam = searchParams.get('fastDelivery');
  const minRatingParam = searchParams.get('minRating');
  const offersOnlyParam = searchParams.get('offersOnly');

  const [portionSelectItems, setPortionSelectItems] = useState<MenuItemType[] | null>(null);
  const [deliveryChoiceForPortionSelect, setDeliveryChoiceForPortionSelect] = useState<'yes' | 'no' | null>(null);

  // Sync URL search and veg filter parameters to local state
  useEffect(() => {
    if (searchParam) {
      setItemSearchQuery(searchParam);
    }
    if (vegOnlyParam === 'true') {
      setFilterMode('veg');
    }
  }, [searchParam, vegOnlyParam]);

  const vendorForDialog = useMemo(() => {
    const item = selfPickupDialogState.item || selfPickupDialogState.items?.[0];
    if (!item) return null;
    return vendors.find(v => v.username === item.vendorUsername);
  }, [selfPickupDialogState, vendors]);

  const isFilterActive = useMemo(() => {
    return (
      selectedVendor !== 'all' ||
      !!categoryParam ||
      itemSearchQuery.length > 0 ||
      !!searchParam ||
      !!maxPriceParam ||
      !!vendorCategoryParam ||
      !!itemParam ||
      vegOnlyParam === 'true' ||
      fastDeliveryParam === 'true' ||
      !!minRatingParam ||
      offersOnlyParam === 'true' ||
      filterMode !== 'all'
    );
  }, [
    selectedVendor,
    categoryParam,
    itemSearchQuery,
    searchParam,
    maxPriceParam,
    vendorCategoryParam,
    itemParam,
    vegOnlyParam,
    fastDeliveryParam,
    minRatingParam,
    offersOnlyParam,
    filterMode,
  ]);

  const getItemUrl = (item: MenuItemType) => {
    const vendor = vendors.find(v => v.username === item.vendorUsername);
    const vendorIdentifier = vendor?.slug || item.vendorUsername;
    return `/menu?vendor=${vendorIdentifier}&item=${item.id}`;
  };

  useEffect(() => {
    fetchAllItems();
    fetchAllVendors();
    fetchAllOffers();
    fetchAllSpecialMenus();
  }, [fetchAllItems, fetchAllVendors, fetchAllOffers, fetchAllSpecialMenus]);

  useEffect(() => {
    setActiveTab('all');

    if (itemParam) {
      setSelectedVendor('all');
    } else if (vendorParam) {
      const vendor = vendors.find(v => v.slug === vendorParam || v.username === vendorParam);
      if (vendor) {
        setSelectedVendor(vendor.username);
      } else if (vendors.length > 0) { // Wait for vendors to load
        setSelectedVendor('all');
      }
    } else {
      setSelectedVendor('all');
    }
  }, [vendorParam, categoryParam, itemParam, vendors]);

  const handleAddToCartWithDialogCheck = (item: MenuItemType, selectedOptions: Record<string, string | string[]> = {}, quantity = 1, forceSelfPickup?: boolean) => {
    if (forceSelfPickup !== undefined) {
      addToCart(item, selectedOptions, quantity, forceSelfPickup);
      return;
    }

    const vendor = vendors.find(v => v.username === item.vendorUsername);
    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    const isFirstItemFromThisVendor = cartItems.every(cartItem => cartItem.vendorUsername !== item.vendorUsername);
    const isCartEmpty = cartItems.length === 0;

    if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
      setSelfPickupDialogState({ open: true, item, selectedOptions, quantity, items: null });
    } else {
      addToCart(item, selectedOptions, quantity);
    }
  };

  const handleSelfPickupDialogClose = (decision: 'yes' | 'no' | 'cancel') => {
    const { item, items, selectedOptions, quantity } = selfPickupDialogState;
    if (decision !== 'cancel') {
      const forceSelfPickup = decision === 'yes';
      if (item) {
        addToCart(item, selectedOptions, quantity, forceSelfPickup);
      } else if (items) {
        setDeliveryChoiceForPortionSelect(decision);
        setPortionSelectItems(items);
      }
    }
    setSelfPickupDialogState({ open: false, item: null, items: null, selectedOptions: {}, quantity: 1 });
  };

  const { vendorRatings } = useMemo(() => {
    const vendorRatingsMap = new Map<string, { sum: number, count: number }>();
    orders.forEach(order => {
      if (order.status === 'Delivered' && order.vendorRating !== undefined) {
        const current = vendorRatingsMap.get(order.vendorUsername) || { sum: 0, count: 0 };
        vendorRatingsMap.set(order.vendorUsername, {
          sum: current.sum + order.vendorRating,
          count: current.count + 1,
        });
      }
    });
    return { vendorRatings: vendorRatingsMap };
  }, [orders]);

  const getAverageVendorRating = (vendorUsername: string) => {
    const rating = vendorRatings.get(vendorUsername);
    if (!rating || rating.count === 0) return { average: 0, count: 0 };
    return { average: rating.sum / rating.count, count: rating.count };
  };

  const popularVendors = useMemo(() => {
    const approved = vendors.filter(v => v.isApproved && v.shopName);
    if (approved.length === 0) return [];

    let extendedList: Vendor[] = [];
    while (extendedList.length < 10) {
      extendedList = extendedList.concat(approved);
    }
    return extendedList;
  }, [vendors]);

  const getVendorUrl = (vendor: Vendor) => {
    const identifier = vendor.slug || vendor.username;
    return `/menu?vendor=${identifier}`;
  }


  useEffect(() => {
    const currentActiveOffers = offers.filter(o => o.isActive);
    setActiveOffers(currentActiveOffers);

    const isFilteredView = !!itemParam || !!categoryParam || !!vendorParam || !!vendorCategoryParam;

    if (currentActiveOffers.length > 0 && !sessionStorage.getItem('offerShown') && !isFilteredView) {
      setIsOfferOpen(true);
      sessionStorage.setItem('offerShown', 'true');
    }
  }, [offers, itemParam, categoryParam, vendorParam, vendorCategoryParam]);

  const approvedVendors = useMemo(() => {
    if (!vendors) return [];
    let list = vendors.filter(v => v.isApproved);

    if (userLocation) {
      list = list.filter(v => isVendorServiceable(v, userLocation));

      list.sort((a, b) => {
        if (a.latitude === undefined || a.longitude === undefined || b.latitude === undefined || b.longitude === undefined) return 0;
        const distA = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
        const distB = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
        return distA - distB;
      });
    }

    return list;
  }, [vendors, userLocation]);

  const vendorsToDisplay = useMemo(() => {
    let list = approvedVendors;

    if (vendorCategoryParam) {
      list = list.filter((v) => v.category === vendorCategoryParam);
    }

    if (minRatingParam) {
      const minRating = parseFloat(minRatingParam);
      if (!isNaN(minRating)) {
        list = list.filter((v) => {
          const ratingCount = v.ratingCount || 0;
          const totalRatingSum = v.totalRatingSum || 0;
          const avg = ratingCount > 0 ? totalRatingSum / ratingCount : 0;
          return avg >= minRating;
        });
      }
    }

    if (offersOnlyParam === 'true') {
      const vendorUsernamesWithDiscountedItems = new Set(
        menuItems
          .filter((item) => {
            if (!item.isAvailable || !item.isDiscountActive) return false;
            const flatDiscountPrice = Number(item.discountPrice);
            if (flatDiscountPrice > 0 && flatDiscountPrice < item.price) return true;
            const hasVariationDiscount = item.customizations?.some((c) =>
              c.options.some((o) => o.originalPrice && Number(o.originalPrice) > Number(o.price))
            );
            return !!hasVariationDiscount;
          })
          .map((item) => item.vendorUsername)
      );
      list = list.filter((v) => vendorUsernamesWithDiscountedItems.has(v.username));
    }

    if (fastDeliveryParam === 'true' && userLocation) {
      list = list.filter((v) => {
        if (v.latitude === undefined || v.longitude === undefined) return true;
        const dist = calculateDistanceInKm(
          userLocation.latitude,
          userLocation.longitude,
          v.latitude,
          v.longitude
        );
        return dist <= 3.5; // Within 3.5km for under-30m delivery
      });
    }

    return list;
  }, [
    approvedVendors,
    vendorCategoryParam,
    minRatingParam,
    offersOnlyParam,
    offers,
    menuItems,
    fastDeliveryParam,
    userLocation,
  ]);

  const menuItemsToDisplay = useMemo(() => {
    const approvedVendorUsernames = new Set(vendorsToDisplay.map(v => v.username));
    let baseItems = menuItems.filter(item => approvedVendorUsernames.has(item.vendorUsername));

    const lowercasedItemQuery = itemSearchQuery.toLowerCase();

    if (filterMode === 'veg') {
      baseItems = baseItems.filter(item => item.isVeg);
    } else if (filterMode === 'non-veg') {
      baseItems = baseItems.filter(item => !item.isVeg);
    }

    if (itemSearchQuery.length > 0) {
      baseItems = baseItems.filter(item =>
        item.name.toLowerCase().includes(lowercasedItemQuery) ||
        item.description?.toLowerCase().includes(lowercasedItemQuery)
      );
      if (selectedVendor !== 'all') {
        baseItems = baseItems.filter(item => item.vendorUsername === selectedVendor);
      }
    } else if (selectedVendor !== 'all') {
      baseItems = baseItems.filter(item => item.vendorUsername === selectedVendor);
    }

    if (categoryParam) {
      baseItems = baseItems.filter(item => item.category === categoryParam);
    } else if (activeTab !== 'all') {
      baseItems = baseItems.filter(item => item.category === activeTab);
    }

    if (itemParam) {
      baseItems = baseItems.filter(item => item.id === itemParam);
    }

    if (maxPriceParam) {
      const price = parseFloat(maxPriceParam);
      if (!isNaN(price)) {
        baseItems = baseItems.filter(item => {
          const itemPrice = getItemStartingPrice(item);
          return itemPrice <= price;
        });
      }
    }

    if (offersOnlyParam === 'true') {
      baseItems = baseItems.filter(item => {
        if (!item.isDiscountActive) return false;

        const flatDiscountPrice = Number(item.discountPrice);
        if (flatDiscountPrice > 0 && flatDiscountPrice < item.price) return true;

        const hasVariationDiscount = item.customizations?.some(c =>
          c.options.some(o => o.originalPrice && Number(o.originalPrice) > Number(o.price))
        );
        return !!hasVariationDiscount;
      });
    }

    if (!isFilterActive) {
      return [];
    }

    const vendorForItem = (item: MenuItemType) => vendorsToDisplay.find(v => v.username === item.vendorUsername);
    return baseItems.sort((a, b) => {
      const aInStock = isItemInStock(a, vendorForItem(a)?.isInventory);
      const bInStock = isItemInStock(b, vendorForItem(b)?.isInventory);
      if (aInStock && !bInStock) return -1;
      if (!aInStock && bInStock) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [menuItems, vendorsToDisplay, selectedVendor, activeTab, categoryParam, itemParam, itemSearchQuery, isFilterActive, maxPriceParam, filterMode, offersOnlyParam, offers]);

  const discountedItems = useMemo(() => {
    const approvedVendorUsernames = new Set(approvedVendors.map(v => v.username));

    let items = menuItems.filter(item => {
      if (!approvedVendorUsernames.has(item.vendorUsername)) return false;
      if (!item.isAvailable) return false;
      if (!item.isDiscountActive) return false;

      // Simple item: has a flat discount price
      const flatDiscountPrice = Number(item.discountPrice);
      if (flatDiscountPrice > 0) return true;

      // Customized item: at least one variation has originalPrice > price
      const hasVariationDiscount = item.customizations?.some(c =>
        c.options.some(o => o.originalPrice && Number(o.originalPrice) > Number(o.price))
      );
      return !!hasVariationDiscount;
    });

    if (filterMode === 'veg') {
      items = items.filter(item => item.isVeg);
    } else if (filterMode === 'non-veg') {
      items = items.filter(item => !item.isVeg);
    }

    // Sort: biggest saving first
    return items.sort((a, b) => {
      const savingA = Number(a.discountPrice) > 0 ? (a.price - Number(a.discountPrice)) : 0;
      const savingB = Number(b.discountPrice) > 0 ? (b.price - Number(b.discountPrice)) : 0;
      return savingB - savingA;
    });
  }, [menuItems, approvedVendors, filterMode]);

  const topRatedItems = useMemo(() => {
    const RATING_THRESHOLD = 4.0;
    const MIN_RATING_COUNT = 2;
    const MIN_PRICE_THRESHOLD = 80;

    const approvedVendorUsernames = new Set(approvedVendors.map(v => v.username));

    let items = menuItems.filter(item => {
      const ratingCount = item.ratingCount || 0;
      if (ratingCount < MIN_RATING_COUNT) return false;

      // Filter out low-ticket items like tea/coffee (price must be greater than ₹80)
      const effectivePrice = item.isDiscountActive && item.discountPrice && item.discountPrice > 0 ? item.discountPrice : item.price;
      if (effectivePrice <= MIN_PRICE_THRESHOLD) return false;

      const avgRating = item.totalRatingSum ? item.totalRatingSum / ratingCount : 0;
      return avgRating >= RATING_THRESHOLD &&
        item.isAvailable &&
        approvedVendorUsernames.has(item.vendorUsername);
    });

    if (filterMode === 'veg') {
      items = items.filter(item => item.isVeg);
    } else if (filterMode === 'non-veg') {
      items = items.filter(item => !item.isVeg);
    }

    return items.sort((a, b) => {
      const ratingA = (a.totalRatingSum || 0) / (a.ratingCount || 1);
      const ratingB = (b.totalRatingSum || 0) / (b.ratingCount || 1);
      if (ratingB !== ratingA) {
        return ratingB - ratingA;
      }
      return (b.ratingCount || 0) - (a.ratingCount || 0); // Tie-break by number of ratings
    });
  }, [menuItems, approvedVendors, filterMode]);

  const categoriesToShow = useMemo(() => {
    const approvedVendorUsernames = new Set(vendorsToDisplay.map(v => v.username));
    let itemsForCategories = menuItems.filter(item => approvedVendorUsernames.has(item.vendorUsername));

    if (filterMode === 'veg') {
      itemsForCategories = itemsForCategories.filter(item => item.isVeg);
    } else if (filterMode === 'non-veg') {
      itemsForCategories = itemsForCategories.filter(item => !item.isVeg);
    }

    if (selectedVendor !== 'all') {
      let itemsForVendor = itemsForCategories.filter(item => item.vendorUsername === selectedVendor);
      return Array.from(new Set(itemsForVendor.map(item => item.category)));
    }

    if (vendorCategoryParam) {
      return Array.from(new Set(itemsForCategories.map(item => item.category)));
    }

    if (maxPriceParam) {
      const price = parseFloat(maxPriceParam);
      if (!isNaN(price)) {
        const pricedItems = itemsForCategories.filter(item => {
          const itemPrice = getItemStartingPrice(item);
          return itemPrice <= price;
        });
        return Array.from(new Set(pricedItems.map(item => item.category)));
      }
    }

    return [];
  }, [menuItems, selectedVendor, vendorsToDisplay, vendorCategoryParam, filterMode, maxPriceParam]);

  const categoryItemCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const approvedVendorUsernames = new Set(vendorsToDisplay.map(v => v.username));
    let items = menuItems.filter(item => approvedVendorUsernames.has(item.vendorUsername));

    if (filterMode === 'veg') {
      items = items.filter(item => item.isVeg);
    } else if (filterMode === 'non-veg') {
      items = items.filter(item => !item.isVeg);
    }

    if (selectedVendor !== 'all') {
      items = items.filter(item => item.vendorUsername === selectedVendor);
    }

    items.forEach(item => {
      if (item.category) {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });
    return counts;
  }, [menuItems, vendorsToDisplay, filterMode, selectedVendor]);

  const totalCategoryItemsCount = useMemo(() => {
    return Object.values(categoryItemCounts).reduce((sum, count) => sum + count, 0);
  }, [categoryItemCounts]);

  const getCategoryThumbnail = useMemo(() => {
    const map = new Map<string, string>();
    // 1. Prefer globalCategories image
    globalCategories.forEach(cat => {
      if (cat.name && cat.imageUrl && typeof cat.imageUrl === 'string' && cat.imageUrl.length > 5) {
        map.set(cat.name.trim().toLowerCase(), cat.imageUrl);
      }
    });
    // 2. Fallback to dish image in that category
    menuItems.forEach(item => {
      if (item.category && item.image && typeof item.image === 'string' && item.image.length > 5) {
        const key = item.category.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, item.image);
        }
      }
    });
    return (catName: string) => map.get(catName.trim().toLowerCase());
  }, [globalCategories, menuItems]);

  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkCategoryScroll = useCallback(() => {
    if (categoryScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
      setCanScrollLeft(scrollLeft > 8);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 8);
    }
  }, []);

  useEffect(() => {
    checkCategoryScroll();
    const el = categoryScrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkCategoryScroll);
    window.addEventListener('resize', checkCategoryScroll);

    // Support mouse wheel horizontal scrolling on desktop
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      el.removeEventListener('scroll', checkCategoryScroll);
      window.removeEventListener('resize', checkCategoryScroll);
      el.removeEventListener('wheel', onWheel);
    };
  }, [checkCategoryScroll, categoriesToShow]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const popularPicks = useMemo(() => {
    const approvedVendorUsernames = new Set(approvedVendors.map(v => v.username));
    let items = menuItems.filter(item =>
      item.isPopular &&
      item.isAvailable &&
      approvedVendorUsernames.has(item.vendorUsername)
    );

    if (filterMode === 'veg') {
      items = items.filter(item => item.isVeg);
    } else if (filterMode === 'non-veg') {
      items = items.filter(item => !item.isVeg);
    }

    return items;
  }, [menuItems, approvedVendors, filterMode]);

  const handleTabChange = (tabValue: string) => {
    setActiveTab(tabValue);
  };

  const handleVendorChange = (vendorUsername: string) => {
    const newParams = new URLSearchParams(searchParams.toString());
    const vendor = vendors.find(v => v.username === vendorUsername);
    const identifier = vendor?.slug || vendorUsername;

    setItemSearchQuery(''); // Clear item search when vendor changes
    newParams.delete('item'); // Also clear direct item links
    newParams.delete('category'); // Clear menu category when vendor changes

    if (identifier === 'all') {
      newParams.delete('vendor');
    } else {
      newParams.set('vendor', identifier);
    }

    router.push(`/menu?${newParams.toString()}`, { scroll: false });
  };

  const handleClearFilters = () => {
    router.push('/menu', { scroll: false });
    setItemSearchQuery('');
  };

  const handleOpenCustomization = useCallback((item: MenuItemType) => {
    setSelectedItem(item);
  }, []);

  const handleCloseCustomization = useCallback((open: boolean) => {
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleOpenPortionSelect = useCallback((items: MenuItemType[]) => {
    setPortionSelectItems(items);
  }, []);

  const handleCombinedItemRowClick = useCallback((items: MenuItemType[]) => {
    const vendor = vendors.find(v => v.username === items[0].vendorUsername);
    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    const isFirstItemFromThisVendor = cartItems.every(cartItem => cartItem.vendorUsername !== items[0].vendorUsername);
    const isCartEmpty = cartItems.length === 0;

    if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
      setSelfPickupDialogState({ open: true, items, item: null, selectedOptions: {}, quantity: 1 });
    } else {
      setPortionSelectItems(items);
    }
  }, [vendors, cartItems]);

  const groupedMenuItems = useMemo(() => {
    const grouped = menuItemsToDisplay.reduce((acc, item) => {
      const baseName = item.name.replace(/\s+(full|half)$/i, '').trim();
      const key = `${item.vendorUsername}_${baseName}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, MenuItemType[]>);

    return Object.values(grouped);
  }, [menuItemsToDisplay]);


  const renderMenuItems = () => {
    if (groupedMenuItems.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groupedMenuItems.map((group) => {
          const vendor = approvedVendors.find(v => v.username === group[0].vendorUsername);

          if (group.length > 1) {
            // This is a combined item (half/full)
            const totalRatingSum = group.reduce((sum, item) => sum + (item.totalRatingSum || 0), 0);
            const totalRatingCount = group.reduce((sum, item) => sum + (item.ratingCount || 0), 0);
            const avgRating = totalRatingCount > 0 ? totalRatingSum / totalRatingCount : 0;

            return (
              <CombinedMenuItemCard
                key={group[0].id}
                items={group}
                averageRating={avgRating}
                ratingCount={totalRatingCount}
                vendor={vendor}
                onAddClick={() => handleCombinedItemRowClick(group)}
                onImageClick={handleImageClick}
              />
            );
          }

          // This is a single item
          const item = group[0];
          const ratingCount = item.ratingCount || 0;
          const avgRating = ratingCount > 0 && item.totalRatingSum ? item.totalRatingSum / ratingCount : 0;

          return (
            <MenuItemCard
              key={item.id}
              item={item}
              averageRating={avgRating}
              ratingCount={ratingCount}
              vendor={vendor}
              onAdd={handleAddToCartWithDialogCheck}
              onCustomize={handleOpenCustomization}
              onImageClick={handleImageClick}
            />
          )
        })}
      </div>
    );
  };

  const showCategoryGrid = !isFilterActive;
  const isSearching = itemSearchQuery.length > 0;

  const filteredGlobalCategories = useMemo(() => {
    const approvedVendorUsernames = new Set(vendorsToDisplay.map(v => v.username));

    let relevantItems = menuItems.filter(item => approvedVendorUsernames.has(item.vendorUsername));

    if (filterMode === 'veg') {
      relevantItems = relevantItems.filter(item => item.isVeg);
    } else if (filterMode === 'non-veg') {
      relevantItems = relevantItems.filter(item => !item.isVeg);
    }

    const categoriesWithItems = new Set(relevantItems.map(item => item.category));

    return globalCategories.filter(category => categoriesWithItems.has(category.name));
  }, [globalCategories, menuItems, filterMode, vendorsToDisplay]);

  const matchingVendors = useMemo(() => {
    if (!itemSearchQuery || itemSearchQuery.trim().length === 0) return [];
    const query = itemSearchQuery.toLowerCase().trim();
    return vendorsToDisplay.filter(v =>
      (v.shopName && v.shopName.toLowerCase().includes(query)) ||
      (v.category && v.category.toLowerCase().includes(query))
    );
  }, [vendorsToDisplay, itemSearchQuery]);

  const handleAddToCartFromPopular = (e: React.MouseEvent, item: MenuItemType) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCartWithDialogCheck(item, {}, 1);
  };

  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <AnimatePresence>
        {zoomedItem && (
          <ZoomedImageOverlay
            item={zoomedItem}
            onClose={() => setZoomedItem(null)}
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "container mx-auto px-4 pt-3 sm:pt-6 transition-[padding] duration-300",
        totalItems > 0 ? "pb-36 sm:pb-28" : "pb-12"
      )}>
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="space-y-6 mb-6">
            {/* ── SEARCH & FILTER BAR ────────────────────────────────────────────── */}
            <div className="bg-card/85 backdrop-blur-xl border border-border/80 rounded-3xl p-3 sm:p-4 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                {/* Menu Item Search Bar */}
                <div className="relative w-full flex-1">
                  <Utensils className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search dishes, cuisines, or items..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="pl-9 pr-9 h-11 rounded-2xl border-border/80 focus-visible:ring-primary/20 bg-background/80"
                  />
                  {itemSearchQuery && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
                      onClick={() => setItemSearchQuery('')}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>

                {/* Quick Filter Chips (Veg / Non-Veg / All) */}
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-2xl border border-border/50 flex-shrink-0 w-full sm:w-auto justify-center">
                  <button
                    type="button"
                    onClick={() => setFilterMode('all')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex-1 sm:flex-initial text-center",
                      filterMode === 'all'
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('veg')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap flex-1 sm:flex-initial",
                      filterMode === 'veg'
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-green-600 hover:bg-green-500/10"
                    )}
                  >
                    <Leaf className="h-3.5 w-3.5" /> Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('non-veg')}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 whitespace-nowrap flex-1 sm:flex-initial",
                      filterMode === 'non-veg'
                        ? "bg-red-600 text-white shadow-sm"
                        : "text-red-600 hover:bg-red-500/10"
                    )}
                  >
                    <Beef className="h-3.5 w-3.5" /> Non-Veg
                  </button>
                </div>
              </div>
            </div>

            {/* ── VISUAL KITCHENS & VENDORS CAROUSEL ─────────────────────────────────── */}
            {!isSearching && vendorsToDisplay.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Building className="h-3.5 w-3.5" />
                    </div>
                    <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                      Explore by Kitchen / Store
                    </h3>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      ({vendorsToDisplay.length} nearby)
                    </span>
                  </div>
                  {selectedVendor !== 'all' && (
                    <button
                      type="button"
                      onClick={() => handleVendorChange('all')}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-muted/80 hover:bg-destructive/10 text-muted-foreground hover:text-destructive border border-border/80 hover:border-destructive/30 transition-all shadow-xs group cursor-pointer"
                    >
                      <span>Clear Filter</span>
                      <span className="w-4 h-4 rounded-full bg-foreground/10 group-hover:bg-destructive/20 flex items-center justify-center transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                  {/* "All Stores" Card */}
                  <button
                    type="button"
                    onClick={() => handleVendorChange('all')}
                    className={cn(
                      "flex-shrink-0 flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border transition-all duration-200 text-left cursor-pointer",
                      selectedVendor === 'all'
                        ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/20"
                        : "bg-card hover:bg-muted/60 border-border/70 text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0",
                      selectedVendor === 'all'
                        ? "bg-white/20 text-white"
                        : "bg-primary/10 text-primary"
                    )}>
                      <Building className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight whitespace-nowrap">All Stores</p>
                      <p className={cn(
                        "text-[10px] leading-tight mt-0.5 whitespace-nowrap",
                        selectedVendor === 'all' ? "text-primary-foreground/80" : "text-muted-foreground"
                      )}>
                        {vendorsToDisplay.length} kitchens
                      </p>
                    </div>
                  </button>

                  {/* Individual Vendor Cards */}
                  {vendorsToDisplay.map((v) => {
                    const isSelected = selectedVendor === v.username;
                    const shopStatus = VendorStatusManager.getShopStatus(v);
                    const isShopOpen = shopStatus.status === VendorStatus.OPEN;
                    const distance = userLocation && v.latitude && v.longitude
                      ? calculateDistanceInKm(userLocation.latitude, userLocation.longitude, v.latitude, v.longitude)
                      : null;
                    const ratingCount = v.ratingCount || 0;
                    const avgRating = ratingCount > 0 ? (v.totalRatingSum || 0) / ratingCount : null;

                    return (
                      <button
                        key={v.username}
                        type="button"
                        onClick={() => handleVendorChange(isSelected ? 'all' : v.username)}
                        className={cn(
                          "group flex-shrink-0 flex items-center gap-2.5 p-2 pr-3.5 rounded-2xl border transition-all duration-200 text-left min-w-[170px] max-w-[230px] cursor-pointer",
                          isSelected
                            ? "bg-primary/10 border-primary ring-2 ring-primary/20 shadow-md"
                            : "bg-card hover:bg-muted/50 border-border/70 hover:border-primary/40",
                          !isShopOpen && "opacity-65 grayscale-[25%]"
                        )}
                      >
                        {/* Store Avatar Thumbnail */}
                        <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                          <Image
                            src={v.shopImage || v.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop&q=80'}
                            alt={v.shopName || v.name}
                            fill
                            sizes="40px"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            placeholder={v.shopImageBlur ? 'blur' : 'empty'}
                            blurDataURL={v.shopImageBlur}
                          />
                          {/* Live Status indicator dot */}
                          <span className={cn(
                            "absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-zinc-900",
                            isShopOpen ? "bg-emerald-500" : "bg-zinc-400"
                          )} />
                        </div>

                        {/* Store Info */}
                        <div className="min-w-0 flex-1">
                          <h4 className={cn(
                            "text-xs font-bold truncate leading-tight",
                            isSelected ? "text-primary font-extrabold" : "text-foreground group-hover:text-primary"
                          )}>
                            {v.shopName}
                          </h4>
                          <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                            {v.category || 'Kitchen'}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1 text-[9px] font-semibold text-muted-foreground">
                            {avgRating ? (
                              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                                <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                {avgRating.toFixed(1)}
                              </span>
                            ) : null}
                            {distance !== null && (
                              <span>• {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</span>
                            )}
                            {!isShopOpen && (
                              <span className="text-red-500 font-bold">• Closed</span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!isSearching && popularPicks.length > 0 && (
              <section className="py-2.5">
                <div className="flex justify-between items-center mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-orange-500/15 flex items-center justify-center text-orange-500 shadow-xs">
                      <Flame className="h-3.5 w-3.5 fill-orange-500" />
                    </span>
                    <h2 className="text-sm sm:text-base font-bold font-headline text-foreground tracking-tight leading-tight">
                      Popular Picks
                    </h2>
                  </div>
                  <Link href="/popular-picks" passHref>
                    <Button variant="ghost" size="sm" className="text-primary hover:text-primary font-semibold text-[11px] h-6 px-2">
                      See all
                    </Button>
                  </Link>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none snap-x -mx-1 px-1">
                  {popularPicks.map((item, index) => {
                    const vendor = vendors.find(v => v.username === item.vendorUsername);
                    return (
                      <div key={`${item.id}-${index}`} className="flex-shrink-0 w-28 sm:w-32 snap-start">
                        <PopularPickItemCard
                          item={item}
                          vendor={vendor}
                          onAddToCart={(item) => handleAddToCartWithDialogCheck(item, {}, 1)}
                          onCustomise={handleOpenCustomization}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            {isFilterActive && (
              <div className="flex justify-center mt-2">
                <Button
                  variant="outline"
                  onClick={handleClearFilters}
                  className="rounded-full text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to All Menu
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {showCategoryGrid ? (
              <div>
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary shadow-xs">
                        <UtensilsCrossed className="h-3.5 w-3.5" />
                      </span>
                      <h2 className="text-sm sm:text-base font-bold font-headline text-foreground tracking-tight leading-tight">
                        Explore Cuisines &amp; Categories
                      </h2>
                    </div>
                  </div>
                  {isFetchingItems ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                  ) : (
                    <div className="w-full overflow-x-auto hide-scrollbar pb-3 pt-1">
                      <div className="flex gap-3 min-w-max px-1">
                        {filteredGlobalCategories.map((category, index) => (
                          <Link
                            key={`${category.id}-${index}`}
                            href={`/menu?category=${encodeURIComponent(category.name)}`}
                            className="flex flex-col items-center gap-2 group/item flex-shrink-0 w-20 sm:w-24 text-center cursor-pointer select-none"
                          >
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shadow-sm border-2 border-primary/20 group-hover/item:border-primary group-hover/item:scale-105 group-hover/item:shadow-md transition-all duration-300 bg-muted">
                              <Image
                                src={category.imageUrl || 'https://placehold.co/100x100.png'}
                                alt={category.name}
                                layout="fill"
                                className="object-cover group-hover/item:scale-110 transition-transform duration-500"
                                placeholder={category.blurDataUrl ? 'blur' : 'empty'}
                                blurDataURL={category.blurDataUrl}
                                unoptimized={typeof category.imageUrl === 'string' && category.imageUrl.startsWith('data:')}
                              />
                            </div>
                            <p className="text-xs text-center font-semibold text-foreground group-hover/item:text-primary transition-colors line-clamp-1">{category.name}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section className="mt-6 mb-6">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-500 shadow-xs">
                        <Star className="h-3.5 w-3.5 fill-amber-400" />
                      </span>
                      <h2 className="text-sm sm:text-base font-bold font-headline text-foreground tracking-tight leading-tight">
                        Top Rated Dishes
                      </h2>
                    </div>
                  </div>
                  {topRatedItems.length > 0 ? (
                    <Carousel
                      plugins={[autoplayPlugin.current]}
                      opts={{ align: "start", loop: true }}
                      className="w-full"
                    >
                      <CarouselContent className="-ml-2">
                        {topRatedItems.map((item) => {
                          const vendor = approvedVendors.find(v => v.username === item.vendorUsername);
                          const ratingCount = item.ratingCount || 0;
                          const avgRating = ratingCount > 0 && item.totalRatingSum ? item.totalRatingSum / ratingCount : 0;
                          const hasMandatoryVariants = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;
                          const isOutOfStock = !isItemInStock(item, vendor?.isInventory);
                          const maxDiscount = (() => {
                            if (!item.isDiscountActive) return 0;

                            let maxPct = 0;
                            if (item.discountPrice && item.price > 0) {
                              maxPct = Math.round(((item.price - item.discountPrice) / item.price) * 100);
                            }
                            item.customizations?.forEach(c => {
                              c.options.forEach(o => {
                                if (o.originalPrice && o.originalPrice > o.price) {
                                  const pct = Math.round(((o.originalPrice - o.price) / o.originalPrice) * 100);
                                  if (pct > maxPct) maxPct = pct;
                                }
                              });
                            });
                            return maxPct;
                          })();

                          return (
                            <CarouselItem key={item.id} className="pl-2 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6 xl:basis-1/8">
                              <Link href={`/menu?vendor=${vendor?.slug || vendor?.username}&item=${item.id}`} passHref>
                                <Card className="overflow-hidden rounded-2xl h-full flex flex-col group">
                                  <CardContent className="p-1 flex flex-col items-center text-center flex-1">
                                    <div className="w-20 h-20 rounded-full overflow-hidden relative mb-1">
                                      <Image
                                        src={item.image}
                                        alt={item.name}
                                        fill
                                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                                        placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                                        blurDataURL={item.blurDataUrl}
                                        unoptimized={typeof item.image === 'string' && item.image.startsWith('data:')}
                                      />
                                    </div>
                                    <h3 className="font-semibold text-xs leading-tight flex-1">{item.name}</h3>
                                    {maxDiscount > 0 && (
                                      <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1 rounded-sm uppercase tracking-tight">
                                        {maxDiscount}% OFF
                                      </span>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{vendor?.shopName}</p>
                                    {isOutOfStock && (
                                      <p className="text-[10px] text-destructive font-semibold mt-0.5">Out of Stock</p>
                                    )}
                                    {!isOutOfStock && !hasMandatoryVariants && typeof item.stock === 'number' && (vendor?.isInventory || vendor?.category === 'Bakery' || item.stock <= 5) && (
                                      <p className={cn(
                                        "text-[10px] font-semibold mt-0.5",
                                        item.stock <= 5 ? "text-destructive" : "text-amber-600"
                                      )}>{item.stock} available</p>
                                    )}
                                    <div className="flex items-center justify-center gap-1 text-xs text-amber-400 mt-1" title="Item Rating">
                                      <Star className="h-3 w-3 fill-current" />
                                      <span className="font-bold">{avgRating.toFixed(1)}</span>
                                      <span className="text-muted-foreground">({ratingCount})</span>
                                    </div>
                                  </CardContent>
                                </Card>
                              </Link>
                            </CarouselItem>
                          )
                        })}
                      </CarouselContent>
                      <CarouselPrevious className="ml-8 flex" />
                      <CarouselNext className="mr-8 flex" />
                    </Carousel>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground">No highly rated dishes yet. Be the first to rate!</p>
                  )}
                </section>

                {discountedItems.length > 0 && (
                  <section className="mt-8">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-500 shadow-xs">
                          <Percent className="h-3.5 w-3.5" />
                        </span>
                        <h2 className="text-sm sm:text-base font-bold font-headline text-foreground tracking-tight leading-tight">
                          ⚡ Super Saver Deals &amp; Offers
                        </h2>
                      </div>
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive shrink-0">
                        Limited Time
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {discountedItems.map(item => {
                        const vendor = approvedVendors.find(v => v.username === item.vendorUsername);
                        const ratingCount = item.ratingCount || 0;
                        const avgRating = ratingCount > 0 && item.totalRatingSum ? item.totalRatingSum / ratingCount : 0;
                        return (
                          <MenuItemCard
                            key={item.id}
                            item={item}
                            averageRating={avgRating}
                            ratingCount={ratingCount}
                            vendor={vendor}
                            onAdd={handleAddToCartWithDialogCheck}
                            onCustomize={handleOpenCustomization}
                            onImageClick={handleImageClick}
                          />
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            ) : isFetchingItems ? (
              <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
            ) : (menuItemsToDisplay.length > 0 || matchingVendors.length > 0) ? (
              <>
                {/* ── MATCHING KITCHENS IN SEARCH ───────────────────────────────── */}
                {isSearching && matchingVendors.length > 0 && (
                  <div className="mb-6 p-3.5 sm:p-4 rounded-3xl bg-card border border-border/80 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <Building className="h-3.5 w-3.5" />
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                        Matching Kitchens & Stores ({matchingVendors.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {matchingVendors.map((v) => {
                        const shopStatus = VendorStatusManager.getShopStatus(v);
                        const isShopOpen = shopStatus.status === VendorStatus.OPEN;
                        const distance = userLocation && v.latitude && v.longitude
                          ? calculateDistanceInKm(userLocation.latitude, userLocation.longitude, v.latitude, v.longitude)
                          : null;
                        const ratingCount = v.ratingCount || 0;
                        const avgRating = ratingCount > 0 ? (v.totalRatingSum || 0) / ratingCount : null;

                        return (
                          <button
                            key={v.username}
                            type="button"
                            onClick={() => handleVendorChange(v.username)}
                            className="flex items-center gap-3 p-2.5 sm:p-3 rounded-2xl bg-muted/40 hover:bg-primary/5 hover:border-primary/50 border border-border/60 transition-all text-left group cursor-pointer"
                          >
                            <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border/50">
                              <Image
                                src={v.shopImage || v.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=120&auto=format&fit=crop&q=80'}
                                alt={v.shopName || v.name}
                                fill
                                sizes="48px"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                placeholder={v.shopImageBlur ? 'blur' : 'empty'}
                                blurDataURL={v.shopImageBlur}
                              />
                              <span className={cn(
                                "absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full ring-1 ring-white dark:ring-zinc-900",
                                isShopOpen ? "bg-emerald-500" : "bg-zinc-400"
                              )} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <h4 className="text-xs sm:text-sm font-bold truncate text-foreground group-hover:text-primary transition-colors">
                                  {v.shopName}
                                </h4>
                                <span className="text-[10px] font-semibold text-primary group-hover:underline shrink-0">
                                  View Menu →
                                </span>
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {v.category || 'Kitchen'}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-semibold text-muted-foreground">
                                {avgRating ? (
                                  <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-bold">
                                    <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                                    {avgRating.toFixed(1)}
                                  </span>
                                ) : null}
                                {distance !== null && (
                                  <span>• {distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`}</span>
                                )}
                                {!isShopOpen && (
                                  <span className="text-red-500 font-bold">• Closed</span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── MATCHING DISHES ───────────────────────────────────────────── */}
                {menuItemsToDisplay.length > 0 ? (
                  <>
                    {categoriesToShow.length > 0 && !isSearching ? (
                      <div className="sticky top-16 bg-background/95 backdrop-blur-md z-30 pt-2 pb-1.5 -mx-2 px-2 border-b border-border/40 mb-2">
                        {/* Compact Header Label */}
                        <div className="flex items-center justify-between px-1 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Menu Categories
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground font-medium">
                              {categoriesToShow.length} sections
                            </span>
                            {/* Desktop Quick Nav Arrows */}
                            <div className="hidden sm:flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => scrollCategories('left')}
                                disabled={!canScrollLeft}
                                aria-label="Scroll categories left"
                                className={cn(
                                  "w-6 h-6 rounded-full border border-border/70 flex items-center justify-center text-foreground transition-all",
                                  canScrollLeft
                                    ? "hover:bg-muted hover:border-primary cursor-pointer opacity-100 shadow-2xs"
                                    : "opacity-30 cursor-not-allowed"
                                )}
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => scrollCategories('right')}
                                disabled={!canScrollRight}
                                aria-label="Scroll categories right"
                                className={cn(
                                  "w-6 h-6 rounded-full border border-border/70 flex items-center justify-center text-foreground transition-all",
                                  canScrollRight
                                    ? "hover:bg-muted hover:border-primary cursor-pointer opacity-100 shadow-2xs"
                                    : "opacity-30 cursor-not-allowed"
                                )}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Swipeable & Mouse-Wheel Scrollable Category Pills */}
                        <div
                          ref={categoryScrollRef}
                          className="w-full overflow-x-auto hide-scrollbar py-2 px-0.5 scroll-smooth"
                        >
                          <TabsList className="bg-transparent p-0 h-auto flex items-center gap-2 w-max">
                            {/* "All" Option */}
                            <TabsTrigger
                              value="all"
                              className={cn(
                                "rounded-full border h-10 sm:h-11 pl-1.5 pr-3.5 shrink-0 transition-all flex items-center gap-2 shadow-2xs group",
                                activeTab === 'all'
                                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                  : "bg-card/95 border-border/80 text-foreground hover:bg-muted/80 hover:border-primary/40"
                              )}
                            >
                              <div className={cn(
                                "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                activeTab === 'all'
                                  ? "bg-white/20 text-white"
                                  : "bg-primary/10 text-primary group-hover:bg-primary/20"
                              )}>
                                <Utensils className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                              </div>
                              <span className="text-xs sm:text-sm font-bold">All</span>
                              {totalCategoryItemsCount > 0 && (
                                <span className={cn(
                                  "text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold",
                                  activeTab === 'all'
                                    ? "bg-white/25 text-white"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {totalCategoryItemsCount}
                                </span>
                              )}
                            </TabsTrigger>

                            {/* Category Items */}
                            {categoriesToShow.map((catName: string) => {
                              const thumb = getCategoryThumbnail(catName);
                              const count = categoryItemCounts[catName] || 0;
                              const isActive = activeTab === catName;

                              return (
                                <TabsTrigger
                                  key={catName}
                                  value={catName}
                                  className={cn(
                                    "rounded-full border h-10 sm:h-11 pl-1.5 pr-3.5 shrink-0 transition-all flex items-center gap-2 shadow-2xs group",
                                    isActive
                                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                      : "bg-card/95 border-border/80 text-foreground hover:bg-muted/80 hover:border-primary/40"
                                  )}
                                >
                                  {thumb ? (
                                    <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden shrink-0 border border-border/50 shadow-xs bg-muted">
                                      <Image
                                        src={thumb}
                                        alt={catName}
                                        fill
                                        sizes="32px"
                                        className="object-cover"
                                        unoptimized
                                      />
                                    </div>
                                  ) : (
                                    <div className={cn(
                                      "w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs",
                                      isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                    )}>
                                      {catName.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-xs sm:text-sm font-bold whitespace-nowrap">{catName}</span>
                                  {count > 0 && (
                                    <span className={cn(
                                      "text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full font-bold",
                                      isActive
                                        ? "bg-white/25 text-white"
                                        : "bg-muted text-muted-foreground"
                                    )}>
                                      {count}
                                    </span>
                                  )}
                                </TabsTrigger>
                              );
                            })}
                          </TabsList>
                        </div>
                      </div>
                    ) : null}
                    {isSearching && matchingVendors.length > 0 && (
                      <div className="flex items-center gap-1.5 px-1 pt-2 pb-1">
                        <Utensils className="h-3.5 w-3.5 text-primary" />
                        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground">
                          Matching Dishes ({menuItemsToDisplay.length})
                        </h3>
                      </div>
                    )}
                    <div className="mt-2">
                      {renderMenuItems()}
                    </div>
                    {totalItems > 0 && <div className="h-28 sm:h-24 w-full shrink-0" aria-hidden="true" />}
                  </>
                ) : isSearching && matchingVendors.length > 0 ? (
                  <div className="text-center py-8 flex flex-col items-center gap-2 bg-card/30 rounded-2xl border border-dashed border-border/80">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      No individual dishes matching <span className="font-semibold text-foreground">"{itemSearchQuery}"</span>, but found matching kitchen(s) above!
                    </p>
                    <p className="text-[11px] text-primary font-medium">Click on a kitchen above to view their full menu.</p>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="text-center py-16 flex flex-col items-center gap-4 bg-card/50 rounded-lg">
                <Utensils className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-xl font-semibold">No items match your search.</h3>
                <p className="text-muted-foreground">Try a different search term or clear filters.</p>
              </div>
            )}
          </div>
        </Tabs>

        <OrderCustomizationSheet
          item={selectedItem}
          vendor={vendors.find(v => v.username === selectedItem?.vendorUsername)}
          open={!!selectedItem}
          onOpenChange={handleCloseCustomization}
          onAdd={handleAddToCartWithDialogCheck}
        />
        <MultiOfferSplashDialog isOpen={isOfferOpen} onOpenChange={setIsOfferOpen} offers={activeOffers} />
        <PortionSelectDialog
          items={portionSelectItems}
          open={!!portionSelectItems}
          vendor={portionSelectItems ? vendors.find(v => v.username === portionSelectItems[0].vendorUsername) : undefined}
          onOpenChange={() => setPortionSelectItems(null)}
          onConfirm={(item, quantity) => {
            const forceSelfPickup = deliveryChoiceForPortionSelect === 'yes';
            handleAddToCartWithDialogCheck(item, {}, quantity, forceSelfPickup);
            setDeliveryChoiceForPortionSelect(null); // Reset for next time
          }}
        />
        <Dialog open={selfPickupDialogState.open} onOpenChange={(open) => !open && handleSelfPickupDialogClose('cancel')}>
          <DialogContent className="sm:max-w-md sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-headline text-2xl text-center">{selfPickupDialogState.item?.shopName || selfPickupDialogState.items?.[0]?.shopName} offers Self-Pickup only</DialogTitle>
              <DialogDescription className="text-center pt-2">
                This vendor does not provide home delivery through our platform. How would you like to proceed?
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div
                className="flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-primary/5 hover:border-primary transition-all"
                onClick={() => handleSelfPickupDialogClose('no')}
              >
                <Bike className="h-10 w-10 text-primary mb-2" />
                <h3 className="font-semibold text-center">Request Delivery</h3>
                <p className="text-xs text-muted-foreground text-center">A minimum order of ₹{vendorForDialog?.minOrderAmount || 0} is required.</p>
              </div>
              <div
                className="flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-green-500/5 hover:border-green-500 transition-all"
                onClick={() => handleSelfPickupDialogClose('yes')}
              >
                <Hand className="h-10 w-10 text-green-500 mb-2" />
                <h3 className="font-semibold text-center">I'll Pick It Up</h3>
                <p className="text-xs text-muted-foreground text-center">No minimum order amount applies.</p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <FloatingCartBar />
      </div>
    </div>
  );
}
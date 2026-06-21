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
import { Star, Building, ShoppingCart, Loader2, Minus, Plus, Utensils, X, Sparkles, Gift, Search, Hand, Tag, ArrowLeft, Fingerprint, Leaf, Bike, Beef, ChevronDown } from 'lucide-react';
import { useVendor } from '@/context/vendor-context';
import { Combobox } from '@/components/ui/combobox';
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
                    <RadioGroupItem value={item.id} id={item.id} disabled={!item.isAvailable}/>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
        <DialogFooter className="sm:justify-between items-center gap-4">
           <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Minus className="h-4 w-4"/>
              </Button>
              <span className="font-bold text-lg w-10 text-center">{quantity}</span>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => q + 1)}>
                  <Plus className="h-4 w-4"/>
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
                    />
                </motion.div>
            </motion.div>
        </motion.div>
    );
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

  const handleSimpleQuantityChange = (e: React.MouseEvent, change: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!simpleCartItem && change > 0) {
      onAddToCart(item);
    } else if (simpleCartItem) {
      updateCartItemQuantity(simpleCartItem.cartItemId, simpleCartItem.quantity + change);
    }
  };

  const hasDiscount = !!(item.isDiscountActive && item.discountPrice && item.discountPrice > 0);
  const isCustomizable = item.customizations && item.customizations.length > 0;
  const hasMandatoryVariants = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;

  const isOutOfStock = !isItemInStock(item, vendor?.isInventory);

  const hasMandatoryCustomization = item.customizations?.some(c => Number(c.minSelect) === 1) ?? false;

  const startingPrice = useMemo(() => {
    if (!isCustomizable) {
      return item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price;
    }

    const basePrice = hasMandatoryCustomization ? 0 : (item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price);

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
  }, [item, isCustomizable, hasMandatoryCustomization]);

  const handleAction = (
    e: React.MouseEvent,
    item: MenuItemType
  ) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="h-full">
      <Link href={getItemUrl(item)} passHref>
        <div className="h-full">
          <Card className="rounded-2xl overflow-hidden group h-full flex flex-col text-left bg-card/80">
            <CardContent className="p-0 flex flex-col flex-1">
              <div className="w-full aspect-square relative">
                  <Image
                    src={item.image}
                    alt={item.name}
                    layout="fill"
                    data-ai-hint={item.aiHint}
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                    blurDataURL={item.blurDataUrl}
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
                    if (maxPct > 0) {
                        return (
                            <div className="absolute top-2 left-2 z-10 bg-destructive text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                                <Tag className="h-2 w-2 fill-current" />
                                {maxPct}% OFF
                            </div>
                        );
                    }
                    return null;
                  })()}
                </div>
              <div className="p-2 flex-1 flex flex-col">
                <h3 className="font-semibold text-xs flex-1 leading-tight">
                  {item.name}
                </h3>
                {vendor && (
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">
                    {vendor.shopName}
                  </p>
                )}
                {isOutOfStock && (
                  <p className="text-[10px] text-destructive font-semibold mt-0.5">
                    Out of Stock
                  </p>
                )}
                {!isOutOfStock &&
                  !hasMandatoryVariants &&
                  typeof item.stock === 'number' &&
                  !isCustomizable &&
                  (vendor?.isInventory || vendor?.category === 'Bakery' || item.stock <= 5) && (
                    <p className={cn(
                        "text-[10px] font-semibold mt-0.5",
                        item.stock <= 5 ? "text-destructive" : "text-amber-600"
                    )}>
                      {item.stock} available
                    </p>
                  )}
                <div className="flex items-center justify-between mt-1">
                  <p className="font-semibold text-xs">
                    {isCustomizable && <span className="text-[8px] block text-muted-foreground font-normal -mb-0.5">From</span>}
                    {hasDiscount && !isCustomizable ? (
                      <span className="flex items-baseline gap-1">
                        <span className="text-red-600">
                          ₹{item.discountPrice?.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-muted-foreground line-through">
                          ₹{item.price.toFixed(0)}
                        </span>
                      </span>
                    ) : (
                      <span>₹{startingPrice.toFixed(0)}</span>
                    )}
                  </p>
                  <div className="flex items-center">
                      {!isCustomizable ? (
                          simpleQuantity > 0 ? (
                              <div className="flex items-center gap-1">
                                  <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={(e) => handleSimpleQuantityChange(e, -1)} disabled={isOutOfStock}>
                                      <Minus className="h-3 w-3"/>
                                  </Button>
                                  <span className="font-bold w-4 text-center text-xs">{simpleQuantity}</span>
                                  <Button variant="outline" size="icon" className="h-6 w-6 rounded-full" onClick={(e) => handleSimpleQuantityChange(e, 1)} disabled={isOutOfStock}>
                                      <Plus className="h-3 w-3"/>
                                  </Button>
                              </div>
                          ) : (
                              <Button
                                size="icon"
                                className="h-6 w-6 rounded-full"
                                onClick={(e) => handleAction(e, item)}
                                disabled={isOutOfStock}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                          )
                      ) : (
                          totalQuantity > 0 ? (
                             <div className="flex items-center gap-1">
                                 <span className="font-bold w-4 text-center text-xs text-purple-500">{totalQuantity}</span>
                                 <Button
                                    size="icon"
                                    className="h-6 w-6 rounded-full border-purple-500 text-purple-500"
                                    onClick={(e) => handleAction(e, item)}
                                    disabled={isOutOfStock}
                                    variant="outline"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                             </div>
                          ) : (
                              <Button
                                size="icon"
                                className="h-6 w-6 rounded-full"
                                onClick={(e) => handleAction(e, item)}
                                disabled={isOutOfStock}
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                          )
                      )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
    onImageClick: (item: {id: string, image: string, name: string}) => void;
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
    if (!isCustomizable) {
      return hasDiscount ? item.discountPrice! : item.price;
    }

    const basePrice = hasMandatoryOptions ? 0 : (hasDiscount ? item.discountPrice! : item.price);

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
  }, [item, isCustomizable, hasMandatoryOptions, hasDiscount]);

  return (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="h-full"
  >
    <Card className={cn(
        "w-full h-full flex flex-col overflow-hidden border-yellow-500/10 hover:border-yellow-500/40 transition-all duration-300 hover:bg-card/95 rounded-3xl relative",
        !isItemEffectivelyAvailable && "bg-muted/50 border-muted-foreground/10 hover:border-muted-foreground/10"
    )}>
       {discountPercentage > 0 && (
          <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground rounded-full px-2 py-1 text-[10px] font-bold flex items-center justify-center">
            <Tag className="h-3 w-3 mr-1" />
            <span>{discountPercentage}%</span>
          </div>
        )}
      <CardContent className="p-4 relative flex-1 flex flex-col">
          {!isItemEffectivelyAvailable && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-3xl">
                <p className="text-foreground font-bold text-lg text-center px-4">
                    {!isShopOpen ? (shopStatus?.msg || 'Closed') : (!isEffectivelyInStock ? 'Out of Stock' : 'Not available')}
                </p>
            </div>
          )}
          <div className={cn("flex flex-row items-start gap-4 flex-1", !isItemEffectivelyAvailable && "filter grayscale opacity-60")}>
            <div className="w-24 flex-shrink-0">
                {showImage && (
                  <motion.div 
                    layoutId={`image-${item.id}`}
                    className="aspect-square relative rounded-2xl overflow-hidden cursor-pointer"
                    onClick={() => onImageClick({id: item.id, image: imageToDisplay, name: item.name})}
                  >
                      <Image
                          src={imageToDisplay}
                          alt={item.name}
                          fill
                          sizes="(max-width: 768px) 100vw, 128px"
                          data-ai-hint={item.aiHint}
                          className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                          placeholder={item.blurDataUrl ? 'blur' : 'empty'}
                          blurDataURL={item.blurDataUrl}
                      />
                  </motion.div>
                )}
                 {ratingCount > 0 && (
                    <div className="flex items-center justify-center gap-1 text-xs text-amber-400 mt-2" title="Item Rating">
                        <Star className="h-3 w-3 fill-current" />
                        <span>{averageRating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({ratingCount})</span>
                    </div>
                )}
            </div>
            <div className="flex-1 flex flex-col h-full">
                <div className="flex-grow">
                    <h3 className="font-headline text-lg font-semibold">{item.name}</h3>
                     <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <div className="flex items-center gap-2 text-xs text-amber-500" title={`Vendor: ${vendor?.shopName}`}>
                            <Building className="h-4 w-4" />
                            <span className="font-medium">{item.shopName || 'Unknown Vendor'}</span>
                        </div>
                    </div>
                    <p className="text-muted-foreground text-sm mt-2">{item.description}</p>
                    {typeof item.stock === 'number' && item.stock > 0 && !isCustomizable && (vendor?.isInventory || vendor?.category === 'Bakery' || item.stock <= 5) && (
                      <p className={cn(
                        "text-xs font-semibold mt-1",
                        item.stock <= 5 ? "text-destructive" : "text-amber-600"
                      )}>
                        {item.stock} available
                      </p>
                    )}
                </div>

                <div className="flex items-center justify-between mt-4">
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-foreground">
                            {isCustomizable && <span>From </span>}
                            ₹{startingPrice.toFixed(2)}
                        </p>
                        {hasDiscount && !isCustomizable && (
                            <p className="text-[10px] text-muted-foreground line-through">₹{item.price.toFixed(2)}</p>
                        )}
                      </div>
                    <div className="flex items-center gap-2">
                        {!isCustomizable ? (
                            quantityInCart > 0 ? (
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSimpleQuantityChange(-1)} disabled={!isItemEffectivelyAvailable}>
                                        <Minus className="h-4 w-4"/>
                                    </Button>
                                    <span className="font-bold w-8 text-center">{quantityInCart}</span>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleSimpleQuantityChange(1)} disabled={!isItemEffectivelyAvailable}>
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={handleAddClick} variant="outline" size="sm" className="rounded-full border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white flex items-center gap-1" disabled={!isItemEffectivelyAvailable}>
                                    Add
                                </Button>
                            )
                        ) : (
                            totalQuantityInCart > 0 ? (
                                <div className="flex items-center gap-1">
                                    <span className="font-bold w-6 text-center text-purple-500">{totalQuantityInCart}</span>
                                    <Button onClick={handleAddClick} variant="outline" size="icon" className="h-8 w-8 rounded-full border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white" disabled={!isItemEffectivelyAvailable}>
                                        <Plus className="h-4 w-4"/>
                                    </Button>
                                </div>
                            ) : (
                                <Button onClick={handleAddClick} variant="outline" size="sm" className="rounded-full border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white flex items-center gap-1" disabled={!isItemEffectivelyAvailable}>
                                    Add <ChevronDown className="h-3 w-3" />
                                </Button>
                            )
                        )}
                    </div>
                </div>
            </div>
          </div>
      </CardContent>
    </Card>
  </motion.div>
)};

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
    onImageClick: (item: {id: string, image: string, name: string}) => void;
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="h-full"
        >
            <Card className={cn(
                "w-full h-full flex flex-col overflow-hidden border-yellow-500/10 hover:border-yellow-500/40 transition-all duration-300 hover:bg-card/95 rounded-3xl relative",
                !isEffectivelyAvailable && "bg-muted/50 border-muted-foreground/10 hover:border-muted-foreground/10"
            )}>
                 <CardContent className="p-4 relative flex-1 flex flex-col">
                    {!isEffectivelyAvailable && (
                        <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10 rounded-3xl">
                            <p className="text-foreground font-bold text-lg text-center px-4">
                                {!isShopOpen ? (shopStatus?.msg || 'Closed') : 'Out of Stock'}
                            </p>
                        </div>
                    )}
                     <div className={cn("flex flex-row items-start gap-4 flex-1", !isEffectivelyAvailable && "filter grayscale opacity-60")}>
                        <div className="w-24 flex-shrink-0">
                            {showImage && (
                                <motion.div
                                    layoutId={`image-${primaryItem.id}`}
                                    className="aspect-square relative rounded-2xl overflow-hidden cursor-pointer"
                                    onClick={() => onImageClick({ id: primaryItem.id, image: imageToDisplay, name: baseName })}
                                >
                                    <Image
                                        src={imageToDisplay}
                                        alt={baseName}
                                        fill
                                        sizes="(max-width: 768px) 100vw, 128px"
                                        data-ai-hint={primaryItem.aiHint}
                                        className="object-cover transition-transform duration-300 ease-in-out group-hover:scale-110"
                                        placeholder={primaryItem.blurDataUrl ? 'blur' : 'empty'}
                                        blurDataURL={primaryItem.blurDataUrl}
                                    />
                                    {/* Smart Discount Badge */}
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
                                                <div className="absolute top-1.5 left-1.5 z-10 bg-destructive text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                                                    <Tag className="h-2 w-2 fill-current" />
                                                    {maxPct}% OFF
                                                </div>
                                            );
                                        }
                                        return null;
                                    })()}
                                </motion.div>
                            )}
                            {ratingCount > 0 && (
                                <div className="flex items-center justify-center gap-1 text-xs text-amber-400 mt-2" title="Item Rating">
                                    <Star className="h-3 w-3 fill-current" />
                                    <span>{averageRating.toFixed(1)}</span>
                                    <span className="text-xs text-muted-foreground">({ratingCount})</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col h-full">
                             <div className="flex-grow">
                                <h3 className="font-headline text-lg font-semibold">{baseName}</h3>
                                 <div className="flex items-center gap-4 mt-1 flex-wrap">
                                    <div className="flex items-center gap-2 text-xs text-amber-500" title={`Vendor: ${vendor?.shopName}`}>
                                        <Building className="h-4 w-4" />
                                        <span className="font-medium">{primaryItem.shopName || 'Unknown Vendor'}</span>
                                    </div>
                                </div>
                                <p className="text-muted-foreground text-sm mt-2">{primaryItem.description}</p>
                                <div className="text-xs text-destructive font-semibold mt-1">
                                    {typeof halfStock === 'number' && halfStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || halfStock <= 5) && <span>{halfStock} half available. </span>}
                                    {typeof fullStock === 'number' && fullStock > 0 && (vendor?.isInventory || vendor?.category === 'Bakery' || fullStock <= 5) && <span>{fullStock} full available.</span>}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-sm">
                                    {halfPrice !== null && `Half: ₹${halfPrice.toFixed(2)}`}
                                    {halfPrice !== null && fullPrice !== null && ' / '}
                                    {fullPrice !== null && `Full: ₹${fullPrice.toFixed(2)}`}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white"
                                    disabled={!isEffectivelyAvailable}
                                    onClick={() => onAddClick(items)}
                                >
                                    Add
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
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  
  const [filterMode, setFilterMode] = useState<'all' | 'veg' | 'non-veg'>('all');

  const [itemSearchQuery, setItemSearchQuery] = useState('');

  const { toast } = useToast();

  const { offers, fetchAllOffers } = useOffer();
  const { cartItems, addToCart } = useCart();
  const [activeOffers, setActiveOffers] = useState<Offer[]>([]);
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  
  const [selfPickupDialogState, setSelfPickupDialogState] = useState<{ open: boolean; item?: MenuItemType | null; items?: MenuItemType[] | null; selectedOptions: Record<string, string | string[]>; quantity: number; }>({ open: false, item: null, items: null, selectedOptions: {}, quantity: 1 });
  

  const [zoomedItem, setZoomedItem] = useState<{id: string, image: string, name: string} | null>(null);
  const handleImageClick = (item: {id: string, image: string, name: string}) => {
    setZoomedItem(item);
  };
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get('category');
  const vendorParam = searchParams.get('vendor');
  const itemParam = searchParams.get('item');
  const maxPriceParam = searchParams.get('maxPrice');
  const vendorCategoryParam = searchParams.get('vendorCategory');
  
  const [portionSelectItems, setPortionSelectItems] = useState<MenuItemType[] | null>(null);
  const [deliveryChoiceForPortionSelect, setDeliveryChoiceForPortionSelect] = useState<'yes' | 'no' | null>(null);
  
  const vendorForDialog = useMemo(() => {
    const item = selfPickupDialogState.item || selfPickupDialogState.items?.[0];
    if (!item) return null;
    return vendors.find(v => v.username === item.vendorUsername);
  }, [selfPickupDialogState, vendors]);

  const isFilterActive = useMemo(() => {
    return selectedVendor !== 'all' || !!categoryParam || itemSearchQuery.length > 0 || !!maxPriceParam || !!vendorCategoryParam || !!itemParam;
  }, [selectedVendor, categoryParam, itemSearchQuery, maxPriceParam, vendorCategoryParam, itemParam]);
  
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
        toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
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
        toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
    }
  };

  const handleSelfPickupDialogClose = (decision: 'yes' | 'no' | 'cancel') => {
    const { item, items, selectedOptions, quantity } = selfPickupDialogState;
    if (decision !== 'cancel') {
        const forceSelfPickup = decision === 'yes';
        if (item) {
            addToCart(item, selectedOptions, quantity, forceSelfPickup);
            toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
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

    if(currentActiveOffers.length > 0 && !sessionStorage.getItem('offerShown') && !isFilteredView) {
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
            if (a.latitude === undefined || b.latitude === undefined) return 0;
            const distA = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude);
            const distB = calculateDistanceInKm(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude);
            return distA - distB;
        });
    }
    
    return list;
  }, [vendors, userLocation]);

  const vendorsToDisplay = useMemo(() => {
    if (!vendorCategoryParam) {
        return approvedVendors;
    }
    return approvedVendors.filter(v => v.category === vendorCategoryParam);
  }, [approvedVendors, vendorCategoryParam]);

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
                const itemPrice = item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price;
                return itemPrice <= price;
            });
        }
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
  }, [menuItems, vendorsToDisplay, selectedVendor, activeTab, categoryParam, itemParam, itemSearchQuery, isFilterActive, maxPriceParam, filterMode]);

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

    const approvedVendorUsernames = new Set(approvedVendors.map(v => v.username));
    
    let items = menuItems.filter(item => {
        const ratingCount = item.ratingCount || 0;
        if (ratingCount < MIN_RATING_COUNT) return false;
        
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
                const itemPrice = item.isDiscountActive && item.discountPrice ? item.discountPrice : item.price;
                return itemPrice <= price;
            });
            return Array.from(new Set(pricedItems.map(item => item.category)));
        }
    }
    
    return [];
  }, [menuItems, selectedVendor, vendorsToDisplay, vendorCategoryParam, filterMode, maxPriceParam]);

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
  
  const filteredVendorOptions = useMemo(() => {
    const lowercasedQuery = vendorSearchQuery.toLowerCase();
    const options = vendorsToDisplay
        .filter(vendor => 
            vendor.shopName && vendor.shopName.toLowerCase().includes(lowercasedQuery)
        )
        .map(vendor => ({
            value: vendor.username,
            label: vendor.shopName!
        }));
    
    return [{ value: 'all', label: 'All Vendors' }, ...options];
  }, [vendorsToDisplay, vendorSearchQuery]);

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
  
  const handleAddToCartFromPopular = (e: React.MouseEvent, item: MenuItemType) => {
    e.preventDefault();
    e.stopPropagation();
    handleAddToCartWithDialogCheck(item, {}, 1);
  };

  const autoplayPlugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <AnimatePresence>
          {zoomedItem && (
            <ZoomedImageOverlay 
              item={zoomedItem} 
              onClose={() => setZoomedItem(null)} 
            />
          )}
      </AnimatePresence>
      <div className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <div className="space-y-6 mb-6">
              {popularPicks.length > 0 && (
                <section className="py-4 bg-amber-50 rounded-3xl mt-8">
                  <div className="flex justify-between items-center px-4">
                      <h2 className="text-xl font-bold text-center font-headline text-red-500">POPULAR PICKS</h2>
                      <Link href="/popular-picks" passHref>
                          <Button variant="link" className="text-primary pr-0">
                          See all
                          </Button>
                      </Link>
                    </div>
                    <div className="mt-4">
                      <Carousel
                          plugins={[Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })]}
                          opts={{
                            align: "start",
                            loop: true,
                            slidesToScroll: 3,
                          }}
                          className="w-full"
                      >
                          <CarouselContent className="-ml-2">
                              {popularPicks.map((item, index) => {
                                  const vendor = vendors.find(v => v.username === item.vendorUsername);
                                  return (
                                      <CarouselItem key={`${item.id}-${index}`} className="pl-2 basis-1/3 sm:basis-1/4 md:basis-1/5 lg:basis-1/6">
                                          <PopularPickItemCard
                                            item={item}
                                            vendor={vendor}
                                            onAddToCart={(item) => handleAddToCartWithDialogCheck(item, {}, 1)}
                                            onCustomise={handleOpenCustomization}
                                           />
                                      </CarouselItem>
                                  );
                              })}
                          </CarouselContent>
                          <CarouselPrevious className="ml-8 flex" />
                          <CarouselNext className="mr-8 flex" />
                      </Carousel>
                    </div>
                </section>
              )}
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
                        <Combobox
                            className="w-full md:w-auto"
                            options={filteredVendorOptions}
                            value={selectedVendor}
                            onChange={handleVendorChange}
                            onInputChange={setVendorSearchQuery}
                            placeholder="Select a vendor"
                            searchPlaceholder="Search vendors..."
                            noResultsText="No vendors found."
                            icon={<Building className="h-4 w-4" />}
                            isLoading={isFetchingItems}
                        />
                        <div className="relative w-full md:w-auto">
                        <Utensils className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Search menu..."
                            value={itemSearchQuery}
                            onChange={(e) => setItemSearchQuery(e.target.value)}
                            className="pl-9 pr-9"
                        />
                        {itemSearchQuery && (
                            <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={() => setItemSearchQuery('')}
                            >
                            <X className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        )}
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4">
                            <div className="flex items-center space-x-2">
                                <Switch
                                id="veg-only"
                                checked={filterMode === 'veg'}
                                onCheckedChange={(checked) => setFilterMode(checked ? 'veg' : 'all')}
                                className="data-[state=checked]:bg-green-500"
                                />
                                <Label htmlFor="veg-only" className="flex items-center gap-1 font-semibold text-green-600">
                                    <Leaf className="h-4 w-4"/> Veg
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch
                                id="non-veg-only"
                                checked={filterMode === 'non-veg'}
                                onCheckedChange={(checked) => setFilterMode(checked ? 'non-veg' : 'all')}
                                className="data-[state=checked]:bg-red-500"
                                />
                                <Label htmlFor="non-veg-only" className="flex items-center gap-1 font-semibold text-red-600">
                                    <Beef className="h-4 w-4"/> Non-Veg
                                </Label>
                            </div>
                        </div>
                    </div>
                </div>
                 {isFilterActive && (
                    <div className="flex justify-center mt-2">
                        <Button
                            variant="outline"
                            onClick={handleClearFilters}
                            className="rounded-full text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                        >
                            <ArrowLeft className="h-4 w-4 mr-1"/>
                            Back to All Menu
                        </Button>
                    </div>
                )}
            </div>
            
            <div className="space-y-6">
            {showCategoryGrid ? (
              <div>
                <section className="mb-2">
                    <div className="flex justify-center mb-4">
                        <div className="bg-primary/10 rounded-full px-4 py-2 inline-flex items-center gap-3">
                            <Sparkles className="h-5 w-5 text-primary animate-pulse-glow" />
                            <h2 className="text-xl font-bold font-headline text-primary">
                                Explore by Category
                            </h2>
                        </div>
                    </div>
                  {isFetchingItems ? (
                    <div className="text-center py-8"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
                  ) : (
                    <div className="w-full overflow-x-auto hide-scrollbar group pb-4">
                      <div className="flex w-max animate-scroll hover:animation-pause">
                        {filteredGlobalCategories.map((category, index) => (
                          <Link
                              key={`${category.id}-${index}`}
                              href={`/menu?category=${encodeURIComponent(category.name)}`}
                              className="flex flex-col items-center gap-2 group/item flex-shrink-0 w-24 mx-2"
                          >
                              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-md border-2 border-primary/20 group-hover/item:scale-105 transition-transform duration-300">
                              <Image
                                  src={category.imageUrl || 'https://placehold.co/100x100.png'}
                                  alt={category.name}
                                  layout="fill"
                                  className="object-cover"
                                  placeholder={category.blurDataUrl ? 'blur' : 'empty'}
                                  blurDataURL={category.blurDataUrl}
                              />
                              </div>
                              <p className="text-xs text-center font-semibold">{category.name}</p>
                          </Link>
                        ))}
                        {/* Duplicate for seamless loop */}
                        {filteredGlobalCategories.map((category, index) => (
                          <Link
                              key={`${category.id}-clone-${index}`}
                              href={`/menu?category=${encodeURIComponent(category.name)}`}
                              className="flex flex-col items-center gap-2 group/item flex-shrink-0 w-24 mx-2"
                              aria-hidden="true"
                          >
                              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-md border-2 border-primary/20 group-hover/item:scale-105 transition-transform duration-300">
                              <Image
                                  src={category.imageUrl || 'https://placehold.co/100x100.png'}
                                  alt={category.name}
                                  layout="fill"
                                  className="object-cover"
                                  placeholder={category.blurDataUrl ? 'blur' : 'empty'}
                                  blurDataURL={category.blurDataUrl}
                              />
                              </div>
                              <p className="text-xs text-center font-semibold">{category.name}</p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                <section className="mt-4">
                     <div className="flex justify-center mb-4">
                        <div className="bg-amber-500/10 rounded-full px-4 py-2 inline-flex items-center gap-3">
                            <Star className="h-5 w-5 text-amber-500"/>
                            <h2 className="text-xl font-bold font-headline text-amber-500">
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
                                )})}
                            </CarouselContent>
                            <CarouselPrevious className="ml-8 flex" />
                            <CarouselNext className="mr-8 flex" />
                        </Carousel>
                    ) : (
                        <p className="text-center text-sm text-muted-foreground">No highly rated dishes yet. Be the first to rate!</p>
                    )}
                </section>
                
                {discountedItems.length > 0 && (
                    <section className="mt-12">
                         <div className="flex justify-center mb-6">
                            <div className="bg-destructive/10 rounded-full px-4 py-2 inline-flex items-center gap-3">
                                <Tag className="h-5 w-5 text-destructive" />
                                <h2 className="text-xl font-bold font-headline text-destructive">
                                    Deals &amp; Discounts
                                </h2>
                            </div>
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
            ) : menuItemsToDisplay.length > 0 ? (
                <>
                    {categoriesToShow.length > 0 ? (
                    <div className="sticky top-[65px] bg-background/90 backdrop-blur-sm z-40 py-2 -mx-2 px-2">
                        {activeTab !== 'all' ? (
                            <div>
                                <TabsList className="bg-transparent p-0">
                                    <TabsTrigger value="all" className="rounded-full data-[state=active]:shadow-sm data-[state=active]:bg-background shrink-0">All</TabsTrigger>
                                    <TabsTrigger value={activeTab} className="rounded-full data-[state=active]:shadow-sm data-[state=active]:bg-background shrink-0">{activeTab}</TabsTrigger>
                                </TabsList>
                            </div>
                        ) : (
                             <div className="w-full overflow-x-auto hide-scrollbar group">
                                <div className="flex w-max animate-scroll hover:animation-pause">
                                    <TabsList className="bg-transparent p-0">
                                        <TabsTrigger value="all" className="rounded-full data-[state=active]:shadow-sm data-[state=active]:bg-background shrink-0">All</TabsTrigger>
                                        {categoriesToShow.map((catName: string) => (
                                            <TabsTrigger key={`${catName}-1`} value={catName} className="rounded-full data-[state=active]:shadow-sm data-[state=active]:bg-background shrink-0">
                                                {catName}
                                            </TabsTrigger>
                                        ))}
                                        {/* Duplicates for seamless loop */}
                                        <TabsTrigger value="all" className="rounded-full data-[state=active]:shadow-sm data-[state=active]:bg-background shrink-0" aria-hidden="true">All</TabsTrigger>
                                        {categoriesToShow.map((catName: string) => (
                                            <TabsTrigger key={`${catName}-2`} value={catName} className="rounded-full data-[state=active]:shadow-sm data-[state=active]:bg-background shrink-0" aria-hidden="true">
                                                {catName}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>
                            </div>
                        )}
                    </div>
                ) : null}
                    <div className="mt-4">
                      {renderMenuItems()}
                    </div>
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
                    <Bike className="h-10 w-10 text-primary mb-2"/>
                    <h3 className="font-semibold text-center">Request Delivery</h3>
                    <p className="text-xs text-muted-foreground text-center">A minimum order of ₹{vendorForDialog?.minOrderAmount || 0} is required.</p>
                </div>
                 <div 
                    className="flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-green-500/5 hover:border-green-500 transition-all"
                    onClick={() => handleSelfPickupDialogClose('yes')}
                 >
                    <Hand className="h-10 w-10 text-green-500 mb-2"/>
                    <h3 className="font-semibold text-center">I'll Pick It Up</h3>
                    <p className="text-xs text-muted-foreground text-center">No minimum order amount applies.</p>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
);
}

'use client';

import { useState, useMemo, useCallback } from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Loader2, Minus, Plus, ShoppingCart, Tag, Bike, Hand } from 'lucide-react';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import type { MenuItem, Vendor } from '@/types';
import { useCart } from '@/context/cart-context';
import { useToast } from '@/hooks/use-toast';
import OrderCustomizationSheet from '@/components/order-customization-sheet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';

const PopularPickItemCard = ({
  item,
  vendor,
  onCustomize,
  onAddToCart,
}: {
  item: MenuItem;
  vendor?: Vendor | null;
  onCustomize: (item: MenuItem) => void;
  onAddToCart: (item: MenuItem) => void;
}) => {
  const { cartItems, updateCartItemQuantity } = useCart();

  const handleQuantityChange = (change: number) => {
    const itemInCart = cartItems.find(i => i.id === item.id && Object.keys(i.customizationDetails).length === 0);
    if (!itemInCart) return;
    const newQuantity = itemInCart.quantity + change;
    updateCartItemQuantity(itemInCart.cartItemId, newQuantity);
  };
  
  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.customizations && item.customizations.length > 0) {
      onCustomize(item);
    } else {
      onAddToCart(item);
    }
  };

  const hasDiscount = item.isDiscountActive && item.discountPrice && item.discountPrice > 0;
  const simpleCartItem = cartItems.find(i => i.id === item.id && Object.keys(i.customizationDetails).length === 0);
  const simpleQuantityInCart = simpleCartItem ? simpleCartItem.quantity : 0;
  
  const getItemUrl = (item: MenuItem) => {
    const vendorIdentifier = vendor?.slug || item.vendorUsername;
    return `/menu?vendor=${vendorIdentifier}&item=${item.id}`;
  };

  const hasMandatoryVariants = item.customizations?.some(c => Number(c.minSelect) > 0) ?? false;
  const isEffectivelyInStock = isItemInStock(item, vendor?.isInventory);
  const shopStatus = useMemo(() => {
    return vendor ? VendorStatusManager.getShopStatus(vendor) : null;
  }, [vendor]);

  const isShopOpen = !shopStatus || shopStatus.status === VendorStatus.OPEN;
  const isEffectivelyAvailable = item.isAvailable && isShopOpen && isEffectivelyInStock;

  return (
    <div className="w-40 h-full">
      <Link href={getItemUrl(item)} passHref>
        <Card className={cn("flex flex-col overflow-hidden rounded-2xl h-full", !isEffectivelyAvailable && "opacity-60 grayscale")}>
          <div className="aspect-video relative">
            <Image
              src={item.image}
              alt={item.name}
              layout="fill"
              className="object-cover"
              placeholder={item.blurDataUrl ? 'blur' : 'empty'}
              blurDataURL={item.blurDataUrl}
            />
            {hasDiscount && (
               <div className="absolute top-2 right-2 z-10 bg-destructive text-destructive-foreground rounded-full px-2 py-1 text-[10px] font-bold flex items-center justify-center">
                <Tag className="h-3 w-3 mr-1" />
                <span>{Math.round(((item.price - item.discountPrice!) / item.price) * 100)}% OFF</span>
              </div>
            )}
             {!isEffectivelyAvailable && (
                <div className="absolute inset-0 bg-background/70 flex items-center justify-center p-2">
                    <p className="text-foreground font-semibold text-sm text-center">
                        {!isShopOpen ? (shopStatus?.msg || 'Closed') : (!isEffectivelyInStock ? 'Out of Stock' : 'Unavailable')}
                    </p>
                </div>
            )}
          </div>
          <CardContent className="p-2 flex-1 flex flex-col">
            <div className="flex-1">
              <h3 className="font-semibold text-sm leading-tight">{item.name}</h3>
               {!hasMandatoryVariants && item.stock !== undefined && item.stock > 0 && (vendor?.category === 'Bakery' || item.stock <= 5) && (
                  <p className="text-xs text-destructive font-semibold mt-1">{item.stock} available</p>
              )}
            </div>
            <div className="flex justify-between items-end mt-2">
               <p className="text-sm">
                  {hasDiscount ? (
                      <span className="flex items-baseline gap-1">
                          <span className="font-semibold text-foreground text-sm">₹{item.discountPrice?.toFixed(2)}</span>
                          <span className="text-xs text-muted-foreground line-through">₹{item.price.toFixed(2)}</span>
                      </span>
                  ) : (
                      <span className="font-semibold text-sm">₹{item.price.toFixed(2)}</span>
                  )}
               </p>
               {simpleQuantityInCart === 0 || (item.customizations && item.customizations.length > 0) ? (
                  <Button size="sm" onClick={handleAddClick} className="h-7 text-xs px-2" disabled={!isEffectivelyAvailable}>
                    {item.customizations && item.customizations.length > 0 ? 'Customize' : 'Add'}
                  </Button>
                ) : (
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleQuantityChange(-1)}}><Minus className="h-3 w-3" /></Button>
                    <span className="font-bold w-4 text-center text-sm">{simpleQuantityInCart}</span>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleQuantityChange(1)}}><Plus className="h-3 w-3" /></Button>
                  </div>
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
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const { addToCart, cartItems } = useCart();
  const { toast } = useToast();
  
  const [selfPickupDialogState, setSelfPickupDialogState] = useState<{ open: boolean; item: MenuItem | null; selectedOptions: Record<string, string[]>; quantity: number; }>({ open: false, item: null, selectedOptions: {}, quantity: 1 });

  const popularPicks = useMemo(() => {
    return menuItems.filter(item => item.isPopular && isItemInStock(item, vendors.find(v => v.username === item.vendorUsername)?.isInventory));
  }, [menuItems]);
  
  const popularPicksByVendor = useMemo(() => {
    return popularPicks.reduce((acc, item) => {
      if (!acc[item.vendorUsername]) {
        acc[item.vendorUsername] = [];
      }
      acc[item.vendorUsername].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>);
  }, [popularPicks]);

  const handleCustomize = useCallback((item: MenuItem) => {
    setSelectedItem(item);
  }, []);

  const handleCloseCustomization = useCallback((open: boolean) => {
    if (!open) {
      setSelectedItem(null);
    }
  }, []);

  const handleAddToCartWithDialogCheck = (item: MenuItem, selectedOptions = {}, quantity = 1, forceSelfPickup?: boolean) => {
    if (forceSelfPickup !== undefined) {
        addToCart(item, selectedOptions, quantity, forceSelfPickup);
        toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
        return;
    }
    const vendor = vendors.find(v => v.username === item.vendorUsername);
    // Check if the vendor for the item being added is "Self Pickup Only"
    const isSelfPickupVendor = vendor?.deliveryType === 'Self Pickup Only';
    
    // Check if this is the first item from this specific vendor
    const isFirstItemFromThisVendor = cartItems.every(cartItem => cartItem.vendorUsername !== item.vendorUsername);
    const isCartEmpty = cartItems.length === 0;

    // Trigger dialog if:
    // 1. The vendor is self-pickup only AND
    // 2. Either the cart is completely empty OR it's the first time adding an item from this specific vendor
    if (isSelfPickupVendor && (isCartEmpty || isFirstItemFromThisVendor)) {
        setSelfPickupDialogState({ open: true, item, selectedOptions, quantity });
    } else {
        addToCart(item, selectedOptions, quantity);
        toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
    }
  };

  const handleSelfPickupDialogClose = (decision: 'yes' | 'no' | 'cancel') => {
    const { item, selectedOptions, quantity } = selfPickupDialogState;
    if (decision !== 'cancel' && item) {
        const forceSelfPickup = decision === 'yes';
        addToCart(item, selectedOptions, quantity, forceSelfPickup);
        toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.` });
    }
    setSelfPickupDialogState({ open: false, item: null, selectedOptions: {}, quantity: 1 });
  };


  if (isFetchingItems) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold font-headline text-primary">Popular Picks</h1>
            <Button asChild variant="outline">
                <Link href="/">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </Button>
        </div>

        {Object.keys(popularPicksByVendor).length > 0 ? (
          <div className="space-y-12">
            {Object.entries(popularPicksByVendor).map(([vendorUsername, items]) => {
              const vendor = vendors.find((v) => v.username === vendorUsername);
              if (!vendor) return null;
              const shopStatus = VendorStatusManager.getShopStatus(vendor);
              if (shopStatus.status !== VendorStatus.OPEN) return null;
              const extendedItems = [...items, ...items]; // Duplicate for seamless scroll
              return (
                <section key={vendorUsername}>
                  <h2 className="text-2xl font-bold mb-4 text-destructive">{vendor?.shopName || 'Unknown Vendor'}</h2>
                  <div className="w-full overflow-x-auto hide-scrollbar group">
                    <div className="flex w-max animate-scroll hover:animation-pause">
                      {extendedItems.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="mx-2 flex-shrink-0">
                          <PopularPickItemCard
                            item={item}
                            vendor={vendor}
                            onCustomize={handleCustomize}
                            onAddToCart={(item) => handleAddToCartWithDialogCheck(item, {}, 1)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Popular Picks Available</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Check back later for our top-rated items!
            </p>
          </div>
        )}
      </main>
      <OrderCustomizationSheet
        item={selectedItem}
        open={!!selectedItem}
        onOpenChange={handleCloseCustomization}
      />
    </div>
    <Dialog open={selfPickupDialogState.open} onOpenChange={(open) => !open && handleSelfPickupDialogClose('cancel')}>
        <DialogContent className="sm:max-w-md sm:rounded-2xl">
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl text-center">{selfPickupDialogState.item?.shopName} offers Self-Pickup only</DialogTitle>
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
                    <h3 className="font-semibold">Request Delivery</h3>
                    <p className="text-xs text-muted-foreground text-center">A minimum order of ₹{vendors.find(v => v.username === selfPickupDialogState.item?.vendorUsername)?.minOrderAmount || 0} is required.</p>
                </div>
                 <div 
                    className="flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-green-500/5 hover:border-green-500 transition-all"
                    onClick={() => handleSelfPickupDialogClose('yes')}
                 >
                    <Hand className="h-10 w-10 text-green-500 mb-2"/>
                    <h3 className="font-semibold">I'll Pick It Up</h3>
                    <p className="text-xs text-muted-foreground text-center">No minimum order amount applies.</p>
                </div>
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}

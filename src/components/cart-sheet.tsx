
'use client';

import { useCart } from '@/context/cart-context';
import { useOrder } from '@/context/order-context';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from './ui/scroll-area';
import Image from 'next/image';
import { Separator } from './ui/separator';
import { Trash2, Rocket, Plus, Minus, Info, Building, Bike, Home, MessageSquare, Award, ChevronDown, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useCustomer } from '@/context/customer-context';
import { useAppContext } from '@/app/layout';
import { useMemo, useState, useEffect, useTransition } from 'react';
import { cn } from '@/lib/utils';
import type { DeliveryOption, PaymentMethod } from '@/types';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { motion } from 'framer-motion';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from './ui/checkbox';


interface CartSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartSheet({ open, onOpenChange }: CartSheetProps) {
  const { 
    vendorCarts,
    removeFromCart, 
    updateCartItemQuantity, 
    totalItems, 
    totalPrice, 
    clearCart, 
    customNotes, 
    setCustomNotes,
    potentialPoints,
    redemptionDetails,
    applyPoints,
    setApplyPoints,
    setVendorDeliveryOption,
    getVendorDeliveryOption,
    canCheckout,
    deliveryConfig,
  } = useCart();
  const { addOrder } = useOrder();
  const { customer } = useCustomer();
  const router = useRouter();
  const { toast } = useToast();
  const { showOrderPlacedDialog } = useAppContext();
  const [isPlacingOrder, startTransition] = useTransition();
  
  const totalDeliveryCharge = useMemo(() => {
    return vendorCarts.reduce((sum, vc) => sum + (vc.deliveryCharge || 0), 0);
  }, [vendorCarts]);

  const finalPrice = totalPrice + totalDeliveryCharge - (redemptionDetails?.discountAmount || 0);
  
  useEffect(() => {
    if (open && totalItems === 0) {
      onOpenChange(false);
    }
  }, [totalItems, open, onOpenChange]);
  
  const handleProceedToCheckout = () => {
    if(!customer) {
      toast({
        title: "Please Login",
        description: "You need to login before placing an order.",
        variant: "destructive",
      });
      onOpenChange(false);
      router.push('/customer-login');
      return;
    }

    if (!customer.address || !customer.contact || !customer.termsAccepted || !customer.latitude || !customer.longitude) {
      toast({
        title: "Please Complete Your Profile",
        description: "You need to add your details before placing an order.",
        variant: "destructive",
      });
      onOpenChange(false);
      router.push('/customer-details');
      return;
    }

    onOpenChange(false);
    router.push('/checkout');
  }

  const handleQuantityChange = (cartItemId: string, change: number) => {
    const item = vendorCarts.flatMap(vc => vc.items).find(i => i.cartItemId === cartItemId);
    if (!item) return;
    const newQuantity = item.quantity + change;
    updateCartItemQuantity(cartItemId, newQuantity);
  }
  
  const handleNoteChange = (vendorUsername: string, note: string) => {
      setCustomNotes(prev => ({
          ...prev,
          [vendorUsername]: note,
      }));
  };
  
  const showRedemptionOption = useMemo(() => {
    if (!customer || vendorCarts.length !== 1) return false;
    const vendor = vendorCarts[0].vendor;
    if (!vendor.isRewardsEnabled) return false;
    
    const availablePoints = (customer.hyperPoints?.[vendor.username] || 0) - (customer.lockedPoints?.[vendor.username] || 0);
    return availablePoints >= 100;
  }, [customer, vendorCarts]);
  
  const hasHomeDelivery = useMemo(() => {
    return vendorCarts.some(vc => vc.deliveryOption === 'Home Delivery');
  }, [vendorCarts]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col rounded-l-3xl">
        <SheetHeader className="p-4 border-b">
             <div className="flex items-center justify-between">
                 <SheetTitle className="font-headline text-2xl">Your Order</SheetTitle>
            </div>
             {totalItems > 0 && (
                <SheetDescription className="text-left mt-2">
                    You have {totalItems} {totalItems === 1 ? 'item' : 'items'} from {vendorCarts.length} vendor{vendorCarts.length > 1 ? 's' : ''} in your cart.
                </SheetDescription>
            )}
        </SheetHeader>
        
        {totalItems > 0 ? (
          <div className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
                <div className="space-y-4 p-4">
                    {vendorCarts.map(vc => (
                        <div key={vc.vendor.username} className="space-y-2 pb-4 border-b last:border-b-0">
                        <div className="flex items-center justify-between gap-2 border-b border-primary/5 pb-2">
                            <h3 className="font-semibold flex items-center gap-2 truncate">
                                <Building className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                                <span className="truncate">{vc.vendor.shopName || vc.vendor.name}</span>
                            </h3>
                            <div className="flex rounded-full bg-muted p-0.5 border flex-shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setVendorDeliveryOption(vc.vendor.username, 'Home Delivery')}
                                    className={cn(
                                        "text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-all duration-200",
                                        vc.deliveryOption === 'Home Delivery'
                                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Bike className="h-3 w-3"/> Delivery
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVendorDeliveryOption(vc.vendor.username, 'Self Pickup')}
                                    className={cn(
                                        "text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1 transition-all duration-200",
                                        vc.deliveryOption === 'Self Pickup'
                                            ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Home className="h-3 w-3"/> Pickup
                                </button>
                            </div>
                        </div>
                        {vc.deliveryOption === 'Home Delivery' && (
                            <div className="flex flex-col gap-1 px-1 py-1 bg-muted/30 rounded-xl my-1">
                                <div className="flex justify-between items-center text-[10px] text-muted-foreground px-2">
                                    <span>Distance: {vc.deliveryDistanceKm ? `${vc.deliveryDistanceKm.toFixed(2)} km` : '0.00 km'}</span>
                                    <span>Delivery Fee: ₹{vc.deliveryCharge || 0}</span>
                                </div>
                                {vc.isOutOfRange && (
                                    <div className="text-center text-[10px] p-1.5 rounded-lg flex items-center justify-center gap-1 text-destructive bg-destructive/10 font-semibold mx-1">
                                        <Info className="h-3.5 w-3.5 flex-shrink-0" />
                                        <span>Out of Delivery Range ({vc.deliveryDistanceKm?.toFixed(1)} km)</span>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {vc.items.map(item => (
                            <div key={item.cartItemId} className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-3">
                                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold leading-tight">{item.name}</h4>
                                    <p className="text-[10px] text-muted-foreground leading-tight">
                                        {Object.entries(item.customizationDetails).map(([custId, value]) => {
                                        const cust = item.customizations?.find(c => c.id === custId);
                                        if (!cust) return null;
                                        const selectedOptions = (Array.isArray(value) ? value : [value]).map(optId => cust.options.find(o => o.id === optId)?.name).filter(Boolean);
                                        return selectedOptions.join(', ');
                                        }).filter(Boolean).join(' • ')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleQuantityChange(item.cartItemId, -1)}><Minus className="h-3 w-3"/></Button>
                                <span className="font-bold w-4 text-center text-xs">{item.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleQuantityChange(item.cartItemId, 1)}><Plus className="h-3 w-3"/></Button>
                            </div>
                            <p className="font-semibold text-xs w-14 text-right">₹{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                        ))}
                         <div className="flex justify-between items-center gap-2 mt-2">
                           <Collapsible>
                                <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-muted-foreground flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3"/> Add instructions <ChevronDown className="h-3 w-3"/>
                                </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                <Textarea
                                        id={`notes-${vc.vendor.username}`}
                                        placeholder="e.g. Please make it less spicy"
                                        value={customNotes[vc.vendor.username] || ''}
                                        onChange={(e) => handleNoteChange(vc.vendor.username, e.target.value)}
                                        rows={2}
                                        className="mt-1"
                                    />
                                </CollapsibleContent>
                            </Collapsible>
                             <div className="flex justify-end items-center gap-2">
                                {!vc.isMinOrderMet && (
                                <div className="text-center text-[10px] p-1.5 rounded-full flex items-center justify-center gap-1 text-destructive bg-red-500/10">
                                  <Info className="h-3 w-3" />
                                  <span>
                                    Min. order ₹{vc.vendor.minOrderAmount!.toFixed(0)}
                                  </span>
                                </div>
                               )}
                           </div>
                        </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
            <SheetFooter className="p-4 bg-card border-t sticky bottom-0">
                <div className="w-full space-y-4">
                    <div className="space-y-1 font-medium">
                        
                        <Separator className="my-2"/>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-muted-foreground">Subtotal</span>
                             <div className="flex items-center justify-center gap-2">
                                {showRedemptionOption && (
                                     <div
                                        className="text-white font-bold px-2 py-1 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                                    >
                                        <div className="flex items-center gap-1">
                                            <Checkbox
                                                id="apply-points"
                                                checked={applyPoints}
                                                onCheckedChange={(checked) => setApplyPoints(!!checked)}
                                                className="rounded-full h-3 w-3 border-white"
                                            />
                                            <label htmlFor="apply-points" className="cursor-pointer text-white text-[10px]">
                                                Apply {redemptionDetails.pointsToRedeem} points
                                            </label>
                                        </div>
                                    </div>
                                )}
                                <span>₹{totalPrice.toFixed(2)}</span>
                            </div>
                        </div>

                        {totalDeliveryCharge > 0 && (
                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                <span>Delivery Charges</span>
                                <span>₹{totalDeliveryCharge.toFixed(2)}</span>
                            </div>
                        )}

                        {redemptionDetails?.canRedeem && (
                            <motion.div
                                initial={{ opacity: 0, x: 10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex justify-between items-center text-sm text-destructive"
                            >
                                <span>Discount</span>
                                <span>- ₹{redemptionDetails.discountAmount.toFixed(2)}</span>
                            </motion.div>
                        )}

                        <Separator className="my-2"/>
                        <div className="flex justify-between items-center font-bold text-lg">
                            <span>Grand Total</span>
                            <span className="text-foreground">₹{finalPrice.toFixed(2)}</span>
                        </div>

                        {potentialPoints > 0 && !redemptionDetails?.canRedeem && (
                            <div className="flex justify-center items-center gap-2 text-xs text-green-600 dark:text-green-400 pt-1">
                                <Award className="h-4 w-4" />
                                <span>You will earn ~{potentialPoints} HyperPoints on this order.</span>
                            </div>
                        )}
                    </div>

                    <Button size="lg" className="w-full text-white bg-purple-600 hover:bg-purple-700" onClick={handleProceedToCheckout} disabled={!canCheckout}>
                        <Rocket className="mr-2 h-5 w-5" />
                        Proceed to Checkout
                    </Button>
                </div>
            </SheetFooter>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

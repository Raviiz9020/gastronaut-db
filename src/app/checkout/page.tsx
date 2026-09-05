'use client';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { 
    CreditCard, Rocket, ShieldCheck, Home, Bike, Wallet, AlertTriangle, 
    CheckCircle2, Loader2, Sparkles, MapPin, Edit3, Lock, Users, Briefcase, Building, Plus, Check, ArrowLeft 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/context/cart-context';
import { useOrder } from '@/context/order-context';
import { useCustomer } from '@/context/customer-context';
import { useLocation } from '@/context/location-context';
import { useAppContext } from '@/app/layout';
import { useState, useMemo, useEffect } from 'react';
import type { DeliveryOption, Vendor, SavedAddress, Customer } from '@/types';
import { cn, createSlug } from '@/lib/utils';
import { useVendor } from '@/context/vendor-context';
import { calculateFeeSavings } from '@/lib/savings-utils';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapLocationPickerDialog } from '@/components/map-location-picker-dialog';

const getTagIcon = (tag?: string) => {
    switch (tag) {
        case 'Home': return Home;
        case 'Parents': return Users;
        case 'Work': return Briefcase;
        default: return Building;
    }
};

export default function CheckoutPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { cartItems, totalPrice, clearCart, vendorCarts, customNotes, setVendorDeliveryOption, deliveryConfig, redemptionDetails } = useCart();
    const { vendors } = useVendor();
    const { addOrder } = useOrder();
    const { customer } = useCustomer();
    const { userLocation, selectSavedAddress } = useLocation();
    const { showOrderPlacedDialog } = useAppContext();

    const [isAddressSwitchDialogOpen, setIsAddressSwitchDialogOpen] = useState(false);
    const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

    const getVendorMenuUrl = (vendor?: Vendor | null) => {
        if (!vendor) return '/menu';
        const identifier = vendor.slug || (vendor.shopName ? createSlug(vendor.shopName) : vendor.username);
        return `/menu?vendor=${identifier}`;
    };

    const [paymentMethod, setPaymentMethod] = useState<'PAY_NOW' | 'COD'>('PAY_NOW');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [paymentProcessingState, setPaymentProcessingState] = useState<{
        isActive: boolean;
        message: string;
    }>({
        isActive: false,
        message: ''
    });

    // Load Razorpay Checkout Script dynamically
    useEffect(() => {
        const scriptId = 'razorpay-checkout-script';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);
        }
    }, []);

    // Redirect to login or details if profile is incomplete
    useEffect(() => {
        if (!customer) {
            router.replace('/customer-login');
            return;
        }
        if (!customer.address || !customer.contact || !customer.latitude || !customer.longitude) {
            toast({
                title: "Complete Your Profile",
                description: "Please set your address and GPS location before checking out.",
                variant: "destructive"
            });
            router.replace('/customer-details?redirect=/checkout');
        }
    }, [customer, router, toast]);

    // Active Saved Delivery Address Resolution
    const activeAddress = useMemo<SavedAddress | null>(() => {
        if (!customer) return null;
        
        // 1. Try to match from Location Context address ID
        if (userLocation?.addressId && customer.savedAddresses) {
            const matchedById = customer.savedAddresses.find(a => a.id === userLocation.addressId);
            if (matchedById) return matchedById;
        }

        // 2. Try to match by close coordinates
        if (userLocation?.latitude && userLocation?.longitude && customer.savedAddresses) {
            const matchedByCoords = customer.savedAddresses.find(a =>
                Math.abs(a.latitude - userLocation.latitude) < 0.0005 &&
                Math.abs(a.longitude - userLocation.longitude) < 0.0005
            );
            if (matchedByCoords) return matchedByCoords;
        }

        // 3. Match default address
        const defaultAddr = customer.savedAddresses?.find(a => a.isDefault || a.id === customer.defaultAddressId);
        if (defaultAddr) return defaultAddr;

        // 4. First saved address
        if (customer.savedAddresses && customer.savedAddresses.length > 0) {
            return customer.savedAddresses[0];
        }

        // 5. Fallback to customer profile
        if (customer.address && customer.latitude && customer.longitude) {
            return {
                id: 'addr_default_home',
                tag: 'Home',
                label: 'Home',
                address: customer.address,
                areaLocality: '',
                latitude: customer.latitude,
                longitude: customer.longitude,
                recipientName: customer.name,
                recipientContact: customer.contact,
                isDefault: true,
                hasCompletedOrder: true,
                createdAt: customer.createdAt || new Date().toISOString()
            };
        }

        return null;
    }, [customer, userLocation]);

    const canCheckout = useMemo(() => {
        if (vendorCarts.length === 0) return false;
        return vendorCarts.every(vc => vc.isMinOrderMet && !vc.isOutOfRange);
    }, [vendorCarts]);

    // 1. Check if all carts are Home Delivery
    const isAllHomeDelivery = useMemo(() => {
        if (vendorCarts.length === 0) return false;
        return vendorCarts.every(vc => vc.deliveryOption === 'Home Delivery');
    }, [vendorCarts]);

    // 2. COD Security Lock: Must have completed at least one order on this address (or hasCompletedOrder !== false)
    const isAddressCodEligible = useMemo(() => {
        if (!activeAddress) return false;
        return activeAddress.hasCompletedOrder !== false;
    }, [activeAddress]);

    const isCodAllowed = isAllHomeDelivery && isAddressCodEligible;

    // Auto-fallback: Switch from COD to PAY_NOW if COD is not allowed
    useEffect(() => {
        if (!isCodAllowed && paymentMethod === 'COD') {
            setPaymentMethod('PAY_NOW');
        }
    }, [isCodAllowed, paymentMethod]);

    const totalDeliveryCharge = useMemo(() => {
        return vendorCarts.reduce((sum, vc) => sum + (vc.deliveryCharge || 0), 0);
    }, [vendorCarts]);

    const PLATFORM_FEE = 5.0;
    const baseAmount = totalPrice + totalDeliveryCharge - (redemptionDetails?.discountAmount || 0);

    // Customer grand total includes flat ₹5 platform fee
    const finalPrice = baseAmount > 0 ? parseFloat((baseAmount + PLATFORM_FEE).toFixed(2)) : 0;

    // Internal Razorpay PG Fee calculation (2.36%) for backend verification & admin tracking
    const gatewayFee = useMemo(() => {
        if (paymentMethod !== 'PAY_NOW' || finalPrice <= 0) return 0;
        return parseFloat((finalPrice * 0.0236).toFixed(2));
    }, [paymentMethod, finalPrice]);

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customer) return;

        if (cartItems.length === 0) {
            toast({ title: "Your cart is empty!", variant: "destructive" });
            return;
        }

        if (paymentMethod === 'COD' && !isCodAllowed) {
            toast({
                title: "Cash on Delivery Unavailable",
                description: !isAllHomeDelivery
                    ? "Cash on Delivery is only available for Home Delivery orders."
                    : "For security, Cash on Delivery unlocks after your first completed prepaid order at this address.",
                variant: "destructive"
            });
            return;
        }

        const closedVendorCart = vendorCarts.find(vc => vc.isShopOpen === false);
        if (closedVendorCart) {
            toast({
                title: "Vendor is Currently Closed",
                description: `${closedVendorCart.vendor.shopName || closedVendorCart.vendor.name || 'A vendor'} is currently closed (${closedVendorCart.shopStatusMsg || 'Closed'}). Please remove items from this vendor to proceed.`,
                variant: "destructive"
            });
            return;
        }

        if (!canCheckout) {
            toast({
                title: "Cannot Checkout",
                description: `Please verify delivery ranges and minimum orders.`,
                variant: "destructive"
            });
            return;
        }

        try {
            setIsPlacingOrder(true);

            const deliveryOptions = vendorCarts.reduce((acc, vc) => {
                acc[vc.vendor.username] = vc.deliveryOption;
                return acc;
            }, {} as Record<string, DeliveryOption>);

            // Construct Snapshot with active delivery address coordinates & recipient info
            const customerSnapshot: Customer = {
                ...customer,
                address: activeAddress?.address || customer.address,
                latitude: activeAddress?.latitude || customer.latitude,
                longitude: activeAddress?.longitude || customer.longitude,
                name: activeAddress?.recipientName || customer.name,
                contact: activeAddress?.recipientContact || customer.contact,
            };

            // 1. If Cash on Delivery, place order in Firestore immediately
            if (paymentMethod === 'COD') {
                await addOrder({
                    cartItems,
                    customer: customerSnapshot,
                    allVendors: vendors,
                    paymentMethod: 'COD',
                    deliveryOptions,
                    customNotes,
                    redemption: redemptionDetails
                });

                clearCart();
                showOrderPlacedDialog();
                router.push('/track');
                return;
            }

            // 2. Online Payment: Call Cloud Function FIRST (do NOT create order yet)
            const createOrderUrl = process.env.NEXT_PUBLIC_CREATE_ORDER_URL || 'https://createrazorpayorder-fxqfekas3a-uc.a.run.app';
            const verifyPaymentUrl = process.env.NEXT_PUBLIC_VERIFY_PAYMENT_URL || 'https://verifyrazorpaypayment-fxqfekas3a-uc.a.run.app';
            const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_ID';
            const tempReceipt = `rcpt_${Date.now()}`;

            const createRes = await fetch(createOrderUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalPrice,
                    currency: 'INR',
                    receipt: tempReceipt,
                    customerUsername: customer.username,
                    customerEmail: customer.email || `${customer.username}@hyperplate.app`
                })
            });

            if (!createRes.ok) {
                const errData = await createRes.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to initialize payment gateway.');
            }

            const razorpayOrder = await createRes.json();
            const { orderId: rzpOrderId, amount: rzpAmount, keyId: rzpKeyId } = razorpayOrder;

            // 3. Open Razorpay Modal
            const options = {
                key: rzpKeyId || razorpayKeyId,
                amount: rzpAmount,
                currency: 'INR',
                name: 'HyperDelivery',
                description: `Order Payment (${cartItems.length} items)`,
                order_id: rzpOrderId,
                prefill: {
                    name: customerSnapshot.name || 'Valued Customer',
                    contact: customerSnapshot.contact || '',
                    email: customerSnapshot.email || ''
                },
                theme: {
                    color: '#7c3aed'
                },
                handler: async function (response: any) {
                    try {
                        setPaymentProcessingState({
                            isActive: true,
                            message: 'Payment received! Creating your order...'
                        });

                        const verifyRes = await fetch(verifyPaymentUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                expectedAmount: finalPrice,
                                customerUsername: customer.username
                            })
                        });

                        if (!verifyRes.ok) {
                            const errData = await verifyRes.json().catch(() => ({}));
                            throw new Error(errData.error || 'Payment signature verification failed.');
                        }

                        setPaymentProcessingState({
                            isActive: true,
                            message: 'Order confirmed! Taking you to tracking...'
                        });

                        // 4. Create Order only AFTER successful signature verification
                        await addOrder({
                            cartItems,
                            customer: customerSnapshot,
                            allVendors: vendors,
                            paymentMethod: 'Pay Now',
                            deliveryOptions,
                            customNotes,
                            paymentDetails: {
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                status: 'Success',
                                gatewayFee: gatewayFee
                            },
                            redemption: redemptionDetails
                        });

                        clearCart();
                        setPaymentProcessingState({ isActive: false, message: '' });
                        showOrderPlacedDialog();
                        router.push('/track');

                    } catch (verifyErr: any) {
                        console.error('Payment verification error:', verifyErr);
                        setPaymentProcessingState({ isActive: false, message: '' });
                        setIsPlacingOrder(false);
                        toast({
                            title: 'Payment Verification Failed',
                            description: verifyErr.message || 'We could not verify your payment. If money was debited, it will be refunded automatically.',
                            variant: 'destructive'
                        });
                    }
                },
                modal: {
                    ondismiss: function () {
                        setIsPlacingOrder(false);
                        setPaymentProcessingState({ isActive: false, message: '' });
                        toast({
                            title: 'Payment Cancelled',
                            description: 'You cancelled the payment. Your cart items are safe.',
                        });
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (response: any) {
                setIsPlacingOrder(false);
                setPaymentProcessingState({ isActive: false, message: '' });
                toast({
                    title: 'Payment Failed',
                    description: response.error?.description || 'Your transaction was declined by the bank.',
                    variant: 'destructive'
                });
            });

            rzp.open();

        } catch (error: any) {
            console.error("Order Placement Error:", error);
            setIsPlacingOrder(false);
            setPaymentProcessingState({ isActive: false, message: '' });
            toast({
                title: "Order Failed",
                description: error.message || "An error occurred while initiating payment.",
                variant: "destructive"
            });
        }
    };

    const savedAddresses = customer?.savedAddresses || [];
    const ActiveTagIcon = getTagIcon(activeAddress?.tag);

    return (
        <div className="flex flex-col min-h-screen bg-background">
            <Header />

            {/* Payment Processing Overlay */}
            {paymentProcessingState.isActive && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-card border border-purple-500/20 shadow-2xl max-w-sm text-center">
                        <div className="relative flex items-center justify-center">
                            <div className="w-16 h-16 rounded-full bg-purple-500/10 border-2 border-purple-500/30 animate-ping" />
                            <Loader2 className="h-8 w-8 animate-spin text-purple-600 dark:text-purple-400 absolute" />
                        </div>
                        <div className="space-y-1">
                            <h3 className="font-headline text-lg font-bold">Processing Order</h3>
                            <p className="text-xs text-muted-foreground">{paymentProcessingState.message}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                            Please do not refresh or close this window
                        </span>
                    </div>
                </div>
            )}

            <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">Checkout</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground">Confirm details and place your order</p>
                    </div>
                    <Link href="/menu" passHref>
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 rounded-full border-border/70 hover:border-primary/50 hover:bg-primary/10 transition-all shadow-xs"
                            aria-label="Back to Menu"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <Card className="rounded-3xl border-primary/20 shadow-xl overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-purple-600/10 via-pink-600/10 to-purple-600/10 p-4 sm:p-6 border-b border-primary/10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-purple-500 flex-shrink-0 animate-pulse"/>
                                <div>
                                    <CardTitle className="font-headline text-lg sm:text-xl text-foreground font-bold leading-tight">Secure Checkout</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground hidden sm:block">Review your order details, delivery address, and payment method.</CardDescription>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] text-muted-foreground block leading-none">Total to Pay</span>
                                <span className="text-base sm:text-lg font-bold text-purple-500">₹{finalPrice.toFixed(2)}</span>
                            </div>
                        </div>
                    </CardHeader>
                    
                    <form onSubmit={handlePlaceOrder}>
                        <CardContent className="p-3.5 sm:p-6 space-y-4">
                            {/* Delivery Address / Customer Destination Card */}
                            {vendorCarts.some(vc => vc.deliveryOption === 'Home Delivery') ? (
                                <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-primary/5 to-purple-500/10 p-3.5 shadow-xs">
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                                                <ActiveTagIcon className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-xs text-foreground">
                                                        Delivering to: {activeAddress?.label || activeAddress?.tag || 'Home'}
                                                    </span>
                                                    {(activeAddress?.recipientName || customer?.name) && (
                                                        <span className="text-[11px] text-muted-foreground truncate font-medium">
                                                            • {activeAddress?.recipientName || customer?.name} ({activeAddress?.recipientContact || customer?.contact || ''})
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-foreground/85 leading-snug font-medium line-clamp-2">
                                                    {activeAddress?.address || customer?.address || "No address provided"}
                                                </p>
                                                {Boolean(activeAddress?.latitude && activeAddress?.longitude) && (
                                                    <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-semibold pt-0.5">
                                                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                                        <span>GPS Location verified for live navigation</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Button 
                                            type="button" 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={() => setIsAddressSwitchDialogOpen(true)}
                                            className="h-7 text-[11px] font-semibold rounded-full border-primary/30 hover:bg-primary/10 hover:text-primary gap-1.5 px-3 shadow-xs flex-shrink-0"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                            Change
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 flex-shrink-0">
                                            <Home className="h-3.5 w-3.5" />
                                        </div>
                                        <div className="text-[11px]">
                                            <span className="font-bold text-foreground">Self Pickup Order: </span>
                                            <span className="text-muted-foreground">You will collect directly from shop(s).</span>
                                        </div>
                                    </div>
                                    <Link href="/customer-details?redirect=/checkout" passHref className="flex-shrink-0">
                                        <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] rounded-full text-muted-foreground hover:text-foreground px-2.5">
                                            Profile
                                        </Button>
                                    </Link>
                                </div>
                            )}

                            {/* 1. Vendor Details & Toggles */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                                    <Bike className="h-3.5 w-3.5 text-primary" /> Order & Delivery Items
                                </h3>
                                <div className="grid gap-2.5 sm:grid-cols-2">
                                    {vendorCarts.map(vc => (
                                        <Card key={vc.vendor.username} className="rounded-xl border-purple-500/15 bg-muted/20">
                                            <CardContent className="p-3 space-y-2">
                                                <div className="flex items-center justify-between gap-2 border-b border-primary/10 pb-1.5">
                                                    <h4 className="font-semibold text-xs truncate flex items-center gap-1">
                                                        <Home className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                                                        <span className="truncate">{vc.vendor.shopName || vc.vendor.name}</span>
                                                    </h4>
                                                    <div className="flex rounded-full bg-muted p-0.5 border border-purple-500/10 flex-shrink-0">
                                                        <button
                                                            type="button"
                                                            onClick={() => setVendorDeliveryOption(vc.vendor.username, 'Home Delivery')}
                                                            className={cn(
                                                                "text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all duration-200",
                                                                vc.deliveryOption === 'Home Delivery'
                                                                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                                                    : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            <Bike className="h-2.5 w-2.5"/> Delivery
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setVendorDeliveryOption(vc.vendor.username, 'Self Pickup')}
                                                            className={cn(
                                                                "text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all duration-200",
                                                                vc.deliveryOption === 'Self Pickup'
                                                                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                                                    : "text-muted-foreground hover:text-foreground"
                                                            )}
                                                        >
                                                            <Home className="h-2.5 w-2.5"/> Pickup
                                                        </button>
                                                    </div>
                                                </div>

                                                {vc.isShopOpen === false && (
                                                    <div className="flex items-center gap-1.5 p-1.5 bg-red-500/10 text-red-600 rounded-lg text-[10px] font-semibold">
                                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                                        <span>Shop is currently closed ({vc.shopStatusMsg || 'Closed'})</span>
                                                    </div>
                                                )}

                                                <div className="space-y-0.5">
                                                    {vc.items.map(item => (
                                                        <div key={item.cartItemId} className="flex justify-between items-center text-[11px] text-muted-foreground">
                                                            <span className="truncate pr-2">{item.name} × {item.quantity}</span>
                                                            <span className="flex-shrink-0 font-medium text-foreground">₹{(item.price * item.quantity).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                {vc.deliveryOption === 'Home Delivery' && vc.isOutOfRange && (
                                                    <div className="flex items-center gap-1.5 p-1.5 bg-destructive/10 text-destructive rounded-lg text-[10px] font-semibold border border-destructive/20">
                                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                                        <span>Out of delivery range. Switch to Pickup or select nearby address.</span>
                                                    </div>
                                                )}

                                                {vc.deliveryOption === 'Home Delivery' && !vc.isOutOfRange && (
                                                    <div className="flex items-center justify-between p-1.5 bg-muted/40 rounded-lg text-[10px] border border-border/40">
                                                        <span className="text-muted-foreground flex items-center gap-1">
                                                            <MapPin className="h-3 w-3 text-primary" />
                                                            Home Delivery
                                                        </span>
                                                        <span className="font-semibold text-foreground">
                                                            {vc.deliveryCharge ? `₹${vc.deliveryCharge.toFixed(2)} delivery` : 'Free delivery'}
                                                        </span>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            {/* 2. Payment Method */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                                    <CreditCard className="h-3.5 w-3.5 text-primary" /> Payment Method
                                </h3>
                                <RadioGroup 
                                    value={paymentMethod} 
                                    onValueChange={(val: any) => setPaymentMethod(val)} 
                                    className="grid grid-cols-2 gap-2.5"
                                >
                                    <div>
                                        <RadioGroupItem value="PAY_NOW" id="pay-now" className="peer sr-only" />
                                        <Label htmlFor="pay-now" className={cn(
                                            "flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer transition-all duration-200 h-full",
                                            paymentMethod === 'PAY_NOW' 
                                                ? "border-primary bg-primary/10 text-primary shadow-xs" 
                                                : "border-muted text-muted-foreground bg-muted/10 hover:border-purple-500/40"
                                        )}>
                                            <CreditCard className="h-5 w-5 text-purple-500 flex-shrink-0"/>
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs text-foreground">Pay Online</div>
                                                <div className="text-[9px] text-muted-foreground truncate">UPI, Cards, Netbanking</div>
                                            </div>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem 
                                            value="COD" 
                                            id="pay-cod" 
                                            disabled={!isCodAllowed}
                                            className="peer sr-only" 
                                        />
                                        <Label htmlFor="pay-cod" className={cn(
                                            "flex items-center gap-2.5 rounded-xl border p-2.5 transition-all duration-200 h-full",
                                            !isCodAllowed 
                                                 ? "opacity-50 cursor-not-allowed border-muted bg-muted/5 text-muted-foreground"
                                                 : paymentMethod === 'COD' 
                                                     ? "cursor-pointer border-primary bg-primary/10 text-primary shadow-xs" 
                                                     : "cursor-pointer border-muted text-muted-foreground bg-muted/10 hover:border-purple-500/40"
                                        )}>
                                            <Wallet className="h-5 w-5 text-purple-500 flex-shrink-0"/>
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs text-foreground flex items-center gap-1">
                                                    Cash on Delivery
                                                    {!isAddressCodEligible && <Lock className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                                                </div>
                                                <div className="text-[9px] text-muted-foreground truncate">
                                                    {!isAllHomeDelivery 
                                                        ? "Unavailable for Self Pickup"
                                                        : !isAddressCodEligible
                                                        ? "Locked on new address"
                                                        : "Pay upon arrival"}
                                                </div>
                                            </div>
                                        </Label>
                                    </div>
                                </RadioGroup>

                                {/* COD Security Notice for New/Modified Addresses */}
                                {isAllHomeDelivery && !isAddressCodEligible && (
                                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-300">
                                        <Lock className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                        <span>
                                            <strong>Security Notice:</strong> Cash on Delivery is locked for your first order at this address. Pay Online once to permanently unlock COD.
                                        </span>
                                    </div>
                                )}
                            </div>

                            <Separator className="bg-purple-500/10 my-1" />

                            {/* 3. Billing Summary */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-0.5">Billing Breakdown</h3>
                                <div className="bg-muted/15 rounded-xl p-3 border border-purple-500/10 space-y-1.5 text-xs">
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Items Subtotal</span>
                                        <span className="font-medium text-foreground">₹{totalPrice.toFixed(2)}</span>
                                    </div>
                                    {totalDeliveryCharge > 0 && (
                                        <div className="flex justify-between items-center text-muted-foreground">
                                            <span>Delivery Charges</span>
                                            <span className="font-medium text-foreground">₹{totalDeliveryCharge.toFixed(2)}</span>
                                        </div>
                                    )}

                                    {/* Fee Breakdown */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Platform Fee</span>
                                        <span className="font-medium text-foreground text-[11px]">₹{PLATFORM_FEE.toFixed(2)}</span>
                                    </div>

                                    {redemptionDetails?.canRedeem && (
                                        <div className="flex justify-between items-center text-green-600 dark:text-green-400 font-semibold">
                                            <span>Points Discount ({redemptionDetails.pointsToRedeem} pts)</span>
                                            <span>- ₹{redemptionDetails.discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <Separator className="bg-purple-500/10 my-1" />
                                    <div className="flex justify-between items-center font-bold text-sm pt-0.5">
                                        <span className="text-foreground">Grand Total</span>
                                        <span className="text-purple-600 dark:text-purple-400 text-base">₹{finalPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>

                        <CardFooter className="p-3 sm:p-4 bg-purple-900/5 border-t border-purple-500/10 flex flex-col gap-3">
                            {!canCheckout && (
                                <div className="w-full px-3.5 py-2 rounded-2xl sm:rounded-full bg-destructive/10 border border-destructive/20 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-destructive font-medium">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                        <span>
                                            {vendorCarts.some(vc => !vc.isMinOrderMet) 
                                                ? "Minimum order amount not met for Home Delivery. Please add more items to proceed."
                                                : vendorCarts.some(vc => vc.isOutOfRange)
                                                ? "Some items in your cart are out of delivery range."
                                                : "Some vendors in your cart are currently closed."}
                                        </span>
                                    </div>
                                    {vendorCarts.some(vc => !vc.isMinOrderMet) && (
                                        <Link 
                                            href={getVendorMenuUrl(vendorCarts.find(vc => !vc.isMinOrderMet)?.vendor)} 
                                            passHref 
                                            className="flex-shrink-0"
                                        >
                                            <Button type="button" size="sm" variant="ghost" className="h-6 text-[10px] font-bold text-destructive hover:bg-destructive/10">
                                                Add More Items →
                                            </Button>
                                        </Link>
                                    )}
                                </div>
                            )}

                            <Button 
                                type="submit" 
                                disabled={!canCheckout || isPlacingOrder} 
                                className="w-full h-12 rounded-2xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md gap-2"
                            >
                                {isPlacingOrder ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Processing Order...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="h-4 w-4" />
                                        {paymentMethod === 'PAY_NOW' ? `Pay ₹${finalPrice.toFixed(2)} Online` : `Place COD Order (₹${finalPrice.toFixed(2)})`}
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </main>

            {/* Address Switcher Dialog */}
            <Dialog open={isAddressSwitchDialogOpen} onOpenChange={setIsAddressSwitchDialogOpen}>
                <DialogContent className="sm:max-w-md rounded-3xl p-5 max-h-[85vh] flex flex-col">
                    <DialogHeader className="pb-1">
                        <DialogTitle className="font-headline text-xl font-bold flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            Select Delivery Address
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-3 overflow-y-auto pr-1 flex-1 py-1">
                        {savedAddresses.map((addr) => {
                            const ItemIcon = getTagIcon(addr.tag);
                            const isSelected = activeAddress?.id === addr.id || (
                                activeAddress &&
                                Math.abs(activeAddress.latitude - addr.latitude) < 0.0005 &&
                                Math.abs(activeAddress.longitude - addr.longitude) < 0.0005
                            );

                            return (
                                <div
                                    key={addr.id}
                                    onClick={() => {
                                        selectSavedAddress(addr);
                                        setIsAddressSwitchDialogOpen(false);
                                    }}
                                    className={cn(
                                        "p-3 rounded-2xl border transition-all cursor-pointer text-left space-y-1 relative group",
                                        isSelected 
                                            ? "bg-primary/10 border-primary/40 shadow-xs"
                                            : "bg-card border-border hover:border-primary/30 hover:bg-muted/40"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                            <div className={cn(
                                                "w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0",
                                                isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                                            )}>
                                                <ItemIcon className="h-3.5 w-3.5" />
                                            </div>
                                            <span className="font-bold text-xs text-foreground">
                                                {addr.label || addr.tag}
                                            </span>
                                            {addr.isDefault && (
                                                <span className="text-[9px] bg-primary/15 text-primary font-semibold px-1.5 py-0.2 rounded-full">
                                                    Default
                                                </span>
                                            )}
                                        </div>

                                        {isSelected ? (
                                            <span className="text-[10px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-500/10 px-2 py-0.5 rounded-full">
                                                <Check className="h-3 w-3" /> Selected
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-primary font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                                Deliver Here →
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-[11px] text-foreground/80 font-medium line-clamp-2 leading-relaxed pl-7.5">
                                        {addr.address}
                                    </p>
                                    {addr.recipientName && (
                                        <p className="text-[10px] text-muted-foreground pl-7.5">
                                            Receiver: {addr.recipientName} {addr.recipientContact ? `(${addr.recipientContact})` : ''}
                                        </p>
                                    )}
                                </div>
                            );
                        })}

                        <Button
                            type="button"
                            onClick={() => {
                                setIsAddressSwitchDialogOpen(false);
                                setIsMapPickerOpen(true);
                            }}
                            className="w-full h-12 rounded-2xl gap-2 font-semibold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-md text-white mt-2"
                        >
                            <Plus className="h-4 w-4" />
                            + Add New Address on Map 🗺️
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Interactive Map Picker for adding new address from Checkout */}
            <MapLocationPickerDialog 
                open={isMapPickerOpen}
                onOpenChange={setIsMapPickerOpen}
                onAddressSaved={(saved) => {
                    selectSavedAddress(saved);
                }}
            />

            {/* Full-Screen Payment Processing / Success Splash Overlay */}
            <AnimatePresence>
                {paymentProcessingState.isActive && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 backdrop-blur-md p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 10 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: -10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-sm bg-card/95 border border-primary/20 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden"
                        >
                            {/* Decorative background glow */}
                            <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                            {/* Animated Pulse Icon */}
                            <div className="relative flex items-center justify-center mx-auto my-2">
                                <motion.div
                                    animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.5, 0.2] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute w-24 h-24 rounded-full bg-primary/30"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary via-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-primary/30 text-white relative z-10"
                                >
                                    <ShieldCheck className="h-10 w-10 text-white animate-pulse" />
                                </motion.div>
                            </div>

                            {/* Title & Status */}
                            <div className="space-y-2 relative z-10">
                                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                                    Payment Successful! 🎉
                                </h2>
                                <p className="text-xs sm:text-sm text-muted-foreground font-medium min-h-[20px] transition-all">
                                    {paymentProcessingState.message || "Payment received! Creating your order..."}
                                </p>
                            </div>

                            {/* Progress Indicator */}
                            <div className="space-y-3 pt-2 relative z-10">
                                <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden relative">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full"
                                        animate={{
                                            x: ['-100%', '100%'],
                                        }}
                                        transition={{
                                            duration: 1.4,
                                            repeat: Infinity,
                                            ease: 'easeInOut',
                                        }}
                                        style={{ width: '60%' }}
                                    />
                                </div>
                                <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    <span>Securing transaction with kitchen</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

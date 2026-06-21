'use client';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Fingerprint, Rocket, ShieldCheck, Home, Bike, Wallet, QrCode, Smartphone, Info, AlertTriangle, ArrowRight, CheckCircle2, Loader2, Award, Copy, Download } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/cart-context';
import { useOrder } from '@/context/order-context';
import { useCustomer } from '@/context/customer-context';
import { useAppContext } from '@/app/layout';
import { useState, useMemo, useEffect } from 'react';
import type { DeliveryOption, PaymentMethod, Vendor } from '@/types';
import { cn } from '@/lib/utils';
import { useVendor } from '@/context/vendor-context';
import QRCode from 'qrcode';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';

export default function CheckoutPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { cartItems, totalPrice, clearCart, vendorCarts, customNotes, setVendorDeliveryOption, deliveryConfig, redemptionDetails, applyPoints, setApplyPoints } = useCart();
    const { vendors } = useVendor();
    const { addOrder } = useOrder();
    const { customer } = useCustomer();
    const { showOrderPlacedDialog } = useAppContext();

    const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD'>('UPI');
    const [isMobile, setIsMobile] = useState(false);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    
    // States for UPI Payment Dialog
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [paymentTargetOrder, setPaymentTargetOrder] = useState<{ id: string; vendorName: string; amount: number; upiId: string } | null>(null);

    // States for placed orders (especially for multi-vendor checkout)
    const [placedOrders, setPlacedOrders] = useState<{ orderId: string; vendorUsername: string; shopName: string; totalPrice: number; upiId?: string; isPaid?: boolean }[]>([]);
    const [checkoutComplete, setCheckoutComplete] = useState(false);

    // States for UPI Payment Verification (Android Parity)
    const [isButtonDisabled, setIsButtonDisabled] = useState(true);
    const [secondsRemaining, setSecondsRemaining] = useState(8);
    const [isVerifying, setIsVerifying] = useState(false);

    // Timer countdown for "I Have Paid" button
    useEffect(() => {
        if (!isQrModalOpen || !paymentTargetOrder) {
            setIsButtonDisabled(true);
            setSecondsRemaining(8);
            return;
        }

        setIsButtonDisabled(true);
        setSecondsRemaining(8);

        const timer = setInterval(() => {
            setSecondsRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setIsButtonDisabled(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isQrModalOpen, paymentTargetOrder]);

    // Detect platform
    useEffect(() => {
        setIsMobile(/Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    }, []);

    // Redirect to login or details if incomplete
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
            router.replace('/customer-details');
        }
    }, [customer, router, toast]);

    const canCheckout = useMemo(() => {
        if (vendorCarts.length === 0) return false;
        return vendorCarts.every(vc => vc.isMinOrderMet && !vc.isOutOfRange);
    }, [vendorCarts]);

    const missingUpiIdVendors = useMemo(() => {
        return vendorCarts
            .filter(vc => vc.deliveryOption !== 'Dine-In' && !vc.vendor.upiId)
            .map(vc => vc.vendor.shopName || vc.vendor.name);
    }, [vendorCarts]);

    const isUpiDisabled = paymentMethod === 'UPI' && missingUpiIdVendors.length > 0;

    const totalDeliveryCharge = useMemo(() => {
        return vendorCarts.reduce((sum, vc) => sum + (vc.deliveryCharge || 0), 0);
    }, [vendorCarts]);

    const finalPrice = totalPrice + totalDeliveryCharge - (redemptionDetails?.discountAmount || 0);

    // Generate UPI URL
    const generateUpiUrl = (upiId: string, shopName: string, amount: number, orderId: string) => {
        const cleanUpiId = upiId.trim();
        const transactionNote = `Order -- ${orderId}`;
        return `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(shopName)}&am=${amount.toFixed(2)}&tn=${encodeURIComponent(transactionNote)}&tr=${orderId}`;
    };

    // Open Mobile UPI App
    const triggerMobileUpi = (upiId: string, shopName: string, amount: number, orderId: string) => {
        const upiUri = generateUpiUrl(upiId, shopName, amount, orderId);
        window.location.href = upiUri;
    };

    // Open Desktop UPI QR Modal
    const triggerDesktopUpi = async (upiId: string, shopName: string, amount: number, orderId: string) => {
        const upiUri = generateUpiUrl(upiId, shopName, amount, orderId);
        try {
            const url = await QRCode.toDataURL(upiUri, { width: 300, margin: 2 });
            setQrCodeUrl(url);
            setPaymentTargetOrder({ id: orderId, vendorName: shopName, amount, upiId });
            setIsQrModalOpen(true);
        } catch (err) {
            console.error('QR code generation failed:', err);
            toast({ title: 'Error', description: 'Failed to generate payment QR code.', variant: 'destructive' });
        }
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customer) return;

        if (cartItems.length === 0) {
            toast({ title: "Your cart is empty!", variant: "destructive" });
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

        if (isUpiDisabled) {
            toast({
                title: "UPI Unavailable",
                description: `Please choose Cash on Delivery. Some vendors do not have UPI configured.`,
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

            // Add the orders to Firestore
            const orderIds = await addOrder({
                cartItems,
                customer,
                allVendors: vendors,
                paymentMethod,
                deliveryOptions,
                customNotes,
                redemption: redemptionDetails
            });

            // Map placed orders with UPI and vendor details
            const newlyPlacedOrders = orderIds.map((id, index) => {
                // Find matching vendor cart
                const vc = vendorCarts[index] || vendorCarts[0];
                const orderAmount = vc.subtotal + (vc.deliveryCharge || 0) - (index === 0 ? (redemptionDetails?.discountAmount || 0) : 0);
                
                return {
                    orderId: id,
                    vendorUsername: vc.vendor.username,
                    shopName: vc.vendor.shopName || vc.vendor.name,
                    totalPrice: orderAmount,
                    upiId: vc.vendor.upiId,
                    isPaid: false
                };
            });

            setPlacedOrders(newlyPlacedOrders);
            clearCart();

            if (paymentMethod === 'COD') {
                showOrderPlacedDialog();
                router.push('/track');
            } else {
                // UPI payment flow
                setCheckoutComplete(true);
                
                // If it's a single order, immediately open payment
                if (newlyPlacedOrders.length === 1) {
                    const order = newlyPlacedOrders[0];
                    if (order.upiId) {
                        await openUpiPaymentModal(order);
                    }
                } else {
                    toast({
                        title: "Orders Placed!",
                        description: "Please complete the payment for each vendor below.",
                    });
                }
            }
        } catch (error: any) {
            console.error('Checkout error:', error);
        } finally {
            setIsPlacingOrder(false);
        }
    };

    const openUpiPaymentModal = async (order: { orderId: string; vendorUsername: string; shopName: string; totalPrice: number; upiId?: string; isPaid?: boolean }) => {
        if (!order.upiId) return;

        setPaymentTargetOrder({
            id: order.orderId,
            vendorName: order.shopName,
            amount: order.totalPrice,
            upiId: order.upiId
        });

        // Generate QR code for desktop view
        const upiUri = generateUpiUrl(order.upiId, order.shopName, order.totalPrice, order.orderId);
        try {
            const url = await QRCode.toDataURL(upiUri, { width: 300, margin: 2 });
            setQrCodeUrl(url);
        } catch (err) {
            console.error('QR code generation failed:', err);
        }

        setIsQrModalOpen(true);

        if (isMobile) {
            // Trigger deep link on mobile immediately
            window.location.href = upiUri;
        }
    };

    const handleUpiPayClick = async (order: typeof placedOrders[0]) => {
        await openUpiPaymentModal(order);
    };

    const handleQrDone = async () => {
        if (!paymentTargetOrder) return;

        setIsQrModalOpen(false);
        setIsVerifying(true);

        const orderId = paymentTargetOrder.id;
        const orderRef = doc(db, 'orders', orderId);

        // Update Firestore to set paymentStatus = 'AWAITING_CONFIRMATION' to match Android app parity
        try {
            await updateDoc(orderRef, {
                paymentStatus: 'AWAITING_CONFIRMATION',
                paymentRequestedAt: new Date().toISOString()
            });
        } catch (e) {
            console.error("Failed to set paymentStatus to AWAITING_CONFIRMATION:", e);
        }

        let isFinalized = false;

        // Firestore listener to listen for order status change (confirmed by vendor or rider)
        const unsubscribe = onSnapshot(orderRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (
                    data.paymentStatus === 'CONFIRMED BY VENDOR' || 
                    data.paymentStatus === 'CONFIRMED BY RIDER'
                ) {
                    finalizeVerification();
                }
            }
        });

        const finalizeVerification = () => {
            if (isFinalized) return;
            isFinalized = true;
            unsubscribe();
            setIsVerifying(false);

            // Mark the active order as paid locally
            setPlacedOrders(prev => prev.map(o => o.orderId === orderId ? { ...o, isPaid: true } : o));

            toast({
                title: "Payment Details Submitted",
                description: "Please allow some time for the vendor to confirm your payment. Stay relaxed! 🎉",
            });

            // Check if all placed orders are now paid (including the current one)
            const allPaid = placedOrders.every(o => o.orderId === orderId ? true : o.isPaid);
            if (allPaid) {
                showOrderPlacedDialog();
                router.push('/track');
            }
        };

        // Safety timeout of 4 seconds (at least 3 to 5 seconds per instructions)
        setTimeout(() => {
            finalizeVerification();
        }, 4000);
    };

    return (
        <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
                <Card className="w-full max-w-4xl bg-card/85 backdrop-blur-md border-purple-500/20 box-glow-accent rounded-3xl overflow-hidden shadow-2xl">
                    <CardHeader className="bg-purple-900/10 border-b border-purple-500/10 py-6">
                        <div className="flex items-center justify-center gap-3 mb-1">
                            <ShieldCheck className="h-8 w-8 text-purple-500 animate-pulse"/>
                            <CardTitle className="font-headline text-4xl text-center text-purple-500">Secure Checkout</CardTitle>
                        </div>
                        <CardDescription className="text-center text-sm">Review your delivery choices, verify pricing, and select your payment method.</CardDescription>
                    </CardHeader>
                    
                    {!checkoutComplete ? (
                        <form onSubmit={handlePlaceOrder}>
                            <CardContent className="p-6 md:p-8 space-y-8">
                                {/* 1. Vendor Details & Toggles */}
                                <div className="space-y-4">
                                    <h3 className="font-headline text-xl text-primary font-bold flex items-center gap-2">
                                        <Bike className="h-5 w-5" /> Delivery Summary
                                    </h3>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {vendorCarts.map(vc => (
                                            <Card key={vc.vendor.username} className="rounded-2xl border-purple-500/10 bg-muted/20">
                                                <CardContent className="p-4 space-y-4">
                                                    <div className="flex items-center justify-between gap-2 border-b border-primary/5 pb-2">
                                                        <h4 className="font-semibold text-sm truncate flex items-center gap-1.5">
                                                            <Home className="h-4 w-4 text-purple-500 flex-shrink-0" />
                                                            <span className="truncate">{vc.vendor.shopName || vc.vendor.name}</span>
                                                        </h4>
                                                            <div className="flex rounded-full bg-muted p-0.5 border border-purple-500/10 flex-shrink-0">
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

                                                    <div className="space-y-1">
                                                        {vc.items.map(item => (
                                                            <div key={item.cartItemId} className="flex justify-between items-center text-xs text-muted-foreground">
                                                                <span>{item.name} x {item.quantity}</span>
                                                                <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {vc.deliveryOption === 'Home Delivery' && (
                                                        <div className="flex flex-col gap-1 p-2 bg-muted/40 rounded-xl text-xs">
                                                            <div className="flex justify-between items-center font-medium">
                                                                <span className="text-muted-foreground">Distance</span>
                                                                <span>{vc.deliveryDistanceKm ? `${vc.deliveryDistanceKm.toFixed(2)} km` : '0.00 km'}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center font-medium">
                                                                <span className="text-muted-foreground">Delivery Charge</span>
                                                                <span>₹{vc.deliveryCharge || 0}</span>
                                                            </div>
                                                            {vc.isOutOfRange && (
                                                                <div className="flex items-center gap-1.5 p-1.5 bg-red-500/10 text-red-600 rounded-lg text-[10px] font-semibold mt-1">
                                                                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                                                    <span>Out of Delivery Range (Max {deliveryConfig?.maxDeliveryRadiusKm} km)</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>

                                <Separator className="bg-purple-500/10" />

                                {/* 2. Payment Method Selection */}
                                <div className="space-y-4">
                                    <h3 className="font-headline text-xl text-primary font-bold flex items-center gap-2">
                                        <Wallet className="h-5 w-5" /> Payment Method
                                    </h3>
                                    
                                    <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'UPI' | 'COD')} className="grid grid-cols-2 gap-4">
                                        <div>
                                            <RadioGroupItem value="UPI" id="pay-upi" className="peer sr-only" />
                                            <Label htmlFor="pay-upi" className={cn(
                                                "flex flex-col items-center justify-center rounded-2xl border-2 p-6 cursor-pointer hover:border-purple-500/40 transition-all duration-200",
                                                paymentMethod === 'UPI' ? "border-primary bg-primary/5 text-primary" : "border-muted text-muted-foreground bg-muted/10"
                                            )}>
                                                <QrCode className="mb-2 h-7 w-7 text-purple-500"/>
                                                <span className="font-bold text-sm">Pay via UPI</span>
                                                <span className="text-[10px] text-muted-foreground mt-1">App link / QR Code</span>
                                            </Label>
                                        </div>
                                        <div>
                                            <RadioGroupItem value="COD" id="pay-cod" className="peer sr-only" />
                                            <Label htmlFor="pay-cod" className={cn(
                                                "flex flex-col items-center justify-center rounded-2xl border-2 p-6 cursor-pointer hover:border-purple-500/40 transition-all duration-200",
                                                paymentMethod === 'COD' ? "border-primary bg-primary/5 text-primary" : "border-muted text-muted-foreground bg-muted/10"
                                            )}>
                                                <Wallet className="mb-2 h-7 w-7 text-purple-500"/>
                                                <span className="font-bold text-sm">Cash on Delivery</span>
                                                <span className="text-[10px] text-muted-foreground mt-1">Pay on delivery</span>
                                            </Label>
                                        </div>
                                    </RadioGroup>

                                    {isUpiDisabled && (
                                        <div className="flex items-center gap-2 p-3 bg-red-500/10 text-red-600 rounded-xl text-xs font-semibold">
                                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                            <span>
                                                UPI is unavailable because the VPA for: <b>{missingUpiIdVendors.join(', ')}</b> is not configured. Please select Cash on Delivery.
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <Separator className="bg-purple-500/10" />

                                {/* 3. Billing Summary */}
                                <div className="space-y-4">
                                    <h3 className="font-headline text-xl text-primary font-bold">Billing Breakdown</h3>
                                    <div className="bg-muted/10 rounded-2xl p-6 border border-purple-500/5 space-y-3">
                                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                                            <span>Items Subtotal</span>
                                            <span>₹{totalPrice.toFixed(2)}</span>
                                        </div>
                                        {totalDeliveryCharge > 0 && (
                                            <div className="flex justify-between items-center text-sm text-muted-foreground">
                                                <span>Delivery Charges</span>
                                                <span>₹{totalDeliveryCharge.toFixed(2)}</span>
                                            </div>
                                        )}
                                        {redemptionDetails?.canRedeem && (
                                            <div className="flex justify-between items-center text-sm text-green-600 dark:text-green-400">
                                                <span>Points Discount ({redemptionDetails.pointsToRedeem} points)</span>
                                                <span>- ₹{redemptionDetails.discountAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <Separator className="bg-purple-500/10" />
                                        <div className="flex justify-between items-center font-bold text-xl">
                                            <span>Grand Total</span>
                                            <span className="text-purple-500">₹{finalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter className="p-6 md:p-8 bg-purple-900/5 border-t border-purple-500/10 flex flex-col sm:flex-row gap-4 justify-between items-center">
                                <div className="text-xs text-muted-foreground text-center sm:text-left">
                                    By placing this order, you agree to our Terms & Conditions.
                                </div>
                                <Button 
                                    type="submit" 
                                    size="lg" 
                                    className="w-full sm:w-auto text-base px-8 py-6 rounded-xl text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20" 
                                    disabled={!canCheckout || isUpiDisabled || isPlacingOrder}
                                >
                                    {isPlacingOrder ? (
                                        <>
                                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            Processing Order...
                                        </>
                                    ) : (
                                        <>
                                            <Rocket className="mr-2 h-5 w-5"/>
                                            Confirm and Pay ₹{finalPrice.toFixed(2)}
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    ) : (
                        /* UPI Payment List (Pending QR / Deep Links) */
                        <CardContent className="p-6 md:p-8 space-y-6">
                            <div className="flex flex-col items-center justify-center p-6 bg-green-500/10 border border-green-500/20 rounded-2xl text-center space-y-2">
                                <CheckCircle2 className="h-12 w-12 text-green-500 animate-bounce" />
                                <h3 className="font-headline text-2xl text-green-600 font-bold">Orders Placed Successfully!</h3>
                                <p className="text-sm text-muted-foreground max-w-lg">
                                    Your orders have been saved in our system. Please complete payment for each vendor order below via UPI to start preparation.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-semibold text-lg flex items-center gap-2">
                                    <QrCode className="h-5 w-5 text-purple-500" /> Pending UPI Payments
                                </h4>
                                
                                <div className="space-y-3">
                                    {placedOrders.map(order => (
                                        <Card key={order.orderId} className="rounded-xl border-purple-500/10">
                                            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="space-y-1 text-center sm:text-left">
                                                    <h5 className="font-bold text-sm">{order.shopName}</h5>
                                                    <p className="text-xs text-muted-foreground">Order ID: {order.orderId}</p>
                                                    <p className="font-bold text-sm text-purple-500">₹{order.totalPrice.toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center gap-3 w-full sm:w-auto">
                                                    {order.isPaid ? (
                                                        <span className="w-full sm:w-auto text-center px-4 py-2 bg-green-500/10 text-green-500 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5">
                                                            <CheckCircle2 className="h-4 w-4" /> Paid
                                                        </span>
                                                    ) : (
                                                        <Button 
                                                            onClick={() => handleUpiPayClick(order)} 
                                                            className="w-full sm:w-auto rounded-xl bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center gap-1.5"
                                                        >
                                                            {isMobile ? <Smartphone className="h-4 w-4" /> : <QrCode className="h-4 w-4" />}
                                                            {isMobile ? "Pay via UPI App" : "Scan QR Code"}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-purple-500/10 flex justify-end">
                                <Button 
                                    onClick={() => {
                                        showOrderPlacedDialog();
                                        router.push('/track');
                                    }} 
                                    className="rounded-xl border border-neutral-700 text-base"
                                    variant="outline"
                                >
                                    Go to Order Tracking <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    )}
                </Card>
            </main>

            {/* UPI Payment Modal (Desktop QR / Mobile App Link) */}
            <Dialog open={isQrModalOpen} onOpenChange={setIsQrModalOpen}>
                <DialogContent className="max-w-sm rounded-3xl bg-card border border-purple-500/20 shadow-2xl p-6">
                    <DialogHeader className="space-y-2 text-center flex flex-col items-center">
                        <div className="p-3 bg-purple-500/10 rounded-full text-purple-500 mb-2">
                            {isMobile ? <Smartphone className="h-8 w-8" /> : <QrCode className="h-8 w-8" />}
                        </div>
                        <DialogTitle className="text-xl font-bold font-headline">
                            {isMobile ? "UPI Mobile Payment" : "UPI Scan to Pay"}
                        </DialogTitle>
                        <DialogDescription className="text-sm">
                            {isMobile 
                                ? "Complete your payment of the order amount in your UPI app, then return here to confirm."
                                : "Scan this QR code using any UPI app (GPay, PhonePe, Paytm) to complete payment."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {paymentTargetOrder && (
                        <div className="flex flex-col items-center justify-center p-4 gap-4 bg-muted/10 rounded-2xl border border-purple-500/5 my-4 animate-in fade-in duration-200">
                            {isMobile ? (
                                <div className="w-full py-2 text-center space-y-4">
                                    <Button 
                                        onClick={() => {
                                            const upiUri = generateUpiUrl(paymentTargetOrder.upiId, paymentTargetOrder.vendorName, paymentTargetOrder.amount, paymentTargetOrder.id);
                                            window.location.href = upiUri;
                                        }}
                                        className="w-full py-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                                    >
                                        <Smartphone className="h-5 w-5" /> Open UPI App
                                    </Button>
                                    <p className="text-[11px] text-muted-foreground">
                                        If your UPI app didn't open automatically, click the button above.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div 
                                        onClick={() => {
                                            if (!qrCodeUrl) return;
                                            const a = document.createElement('a');
                                            a.href = qrCodeUrl;
                                            a.download = `QR_${paymentTargetOrder.id}.png`;
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            toast({ title: "QR Code Saved", description: "Saved to your device gallery." });
                                        }}
                                        className="relative bg-white p-3 rounded-2xl overflow-hidden border cursor-pointer hover:border-purple-500 hover:shadow-lg transition-all group"
                                        title="Click to save QR Code"
                                    >
                                        {qrCodeUrl ? (
                                            <>
                                                <Image src={qrCodeUrl} alt={`QR Code for ${paymentTargetOrder.vendorName}`} width={220} height={220} className="object-contain" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Download className="text-white h-8 w-8" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="w-56 h-56 flex items-center justify-center text-xs text-muted-foreground">Generating QR code...</div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-muted-foreground text-center max-w-[220px]">
                                        Click to save QR code.<br/>Use your UPI app - open scan and upload the image for payment.
                                    </p>
                                </div>
                            )}
                            <div className="text-center space-y-2 mt-2">
                                <p className="text-2xl font-black text-purple-500">₹{paymentTargetOrder.amount.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">Paying: <b>{paymentTargetOrder.vendorName}</b></p>
                                <div className="flex items-center justify-center gap-2 bg-background py-1.5 px-3 rounded-lg border border-purple-500/10 mx-auto w-fit">
                                    <span className="text-[11px] text-muted-foreground font-mono">VPA: {paymentTargetOrder.upiId}</span>
                                    <button 
                                        onClick={(e) => {
                                            e.preventDefault();
                                            navigator.clipboard.writeText(paymentTargetOrder.upiId);
                                            toast({ title: "UPI ID Copied", description: "Copied to clipboard." });
                                        }}
                                        className="p-1.5 hover:bg-muted rounded-md transition-colors text-purple-500 hover:text-purple-600"
                                        title="Copy UPI ID"
                                    >
                                        <Copy className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex flex-col gap-2 sm:flex-col mt-4">
                        <Button 
                            onClick={handleQrDone} 
                            disabled={isButtonDisabled}
                            className={cn(
                                "w-full rounded-xl text-white font-semibold py-5 transition-all duration-200",
                                isButtonDisabled 
                                    ? "bg-neutral-600 hover:bg-neutral-600 cursor-not-allowed text-neutral-400" 
                                    : "bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/10 animate-pulse"
                            )}
                        >
                            {isButtonDisabled ? `I Have Paid (${secondsRemaining}s)` : "I Have Paid Successfully"}
                        </Button>
                        <DialogClose asChild>
                            <Button variant="ghost" className="w-full rounded-xl text-muted-foreground hover:text-foreground">
                                Cancel
                            </Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Non-dismissible verification overlay */}
            {isVerifying && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl transition-all duration-300">
                    <div className="bg-card p-8 rounded-3xl border border-green-500/20 box-glow-accent max-w-md w-full mx-4 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="relative flex items-center justify-center">
                            {/* Circular progress indicator */}
                            <div className="h-16 w-16 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin" />
                            <div className="absolute h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-lg animate-pulse">
                                ✓
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-headline text-2xl font-bold text-green-500">Verifying Payment</h3>
                            <p className="text-base text-foreground font-medium px-4">
                                We are verifying your payment. Stay relaxed! 🎉
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Please do not close this window or refresh the page.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

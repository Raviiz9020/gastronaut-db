'use client';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Rocket, ShieldCheck, Home, Bike, Wallet, AlertTriangle, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/cart-context';
import { useOrder } from '@/context/order-context';
import { useCustomer } from '@/context/customer-context';
import { useAppContext } from '@/app/layout';
import { useState, useMemo, useEffect } from 'react';
import type { DeliveryOption } from '@/types';
import { cn } from '@/lib/utils';
import { useVendor } from '@/context/vendor-context';
import { calculateFeeSavings } from '@/lib/savings-utils';
import { Separator } from '@/components/ui/separator';

export default function CheckoutPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { cartItems, totalPrice, clearCart, vendorCarts, customNotes, setVendorDeliveryOption, deliveryConfig, redemptionDetails } = useCart();
    const { vendors } = useVendor();
    const { addOrder } = useOrder();
    const { customer } = useCustomer();
    const { showOrderPlacedDialog } = useAppContext();

    const [paymentMethod, setPaymentMethod] = useState<'PAY_NOW' | 'COD'>('PAY_NOW');
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);

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
            router.replace('/customer-details');
        }
    }, [customer, router, toast]);

    const canCheckout = useMemo(() => {
        if (vendorCarts.length === 0) return false;
        return vendorCarts.every(vc => vc.isMinOrderMet && !vc.isOutOfRange);
    }, [vendorCarts]);

    const totalDeliveryCharge = useMemo(() => {
        return vendorCarts.reduce((sum, vc) => sum + (vc.deliveryCharge || 0), 0);
    }, [vendorCarts]);

    const baseAmount = totalPrice + totalDeliveryCharge - (redemptionDetails?.discountAmount || 0);

    // Apply exact Payment Gateway Fee (2% MDR + 18% GST on MDR = 2.36%) only for Online Payment
    const gatewayFee = useMemo(() => {
        if (paymentMethod !== 'PAY_NOW' || baseAmount <= 0) return 0;
        return parseFloat((baseAmount * 0.0236).toFixed(2));
    }, [paymentMethod, baseAmount]);

    const finalPrice = parseFloat((baseAmount + gatewayFee).toFixed(2));

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customer) return;

        if (cartItems.length === 0) {
            toast({ title: "Your cart is empty!", variant: "destructive" });
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

            // 1. If Cash on Delivery, place order in Firestore immediately
            if (paymentMethod === 'COD') {
                await addOrder({
                    cartItems,
                    customer,
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
                    receipt: tempReceipt,
                    notes: {
                        customerName: customer.name,
                        customerContact: customer.contact,
                        customerEmail: customer.email || ''
                    }
                })
            });

            const createData = await createRes.json();

            if (!createData.success || !createData.orderId) {
                throw new Error(createData.error || 'Failed to initialize payment gateway.');
            }

            // 3. Launch Razorpay Checkout Modal
            if (!(window as any).Razorpay) {
                throw new Error('Razorpay SDK failed to load. Please refresh and try again.');
            }

            const options = {
                key: createData.keyId || razorpayKeyId,
                amount: createData.amount,
                currency: createData.currency || 'INR',
                name: 'HyperDelivery',
                description: `Order Total: ₹${finalPrice.toFixed(2)}`,
                order_id: createData.orderId,
                prefill: {
                    name: customer.name,
                    contact: customer.contact,
                    email: customer.email || `${customer.contact}@hyperdelivery.in`
                },
                theme: {
                    color: '#9333ea'
                },
                modal: {
                    ondismiss: function () {
                        setIsPlacingOrder(false);
                        toast({
                            title: "Payment Incomplete",
                            description: "No amount was deducted. Your items are safe in your cart — you can retry or select Cash on Delivery.",
                        });
                    }
                },
                handler: async function (response: any) {
                    setIsVerifying(true);
                    try {
                        // 4. Create the Firestore orders ONLY AFTER payment succeeds
                        const orderIds = await addOrder({
                            cartItems,
                            customer,
                            allVendors: vendors,
                            paymentMethod: 'Pay Now',
                            deliveryOptions,
                            customNotes,
                            redemption: redemptionDetails
                        });

                        // 5. Verify the signature and mark order as PAID on server
                        const verifyRes = await fetch(verifyPaymentUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                orderIds: orderIds,
                                paymentGatewayFee: gatewayFee,
                                amountPaid: finalPrice
                            })
                        });

                        const verifyData = await verifyRes.json();
                        if (!verifyData.success) {
                            console.warn("Verification warning:", verifyData.error);
                        }

                        clearCart();
                        showOrderPlacedDialog();
                        router.push('/track');
                    } catch (verifyErr: any) {
                        console.error('Payment post-process error:', verifyErr);
                        clearCart();
                        showOrderPlacedDialog();
                        router.push('/track');
                    } finally {
                        setIsVerifying(false);
                        setIsPlacingOrder(false);
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.on('payment.failed', function (failRes: any) {
                setIsPlacingOrder(false);
                toast({
                    title: "Transaction Declined",
                    description: failRes.error?.description || "Your bank declined the transaction. No amount was deducted. Please retry or choose Cash on Delivery.",
                    variant: "destructive"
                });
            });

            rzp.open();
        } catch (error: any) {
            console.error('Checkout error:', error);
            toast({
                title: "Payment Gateway Notice",
                description: error.message || "Could not initialize payment. Please try again or choose Cash on Delivery.",
                variant: "destructive"
            });
            setIsPlacingOrder(false);
        }
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
                        <CardDescription className="text-center text-sm">Review your delivery choices, verify pricing, and complete your order.</CardDescription>
                    </CardHeader>
                    
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

                                                {vc.isShopOpen === false && (
                                                    <div className="flex items-center gap-1.5 p-2 bg-red-500/10 text-red-600 rounded-xl text-xs font-semibold">
                                                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                                        <span>Shop is currently closed ({vc.shopStatusMsg || 'Closed'})</span>
                                                    </div>
                                                )}

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
                                
                                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'PAY_NOW' | 'COD')} className="grid grid-cols-2 gap-4">
                                    <div>
                                        <RadioGroupItem value="PAY_NOW" id="pay-now" className="peer sr-only" />
                                        <Label htmlFor="pay-now" className={cn(
                                            "flex flex-col items-center justify-center rounded-2xl border-2 p-4 cursor-pointer hover:border-purple-500/40 transition-all duration-200 text-center h-full",
                                            paymentMethod === 'PAY_NOW' ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-muted text-muted-foreground bg-muted/10"
                                        )}>
                                            <CreditCard className="mb-1.5 h-6 w-6 text-purple-500"/>
                                            <span className="font-bold text-sm">Pay Online</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">UPI, GPay, PhonePe, Cards, Netbanking</span>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="COD" id="pay-cod" className="peer sr-only" />
                                        <Label htmlFor="pay-cod" className={cn(
                                            "flex flex-col items-center justify-center rounded-2xl border-2 p-4 cursor-pointer hover:border-purple-500/40 transition-all duration-200 text-center h-full",
                                            paymentMethod === 'COD' ? "border-primary bg-primary/5 text-primary shadow-sm" : "border-muted text-muted-foreground bg-muted/10"
                                        )}>
                                            <Wallet className="mb-1.5 h-6 w-6 text-purple-500"/>
                                            <span className="font-bold text-sm">Cash on Delivery</span>
                                            <span className="text-[10px] text-muted-foreground mt-0.5">Pay in cash upon arrival</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
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

                                    {/* Fee Transparency */}
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Platform Fee</span>
                                        <div className="flex items-center gap-1.5 text-xs">
                                            <span className="line-through text-muted-foreground/60">₹10.00</span>
                                            <span className="font-bold text-green-600 dark:text-green-400">FREE</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-muted-foreground">Payment Gateway Fee (2% + GST)</span>
                                        {paymentMethod === 'PAY_NOW' ? (
                                            <span className="font-medium text-foreground text-xs">₹{gatewayFee.toFixed(2)}</span>
                                        ) : (
                                            <span className="font-bold text-green-600 dark:text-green-400 text-xs">₹0.00 (COD)</span>
                                        )}
                                    </div>

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
                                disabled={!canCheckout || isPlacingOrder}
                            >
                                {isPlacingOrder ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Initiating Payment...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="mr-2 h-5 w-5"/>
                                        {paymentMethod === 'COD' ? `Place Order (COD) • ₹${finalPrice.toFixed(2)}` : `Pay Now • ₹${finalPrice.toFixed(2)}`}
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </main>

            {/* Non-dismissible verification overlay */}
            {isVerifying && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl transition-all duration-300">
                    <div className="bg-card p-8 rounded-3xl border border-green-500/20 box-glow-accent max-w-md w-full mx-4 flex flex-col items-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
                        <div className="relative flex items-center justify-center">
                            <div className="h-16 w-16 rounded-full border-4 border-green-500/20 border-t-green-500 animate-spin" />
                            <div className="absolute h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 font-bold text-lg animate-pulse">
                                ✓
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-headline text-2xl font-bold text-green-500">Verifying Payment</h3>
                            <p className="text-base text-foreground font-medium px-4">
                                Confirming your payment with Razorpay. Stay relaxed! 🎉
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

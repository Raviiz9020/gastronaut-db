'use client';

import Header from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Rocket, ShieldCheck, Home, Bike, Wallet, AlertTriangle, CheckCircle2, Loader2, Sparkles, MapPin, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
        <div className="flex flex-col min-h-screen bg-background">
            <Header />
            <main className="flex-1 container mx-auto px-3 sm:px-4 py-4 sm:py-8 flex items-center justify-center">
                <Card className="w-full max-w-3xl bg-card/90 backdrop-blur-md border-purple-500/20 box-glow-accent rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
                    <CardHeader className="bg-purple-900/10 border-b border-purple-500/10 py-3 sm:py-4 px-4 sm:px-6">
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
                                <div className="rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-primary/5 to-purple-500/10 p-3 shadow-xs">
                                    <div className="flex items-start justify-between gap-2.5">
                                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                                            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                                                <MapPin className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-bold text-xs text-foreground">Delivering To</span>
                                                    {customer && customer.name && (
                                                        <span className="text-[11px] text-muted-foreground truncate font-medium">
                                                            • {customer.name} ({customer.contact || ''})
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-foreground/85 leading-snug font-medium line-clamp-2">
                                                    {customer?.address || "No address provided"}
                                                </p>
                                                {Boolean(customer?.latitude && customer?.longitude) && (
                                                    <div className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 font-semibold pt-0.5">
                                                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                                                        <span>GPS Location pinned for live tracking</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <Link href="/customer-details" passHref className="flex-shrink-0">
                                            <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] font-semibold rounded-full border-primary/30 hover:bg-primary/10 hover:text-primary gap-1.5 px-3 shadow-xs">
                                                <Edit3 className="h-3 w-3" />
                                                Change
                                            </Button>
                                        </Link>
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
                                    <Link href="/customer-details" passHref className="flex-shrink-0">
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

                                                {vc.deliveryOption === 'Home Delivery' && (
                                                    <div className="flex items-center justify-between p-1.5 bg-muted/40 rounded-lg text-[10px] border border-border/40">
                                                        <span className="text-muted-foreground">
                                                            Dist: <strong className="text-foreground">{vc.deliveryDistanceKm ? `${vc.deliveryDistanceKm.toFixed(2)} km` : '0.00 km'}</strong>
                                                        </span>
                                                        <div>
                                                            {vc.isFreeDelivery ? (
                                                                <span className="font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
                                                                    🎉 Free Delivery
                                                                </span>
                                                            ) : (
                                                                <span>Fee: <strong className="text-foreground">₹{vc.deliveryCharge || 0}</strong></span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {vc.isOutOfRange && (
                                                    <div className="flex items-center gap-1 p-1.5 bg-red-500/10 text-red-600 rounded-lg text-[10px] font-semibold">
                                                        <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                                        <span>Out of Delivery Range (Max {deliveryConfig?.maxDeliveryRadiusKm} km)</span>
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>

                            <Separator className="bg-purple-500/10 my-1" />

                            {/* 2. Payment Method Selection */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 px-0.5">
                                    <Wallet className="h-3.5 w-3.5 text-primary" /> Payment Method
                                </h3>
                                
                                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'PAY_NOW' | 'COD')} className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <RadioGroupItem value="PAY_NOW" id="pay-now" className="peer sr-only" />
                                        <Label htmlFor="pay-now" className={cn(
                                            "flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer hover:border-purple-500/40 transition-all duration-200 h-full",
                                            paymentMethod === 'PAY_NOW' ? "border-primary bg-primary/10 text-primary shadow-xs" : "border-muted text-muted-foreground bg-muted/10"
                                        )}>
                                            <CreditCard className="h-5 w-5 text-purple-500 flex-shrink-0"/>
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs text-foreground">Pay Online</div>
                                                <div className="text-[9px] text-muted-foreground truncate">UPI, Cards, Netbanking</div>
                                            </div>
                                        </Label>
                                    </div>
                                    <div>
                                        <RadioGroupItem value="COD" id="pay-cod" className="peer sr-only" />
                                        <Label htmlFor="pay-cod" className={cn(
                                            "flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer hover:border-purple-500/40 transition-all duration-200 h-full",
                                            paymentMethod === 'COD' ? "border-primary bg-primary/10 text-primary shadow-xs" : "border-muted text-muted-foreground bg-muted/10"
                                        )}>
                                            <Wallet className="h-5 w-5 text-purple-500 flex-shrink-0"/>
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs text-foreground">Cash on Delivery</div>
                                                <div className="text-[9px] text-muted-foreground truncate">Pay upon arrival</div>
                                            </div>
                                        </Label>
                                    </div>
                                </RadioGroup>
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

                                    {/* Fee Transparency */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Platform Fee</span>
                                        <div className="flex items-center gap-1.5 text-[11px]">
                                            <span className="line-through text-muted-foreground/60">₹10.00</span>
                                            <span className="font-bold text-green-600 dark:text-green-400">FREE</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground">Gateway Fee (2% + GST)</span>
                                        {paymentMethod === 'PAY_NOW' ? (
                                            <span className="font-medium text-foreground text-[11px]">₹{gatewayFee.toFixed(2)}</span>
                                        ) : (
                                            <span className="font-bold text-green-600 dark:text-green-400 text-[11px]">₹0.00 (COD)</span>
                                        )}
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

                        <CardFooter className="p-3 sm:p-4 bg-purple-900/5 border-t border-purple-500/10 flex flex-col sm:flex-row gap-2.5 justify-between items-center">
                            <div className="text-[10px] text-muted-foreground text-center sm:text-left">
                                By placing this order, you agree to our Terms & Conditions.
                            </div>
                            <Button 
                                type="submit" 
                                size="default" 
                                className="w-full sm:w-auto text-sm px-6 py-2.5 rounded-xl font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-500/20" 
                                disabled={!canCheckout || isPlacingOrder}
                            >
                                {isPlacingOrder ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Initiating Payment...
                                    </>
                                ) : (
                                    <>
                                        <Rocket className="mr-2 h-4 w-4"/>
                                        {paymentMethod === 'COD' ? `Place Order (COD) • ₹${finalPrice.toFixed(2)}` : `Pay Now • ₹${finalPrice.toFixed(2)}`}
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </main>
        </div>
    );
}

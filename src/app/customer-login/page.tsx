'use client';

import { useState, useEffect, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { User, Rocket, Utensils, KeyRound, MessageSquareQuote, Mail, CheckCircle, Sparkles, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useCustomer } from '@/context/customer-context';
import Link from 'next/link';
import { useOrder } from '@/context/order-context';
import type { Order, Customer } from '@/types';
import { Separator } from '@/components/ui/separator';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-6 w-6">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);

function CustomerLoginContent() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login, loginWithGoogle, loginAsDemo, customer } = useCustomer();
    const { orders } = useOrder();
    const [isDemoLoading, setIsDemoLoading] = useState(false);

    const redirectUrl = searchParams.get('redirectUrl');

     const checkAndPromptForFeedback = (user: { username: string }) => {
        const customerOrders = orders
            .filter(order => order.customerUsername === user.username && order.status === 'Delivered')
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (customerOrders.length === 0) return;

        const lastOrder = customerOrders[0];
        
        const isVendorFeedbackMissing = lastOrder.vendorRating === undefined;
        const areItemFeedbacksMissing = lastOrder.items.some(item => item.rating === undefined);

        if (isVendorFeedbackMissing || areItemFeedbacksMissing) {
            toast({
                title: "Your Feedback is Valuable!",
                description: (
                     <div>
                        <p>You have pending feedback for your last order. Please take a moment to rate it.</p>
                         <Link href="/track">
                            <Button variant="link" className="p-0 h-auto text-sm">Go to My Orders</Button>
                        </Link>
                    </div>
                ),
                action: <MessageSquareQuote className="h-6 w-6 text-primary"/>,
                duration: Infinity
            });
        }
    }

    const handleLoginSuccess = (loggedInCustomer: Customer, wasLinkingGoogle = false) => {
        checkAndPromptForFeedback({ username: loggedInCustomer.username });

        const isProfileIncomplete = !loggedInCustomer.email || !loggedInCustomer.termsAccepted || !loggedInCustomer.address || !loggedInCustomer.latitude || !loggedInCustomer.longitude;
        // Skip phone verification check for demo customers
        const isPhoneUnverified = !loggedInCustomer.phoneVerified && !loggedInCustomer.isDemoCustomer;

        if (isProfileIncomplete) {
             router.push('/customer-details');
             return;
        }

        if (isPhoneUnverified) {
            router.push('/verify-phone');
            return;
        }
        
        if (redirectUrl) {
            router.push(redirectUrl);
            return;
        }
        
        router.push('/menu');
    }

    useEffect(() => {
        if(customer) {
            handleLoginSuccess(customer);
        }
    }, []);


    const handleGoogleLogin = async () => {
        try {
            const loggedInCustomer = await loginWithGoogle();
             toast({
                title: `Welcome, ${loggedInCustomer.name || loggedInCustomer.username}!`,
                description: "Signed in with Google.",
            });
            handleLoginSuccess(loggedInCustomer, true);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDemoLogin = async () => {
        setIsDemoLoading(true);
        try {
            const loggedInCustomer = await loginAsDemo();
            toast({
                title: "Welcome to the Demo!",
                description: "You are now exploring the customer experience as a guest.",
            });
            handleLoginSuccess(loggedInCustomer);
        } catch (error: any) {
            // Error is handled in context
        } finally {
            setIsDemoLoading(false);
        }
    };


  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
      >
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-purple-500/20 box-glow-accent rounded-3xl">
        <CardHeader>
          <div className="flex items-center justify-center gap-3 mb-2">
              <User className="h-8 w-8 text-purple-500"/>
              <CardTitle className="font-headline text-4xl text-center text-purple-500">User Login</CardTitle>
          </div>
          <CardDescription className="text-center">Just enjoy login and sign up via Google</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-4">
                <Button 
                    type="button" 
                    variant="outline" 
                    size="lg" 
                    className="w-full text-lg border-neutral-700 rounded-full flex items-center gap-2" 
                    onClick={handleGoogleLogin}
                    disabled={isDemoLoading}
                >
                    <GoogleIcon />
                    <span>Login / Sign up with Google</span>
                </Button>

                <Button 
                    type="button" 
                    variant="secondary" 
                    size="lg" 
                    className="w-full text-lg rounded-full flex items-center gap-2" 
                    onClick={handleDemoLogin}
                    disabled={isDemoLoading}
                >
                    {isDemoLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6 text-primary" />}
                    Try Demo User
                </Button>
            </div>
             <div className="text-sm text-muted-foreground pt-4 space-y-2">
                <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-500 flex-shrink-0"/>
                    <span>No need to remember username and passwords.</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-500 flex-shrink-0"/>
                    <span>Faster, more secure login experience.</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 mt-1 text-green-500 flex-shrink-0"/>
                    <span>Receive order notifications and invoices via email.</span>
                </div>
            </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
           <Link href="/menu" passHref className="w-full">
            <Button variant="outline" size="lg" className="w-full text-lg border-neutral-700 rounded-full">
                <Utensils className="mr-2 h-5 w-5"/>
                Back to Menu
            </Button>
          </Link>
        </CardFooter>
      </Card>
      </motion.div>
    </div>
  );
}


export default function CustomerLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CustomerLoginContent />
        </Suspense>
    )
}

'use client';

import { useState, Suspense, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, UserPlus, Utensils, KeyRound, Mail, Loader2, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useVendor } from '@/context/vendor-context';
import Link from 'next/link';
import type { Vendor } from '@/types';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-6 w-6">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);


function AdminLoginContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const { loginWithGoogle, loginAsDemo, vendor, isAuthLoading } = useVendor();
    const [isDemoLoading, setIsDemoLoading] = useState(false);

    const redirectUrl = searchParams.get('redirectUrl');

    const handleRedirect = (targetVendor: Vendor) => {
        if (redirectUrl) {
            router.push(redirectUrl);
            return;
        }

        if (!targetVendor.isApproved || !targetVendor.shopName || !targetVendor.termsAccepted) {
            router.push('/admin/details');
            return;
        }
        
        router.push('/admin/dashboard/orders');
    };
    
    // This effect handles redirection for already logged-in users.
    useEffect(() => {
        if (!isAuthLoading && vendor) {
            handleRedirect(vendor);
        }
    }, [isAuthLoading, vendor]);

    
    const handleGoogleLogin = async () => {
        try {
            const loggedInVendor = await loginWithGoogle();
             toast({
                title: "Welcome, " + (loggedInVendor.name || 'Vendor') + "!",
                description: "Signed in with Google.",
            });
        } catch (error: any) {
            // Error is handled in the context
        }
    };

    const handleDemoLogin = async () => {
        setIsDemoLoading(true);
        try {
            await loginAsDemo();
            toast({
                title: "Welcome to the Demo!",
                description: "You are now exploring the vendor platform as a guest.",
            });
        } catch (error: any) {
            // Error is handled in the context
        } finally {
            setIsDemoLoading(false);
        }
    };

  // While checking auth state, or if a user is found and we are redirecting, show a loader.
  if (isAuthLoading || vendor) {
    return (
        <div className="flex flex-1 items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
  }

  // Only show the login form if not loading and no user is found.
  return (
    <div className="flex flex-1 items-center justify-center p-4">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-primary/20 box-glow-primary rounded-3xl">
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-2">
                <Shield className="h-8 w-8 text-primary"/>
                <CardTitle className="font-headline text-4xl text-center text-primary">Vendor Login</CardTitle>
            </div>
            <CardDescription className="text-center">Access the vendor dashboard.</CardDescription>
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
                        Sign in with Google
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
                        Try Demo Vendor
                    </Button>
                </div>
                 <div className="text-center text-sm text-muted-foreground pt-2">
                    Use Google for the best experience. The demo account allows you to explore the platform features.
                </div>
              </CardContent>
          <CardFooter className="flex-col gap-4">
          </CardFooter>
        </Card>
        </motion.div>
    </div>
  );
}

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <AdminLoginContent />
        </Suspense>
    )
}
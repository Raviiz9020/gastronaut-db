
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, KeyRound, Utensils } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useSuperAdmin } from '@/context/super-admin-context';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-6 w-6">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);


export default function SuperAdminLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { loginWithGoogle } = useSuperAdmin();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        try {
            await loginWithGoogle();
            toast({
                title: 'Super Admin Login Successful',
                description: 'Redirecting to the main dashboard...',
            });
            router.push('/super-admin/dashboard');
        } catch (error: any) {
            // Error toast is handled in the context
        } finally {
            setIsLoading(false);
        }
    }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
        >
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-destructive/20 box-glow-accent rounded-3xl">
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-2">
                <Crown className="h-8 w-8 text-destructive"/>
                <CardTitle className="font-headline text-4xl text-center text-destructive">Super Admin Login</CardTitle>
            </div>
            <CardDescription className="text-center">Access the main control panel.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoogleLogin} className="w-full border-neutral-700" variant="outline" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : (
                    <>
                        <GoogleIcon />
                        <span className="ml-2">Sign in with Google</span>
                    </>
                )}
            </Button>
          </CardContent>
        </Card>
        </motion.div>
    </div>
  );
}

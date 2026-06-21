
'use client';

import { useState, useTransition, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { KeyRound, Loader2, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { sendOtp } from '@/ai/flows/send-otp';

function ForgotPasswordContent() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [username, setUsername] = useState('');
    const [isSending, startSending] = useTransition();

    const userType = searchParams.get('type') === 'vendor' ? 'vendor' : 'customer';
    
    // Redirect customer to login page, as they should use Google to recover.
    useEffect(() => {
        if (userType === 'customer') {
            router.replace('/customer-login');
        }
    }, [userType, router]);
    
    if (userType === 'customer') {
        return null; // Render nothing while redirecting
    }
    
    const accentColor = userType === 'vendor' ? 'text-accent' : 'text-purple-500';

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        startSending(async () => {
            try {
                const response = await sendOtp({ username, userType });
                if(response.success) {
                    toast({
                        title: `OTP Sent!`,
                        description: `The OTP for testing is: ${response.otpForDemo}. It will expire in 5 minutes.`,
                        duration: 10000,
                    });
                    router.push(`/reset-password?username=${username}&type=${userType}`);
                } else {
                    toast({ title: "Failed to send OTP", description: response.message, variant: "destructive" });
                }
            } catch (error: any) {
                 toast({
                    title: "An Error Occurred",
                    description: error.message || "Something went wrong.",
                    variant: "destructive",
                });
            }
        });
    }

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
      >
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-purple-500/20 box-glow-accent rounded-3xl">
          <form onSubmit={handleSendOtp}>
        <CardHeader>
          <div className="flex items-center justify-center gap-3 mb-2">
              <KeyRound className={`h-8 w-8 ${accentColor}`}/>
              <CardTitle className={`font-headline text-4xl text-center ${accentColor}`}>Forgot Password</CardTitle>
          </div>
          <CardDescription className="text-center">Enter your username to receive a password reset OTP.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} required/>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" size="lg" className="w-full text-lg border-neutral-700" variant="outline" disabled={isSending}>
            {isSending ? <Loader2 className="animate-spin" /> : 'Send OTP'}
          </Button>
          <Link href={userType === 'vendor' ? '/admin/login' : '/customer-login'} passHref className="w-full">
            <Button variant="outline" size="lg" className="w-full text-lg border-neutral-700" type="button">
                <ArrowLeft className="mr-2 h-5 w-5"/>
                Back to Login
            </Button>
          </Link>
        </CardFooter>
        </form>
      </Card>
      </motion.div>
    </div>
  );
}

export default function ForgotPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ForgotPasswordContent />
        </Suspense>
    )
}

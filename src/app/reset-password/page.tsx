
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
import { verifyOtpAndResetPassword } from '@/ai/flows/verify-otp';

function ResetPasswordContent({ username, userType }: { username: string, userType: 'vendor' | 'customer' }) {
    const { toast } = useToast();
    const router = useRouter();
    
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isResetting, startResetting] = useTransition();
    
    const accentColor = userType === 'vendor' ? 'text-accent' : 'text-purple-500';
    
    useEffect(() => {
        if (!username) {
            toast({ title: "Invalid Request", description: "Username is missing. Please start over.", variant: 'destructive'});
            router.replace('/forgot-password');
        }
    }, [username, router, toast]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ title: "Passwords Mismatch", description: "The new passwords do not match.", variant: 'destructive'});
            return;
        }

        startResetting(async () => {
            try {
                const response = await verifyOtpAndResetPassword({ username, userType, otp, newPassword });
                if(response.success) {
                    toast({
                        title: `Password Reset Successfully!`,
                        description: `You can now log in with your new password.`,
                    });
                    const loginPath = userType === 'vendor' ? '/admin/login' : '/customer-login';
                    router.push(loginPath);
                } else {
                    toast({ title: "Failed to reset password", description: response.message, variant: "destructive" });
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
          <form onSubmit={handleResetPassword}>
        <CardHeader>
          <div className="flex items-center justify-center gap-3 mb-2">
              <KeyRound className={`h-8 w-8 ${accentColor}`}/>
              <CardTitle className={`font-headline text-4xl text-center ${accentColor}`}>Reset Password</CardTitle>
          </div>
          <CardDescription className="text-center">Enter the OTP sent to your registered number and set a new password.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
              <Label htmlFor="otp">One-Time Password (OTP)</Label>
              <Input id="otp" placeholder="Enter 6-digit OTP" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6}/>
          </div>
           <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required/>
          </div>
           <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required/>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" size="lg" className="w-full text-lg border-neutral-700" variant="outline" disabled={isResetting}>
            {isResetting ? <Loader2 className="animate-spin" /> : 'Reset Password and Login'}
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

function ResetPasswordPageWrapper() {
    const searchParams = useSearchParams();
    const username = searchParams.get('username') || '';
    const userType = searchParams.get('type') === 'vendor' ? 'vendor' : 'customer';

    return <ResetPasswordContent username={username} userType={userType} />;
}


export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordPageWrapper />
        </Suspense>
    )
}

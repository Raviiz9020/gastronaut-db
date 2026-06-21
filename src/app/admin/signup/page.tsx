

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useVendor } from '@/context/vendor-context';
import Link from 'next/link';

export default function AdminSignupPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { signup } = useVendor();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast({
                title: "Passwords Don't Match",
                description: "Please re-enter your passwords.",
                variant: "destructive",
            });
            return;
        }

        if (!username || !password) {
            toast({
                title: "Signup Failed",
                description: "Please enter a username and password.",
                variant: "destructive",
            });
            return;
        }
        try {
            await signup(username, password);
            router.push('/admin/details');
        } catch (error: any) {
             toast({
                title: "Signup Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    };


  return (
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
      >
      <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-accent/20 box-glow-accent rounded-3xl">
          <form onSubmit={handleSignup}>
        <CardHeader>
          <div className="flex items-center justify-center gap-3 mb-2">
              <UserPlus className="h-8 w-8 text-accent"/>
              <CardTitle className="font-headline text-4xl text-center text-accent">Vendor Signup</CardTitle>
          </div>
          <CardDescription className="text-center">Create a new vendor account. You will be assigned an email like username@hyperplate.app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" placeholder="vendor_user" value={username} onChange={(e) => setUsername(e.target.value)} required/>
          </div>
          <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required/>
          </div>
          <div className="space-y-2">
              <Label htmlFor="confirm-password">Re-enter Password</Label>
              <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required/>
          </div>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" size="lg" className="w-full text-lg border-neutral-700">
              Sign Up
          </Button>
           <Link href="/admin/login" passHref className="w-full">
            <Button variant="outline" size="lg" className="w-full text-lg border-neutral-700" type="button">
                <ChevronLeft className="mr-2 h-5 w-5"/>
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


'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Bike, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useRider } from '@/context/rider-context';

export default function RiderLoginPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { login } = useRider();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(username, password);
            toast({
                title: 'Login Successful',
                description: 'Welcome back!',
            });
            router.push('/rider/dashboard');
        } catch (error: any) {
            toast({
                title: 'Login Failed',
                description: error.message,
                variant: 'destructive',
            });
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
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-green-500/20 box-glow-accent rounded-3xl">
            <form onSubmit={handleSubmit}>
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-2">
                <Bike className="h-8 w-8 text-green-500"/>
                <CardTitle className="font-headline text-4xl text-center text-green-500">Rider Login</CardTitle>
            </div>
            <CardDescription className="text-center">Access your delivery dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="rider_username" required value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="••••••••" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" size="lg" className="w-full text-lg" variant="destructive" disabled={isLoading}>
                <KeyRound className="mr-2 h-5 w-5"/>
                {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </CardFooter>
          </form>
        </Card>
        </motion.div>
    </div>
  );
}

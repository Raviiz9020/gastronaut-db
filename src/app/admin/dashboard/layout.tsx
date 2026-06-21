

'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition, Suspense } from 'react';
import AdminSidebar from './admin-sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, Mail, Store, Building as BuildingIcon, Loader2, Settings } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOrder } from '@/context/order-context';
import { useMenu } from '@/context/menu-context';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useVendor } from '@/context/vendor-context';
import type { Order, OrderStatus, GmbLocation } from '@/types';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { generateGmbAuthUrl } from '@/ai/flows/handle-gbp-oauth';
import GmbLocationDialog from './gmb-location-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);

const EmailPromptDialog = ({ isOpen, onLink }: { isOpen: boolean, onLink: () => void }) => {
    return (
        <AlertDialog open={isOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex justify-center mb-2">
                      <Mail className="h-8 w-8 text-primary"/>
                    </div>
                    <AlertDialogTitle className="text-center">Email Address Required</AlertDialogTitle>
                    <AlertDialogDescription className="text-center">
                        For account security and notifications, please link a Google account to add an email address to your profile.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogAction onClick={onLink} className="flex items-center gap-2">
                    <GoogleIcon /> Link Google Account
                </AlertDialogAction>
            </AlertDialogContent>
        </AlertDialog>
    )
}

let audioContext: AudioContext | null = null;
let isAudioReady = false;

const initAudio = () => {
    if (audioContext || typeof window === 'undefined') return;
    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                isAudioReady = true;
            });
        } else {
            isAudioReady = true;
        }
    } catch (e) {
        console.error("Could not create AudioContext:", e);
    }
};

const playSound = () => {
    if (!isAudioReady || !audioContext) {
        // Fallback for browsers that block generated tones but allow audio files
        const audio = new Audio("/sounds/new-order.mp3");
        audio.play().catch(() => {
            console.warn("Audio file could not be played automatically.");
        });
        return;
    }
    
    try {
        const playTone = (frequency: number, startTime: number, duration: number) => {
            if (!audioContext) return;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(frequency, startTime);
            gainNode.gain.setValueAtTime(0.0001, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);
            
            oscillator.start(startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
            oscillator.stop(startTime + duration);
        }

        const now = audioContext.currentTime;
        playTone(880, now, 0.15); 
        playTone(880, now + 0.2, 0.15); 

    } catch(e) {
        console.error("Could not play sound", e);
    }
};


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { toast } = useToast();
    const { vendor, loginWithGoogle, updateDetails, logout: vendorLogout } = useVendor();
    const { orders, loadUserOrders } = useOrder();
    const { fetchAllItems } = useMenu();
    const [isMounted, setIsMounted] = useState(false);
    
    const [isGmbDialogOpen, setIsGmbDialogOpen] = useState(false);
    const [gmbLocations, setGmbLocations] = useState<GmbLocation[]>([]);

    useEffect(() => {
        window.addEventListener('click', initAudio, { once: true });
        window.addEventListener('touchstart', initAudio, { once: true });

        const resumeAudio = () => {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    isAudioReady = true;
                });
            }
        };
        document.addEventListener('visibilitychange', resumeAudio);
        
        return () => {
            window.removeEventListener('click', initAudio);
            window.removeEventListener('touchstart', initAudio);
            document.removeEventListener('visibilitychange', resumeAudio);
        };
    }, []);
    
    useEffect(() => {
      // Safari sometimes stays "suspended" even after click
      const ensureAudioReady = setInterval(() => {
        if (audioContext && audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            isAudioReady = true;
          }).catch(() => {});
        }
      }, 5000); // re-check every 5s silently in background
      return () => clearInterval(ensureAudioReady);
    }, []);


    useEffect(() => {
        const status = searchParams.get('gmb_status');
        const error = searchParams.get('error');
        const locationsParam = searchParams.get('locations');

        if (status === 'choose_location' && locationsParam) {
            try {
                const decodedLocations = JSON.parse(decodeURIComponent(locationsParam));
                setGmbLocations(decodedLocations);
                setIsGmbDialogOpen(true);
            } catch(e) {
                console.error("Failed to parse GMB locations", e);
                toast({ title: "Error", description: "Could not read business locations from Google.", variant: "destructive" });
            }
        } else if (status === 'success' && locationsParam) {
             try {
                const decodedLocations = JSON.parse(decodeURIComponent(locationsParam));
                if (Array.isArray(decodedLocations) && decodedLocations.length === 1 && vendor) {
                    handleLocationSelect(decodedLocations[0].locationId);
                } else if (Array.isArray(decodedLocations) && decodedLocations.length > 1) {
                    setGmbLocations(decodedLocations);
                    setIsGmbDialogOpen(true);
                }
            } catch(e) {
                console.error("Failed to parse GMB locations", e);
            }
        } else if (error) {
            toast({ title: "Connection Failed", description: decodeURIComponent(error), variant: "destructive" });
        }

        // Clean up URL params
        if(status || error) {
        router.replace('/admin/dashboard', { scroll: false });
        }

    }, [searchParams, toast, router, vendor]);

    
    const activeOrderStatuses: OrderStatus[] = ['Order Placed', 'Processing', 'Out for Delivery', 'Accepted', 'Order Ready'];
    
    const vendorActiveOrders = useMemo(() => {
        if (!vendor) return [];
        return orders.filter(o => o.vendorUsername === vendor.username && activeOrderStatuses.includes(o.status));
    }, [orders, vendor]);

    const previousActiveOrderCount = useRef(0);

    useEffect(() => {
        if (vendor?.username) {
            const unsubscribe = loadUserOrders(vendor.username, 'vendor');
            fetchAllItems();
            return () => {
                if (unsubscribe) unsubscribe();
            };
        }
    }, [vendor?.username, loadUserOrders, fetchAllItems]);

    useEffect(() => {
        if (!isMounted) {
            setIsMounted(true);
            previousActiveOrderCount.current = vendorActiveOrders.length;
            return;
        }

        if (vendorActiveOrders.length > previousActiveOrderCount.current) {
            const newOrder = vendorActiveOrders.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
            if (newOrder) {
                playSound();
                toast({
                    title: 'New Order Received!',
                    description: (
                        <div>
                            <p>Order #{newOrder.displayId || newOrder.orderId} for ₹{newOrder.totalPrice.toFixed(2)} has been placed.</p>
                            <Link href="/admin/dashboard/orders">
                                <Button variant="link" className="p-0 h-auto text-primary">View Orders</Button>
                            </Link>
                        </div>
                    ),
                    duration: 3000,
                });
            }
        }
        
        previousActiveOrderCount.current = vendorActiveOrders.length;
    }, [vendorActiveOrders, isMounted, vendor, toast]);
    

    const handleLogout = () => {
        vendorLogout();
        router.push('/admin/login');
    };

    const handleLinkGoogle = async () => {
        try {
            await loginWithGoogle();
        } catch (error) {
            console.error("Failed to link google account from dashboard layout", error);
        }
    }
    
    const handleLocationSelect = async (locationId: string) => {
        if(!vendor) return;
        try {
            await updateDetails({ ...vendor, gmbLocationId: locationId } as any);
            toast({ title: "Business Linked!", description: "Your Google Business Profile has been successfully linked." });
            setIsGmbDialogOpen(false);
        } catch(e: any) {
            toast({ title: "Error", description: "Could not link the business profile.", variant: "destructive" });
        }
    };


    const showEmailPrompt = isMounted && vendor && !vendor.email;
    const vendorUrl = vendor ? `/vendor/${vendor.slug || vendor.username}` : '/';

    return (
        <div className="flex h-screen">
            <AdminSidebar />
            <main className="flex-1 flex flex-col overflow-y-auto">
                <header className="flex items-center justify-between p-4 border-b border-primary/10 gap-4">
                    <div>{/* This empty div helps with the flexbox layout */}</div>
                    <div className="flex items-center gap-2">
                         <Link href={vendorUrl} passHref>
                            <Button variant="outline">
                                <Store className="mr-2 h-4 w-4"/> Menu
                            </Button>
                        </Link>
                        {vendor && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex items-center gap-2">
                                    <Avatar className="h-8 w-8">
                                        {vendor.imageUrl && <AvatarImage src={vendor.imageUrl} alt={vendor.name} />}
                                        <AvatarFallback>{vendor.name.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="hidden sm:inline-block">{vendor.name}</span>
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => router.push('/admin/details')}>
                                    <Settings className="mr-2 h-4 w-4"/>
                                    Shop Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4"/>
                                    Logout
                                </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
                 <EmailPromptDialog isOpen={showEmailPrompt} onLink={handleLinkGoogle}/>
                 <GmbLocationDialog 
                    isOpen={isGmbDialogOpen}
                    onOpenChange={setIsGmbDialogOpen}
                    locations={gmbLocations}
                    onLocationSelect={handleLocationSelect}
                />
            </main>
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Suspense fallback={
            <div className="flex h-full w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <DashboardLayoutContent>{children}</DashboardLayoutContent>
        </Suspense>
    );
}


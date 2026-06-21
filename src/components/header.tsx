'use client';

import Link from 'next/link';
import { Package, Utensils, User, LogOut, LogIn, Shield, Crown, Wand2, Info, Settings, Users, Sparkles, ShoppingCart, Heart, Award, Building, Table, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { useCart } from '@/context/cart-context';
import { Badge } from './ui/badge';
import CartSheet from './cart-sheet';
import { useState, useEffect, useMemo, useTransition } from 'react';
import { useCustomer } from '@/context/customer-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import Logo from './logo';
import type { Vendor } from '@/types';
import { useVendor } from '@/context/vendor-context';
import { addDays, format, parseISO } from 'date-fns';
import { Separator } from './ui/separator';
import { LocationPicker } from './location-picker';

const navLinks = [
  { href: '/menu', label: 'Menu', icon: Utensils },
  { href: '/specials', label: 'Specials', icon: Sparkles },
  { href: '/track', label: 'Track Order', icon: Package },
  { href: '/vendor-details', label: 'Our Vendors', icon: Users },
  { href: '/benefits', label: 'Why Us?', icon: Heart },
  { href: '/about', label: 'About Us', icon: Info },
];

interface HeaderProps {
    pageVendor?: Vendor | null;
}

export default function Header({ pageVendor }: HeaderProps) {
  const { totalItems, totalPrice } = useCart();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { customer, logout, fetchCustomer, isAuthLoading: isCustomerLoading } = useCustomer();
  const { vendor: loggedInVendor, vendors } = useVendor();
  const router = useRouter();
  const pathname = usePathname();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isCustomerLoading && customer) {
      const isProfileIncomplete = !customer.email || !customer.termsAccepted || !customer.address || !customer.contact || !customer.latitude || !customer.longitude;
      const isOnDetailsPage = pathname === '/customer-details';
      
      if (isProfileIncomplete && !isOnDetailsPage) {
        router.push('/customer-details');
      }
    }
  }, [customer, pathname, router, isCustomerLoading]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleLoginClick = () => {
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
    router.push(`/customer-login?redirectUrl=${redirectUrl}`);
  };
  
  const handleVendorLoginClick = () => {
    const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
    router.push(`/admin/login?redirectUrl=${redirectUrl}`);
  }

  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/super-admin');
  
  const authRoutes = [
    '/customer-login', 
    '/customer-signup', 
    '/customer-details', 
    '/forgot-password', 
    '/reset-password', 
    '/about', 
    '/vendor-details',
  ];

  if (isAdminRoute || authRoutes.includes(pathname)) {
    return null;
  }
  
  const isVendorOwner = pageVendor && loggedInVendor && pageVendor.username === loggedInVendor.username;
  const showVendorLogin = pageVendor && !isVendorOwner;

  const titleColors = [
    "text-red-500", "text-orange-500", "text-yellow-500", "text-green-500",
    "text-blue-500", "text-indigo-500", "text-purple-500", "text-pink-500",
    "text-red-400", "text-orange-400", "text-yellow-400", "text-green-400", "text-blue-400"
  ];
  
  const { availablePoints, pointsExpiryDate, vendorPointsBreakdown } = useMemo(() => {
    if (!customer) return { availablePoints: 0, pointsExpiryDate: null, vendorPointsBreakdown: [] };
    
    const totalPoints = Object.values(customer.hyperPoints || {}).reduce((sum, points) => sum + points, 0);
    const totalLockedPoints = Object.values(customer.lockedPoints || {}).reduce((sum, points) => sum + points, 0);
    const availablePoints = totalPoints - totalLockedPoints;

    let expiry: string | null = null;
    if (customer.lastActivityDate && availablePoints > 0) {
        const expiryDate = addDays(parseISO(customer.lastActivityDate), 60);
        expiry = format(expiryDate, 'dd MMM yyyy');
    }

    const breakdown = Object.entries(customer.hyperPoints || {})
      .map(([vendorId, points]) => {
        const vendor = vendors.find(v => v.username === vendorId);
        const locked = customer.lockedPoints?.[vendorId] || 0;
        return {
          vendorName: vendor?.shopName || 'Unknown Vendor',
          available: points - locked,
        };
      })
      .filter(item => item.available > 0)
      .sort((a,b) => b.available - a.available);
    
    return { availablePoints, pointsExpiryDate: expiry, vendorPointsBreakdown: breakdown };
  }, [customer, vendors]);
  
  const handleRefreshPoints = async () => {
    if (!customer) return;
    setIsRefreshing(true);
    await fetchCustomer(customer.username);
    setIsRefreshing(false);
  }

  const vendorTableUrl = useMemo(() => {
    if (isVendorOwner && pageVendor) {
      const identifier = pageVendor.slug || pageVendor.username;
      return `/vendor/${identifier}/tables`;
    }
    return null;
  }, [isVendorOwner, pageVendor]);


  return (
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/95 backdrop-blur-sm">
      {customer?.isDemoCustomer && (
        <div className="bg-primary/10 text-primary py-1.5 px-4 text-center text-[10px] sm:text-xs font-bold border-b border-primary/20 animate-pulse">
          DEMO MODE: You are viewing sample shops only. Orders placed will not be fulfilled.
        </div>
      )}
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
             <motion.div
              animate={{ rotateY: 360 }}
              transition={{
                duration: 4,
                ease: "linear",
                repeat: Infinity,
              }}
              className="h-10 w-10 rounded-full"
            >
              <Logo className="h-full w-full text-primary" />
            </motion.div>
            <div className="font-headline text-2xl font-bold hidden sm:flex overflow-hidden">
                {"Hyper Delivery".split("").map((char, index) => (
                    <span
                        key={`${char}-${index}`}
                        className={cn(titleColors[index % titleColors.length])}
                        style={{ whiteSpace: 'pre' }}
                    >
                        {char}
                    </span>
                ))}
            </div>
            </Link>
            {!isAdminRoute && !pathname.startsWith('/rider') && (
                <LocationPicker variant="full" className="hidden md:flex" />
            )}
            <nav className="hidden md:flex items-center gap-4 landscape:hidden">
                {navLinks.map(link => (
                     <Link key={link.href} href={link.href} passHref>
                        <Button variant={pathname === link.href ? 'secondary' : 'ghost'}>
                           {link.label}
                        </Button>
                     </Link>
                ))}
            </nav>
        </div>
        
        <div className="flex items-center gap-4">
            {isVendorOwner && loggedInVendor ? (
                <div className="flex items-center gap-2">
                  {vendorTableUrl && (
                    <Link href={vendorTableUrl} passHref>
                      <Button variant="outline" size="icon">
                        <Table />
                      </Button>
                    </Link>
                  )}
                 <Link href="/admin/dashboard/orders/live" passHref>
                    <Button className="text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move">
                        Live Orders
                    </Button>
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            {loggedInVendor.imageUrl && <AvatarImage src={loggedInVendor.imageUrl} alt={loggedInVendor.name} />}
                            <AvatarFallback>{loggedInVendor.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="hidden sm:inline-block">{loggedInVendor.name}</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Vendor Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
                        <Settings className="mr-2 h-4 w-4"/>
                        Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                        <LogOut className="mr-2 h-4 w-4"/>
                        Logout
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            ) : showVendorLogin ? (
                <Button variant="outline" onClick={handleVendorLoginClick}>
                    <LogIn className="mr-2 h-4 w-4"/>
                    Vendor
                </Button>
            ) : null}

            {!isVendorOwner && (
              <div className="relative">
                 <Button
                    variant="outline"
                    className={cn(
                        "border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white flex items-center gap-2 px-4",
                        totalItems > 0 && "animate-bounce"
                    )}
                    onClick={() => setIsCartOpen(true)}
                >
                    <ShoppingCart className="h-5 w-5" />
                    <span>
                      {totalPrice > 0 ? `₹${totalPrice.toFixed(2)}` : 'Cart'}
                    </span>
                </Button>
                {totalItems > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full p-0"
                  >
                    {totalItems}
                  </Badge>
                )}
              </div>
            )}

            {customer && !isVendorOwner ? (
                 <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                {customer.imageUrl && <AvatarImage src={customer.imageUrl} alt={customer.name} />}
                                <AvatarFallback>{customer.name.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <span className="hidden sm:inline-block">{customer.name}</span>
                        </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>My Account</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="flex-col items-start gap-1 focus:bg-transparent">
                              <div className="flex items-center">
                                  <Award className="mr-2 h-4 w-4 text-primary" />
                                  <span className="font-semibold">Points: {availablePoints}</span>
                              </div>
                              {pointsExpiryDate && availablePoints > 0 && (
                                  <p className="text-xs text-destructive ml-6">
                                      Expires on: {pointsExpiryDate}
                                  </p>
                              )}
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                           <DropdownMenuLabel className="text-xs text-muted-foreground px-2 flex justify-between items-center">
                                <span>Points by Vendor</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleRefreshPoints}>
                                     <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                                </Button>
                           </DropdownMenuLabel>
                          {vendorPointsBreakdown.length > 0 ? (
                              <div className="max-h-40 overflow-y-auto px-2">
                                {vendorPointsBreakdown.map(item => (
                                  <div key={item.vendorName} className="flex justify-between items-center text-xs py-1">
                                    <div className="flex items-center gap-2 truncate">
                                        <Building className="h-3 w-3 text-muted-foreground"/>
                                        <span className="truncate">{item.vendorName}</span>
                                    </div>
                                    <span className="font-mono font-semibold text-green-600 dark:text-green-400">{item.available} HP</span>
                                  </div>
                                ))}
                              </div>
                          ) : (
                            <p className="px-2 text-xs text-muted-foreground">No points earned yet.</p>
                          )}
                          
                          <DropdownMenuSeparator />
                           <DropdownMenuItem onClick={() => router.push('/track')}>
                              <Package className="mr-2 h-4 w-4"/>
                              My Orders
                          </DropdownMenuItem>
                           <DropdownMenuItem onClick={() => router.push('/customer-details')}>
                              <Settings className="mr-2 h-4 w-4"/>
                              My Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={handleLogout}>
                              <LogOut className="mr-2 h-4 w-4"/>
                              Logout
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                 </div>
            ) : (
                !loggedInVendor && !isVendorOwner && (
                  <div className="flex items-center gap-2">
                      <Button variant="outline" onClick={handleLoginClick}>
                          <User className="mr-2 h-4 w-4"/>
                          <span>Login</span>
                      </Button>
                  </div>
                )
            )}
        </div>
      </div>
       <CartSheet open={isCartOpen} onOpenChange={setIsCartOpen} />
    </header>
  );
}

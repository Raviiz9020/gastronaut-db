'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Utensils, 
  Package, 
  Store, 
  Menu as MenuIcon, 
  Heart, 
  Info, 
  FileText, 
  ShieldCheck, 
  RotateCcw, 
  User, 
  LogOut, 
  LogIn,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCustomer } from '@/context/customer-context';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

export default function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { customer, logout } = useCustomer();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  // Hide on admin, super-admin, and rider routes
  const isExcludedRoute = 
    pathname.startsWith('/admin') || 
    pathname.startsWith('/super-admin') || 
    pathname.startsWith('/rider') ||
    pathname === '/customer-login' ||
    pathname === '/customer-signup' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password';

  if (isExcludedRoute) {
    return null;
  }

  const navItems = [
    { href: '/', label: 'Home', icon: Home, exact: true },
    { href: '/menu', label: 'Menu', icon: Utensils },
    { href: '/track', label: 'Orders', icon: Package },
    { href: '/vendor-details', label: 'Kitchens', icon: Store },
  ];

  const handleNavigate = (href: string) => {
    setIsMoreOpen(false);
    router.push(href);
  };

  const handleAuthAction = () => {
    setIsMoreOpen(false);
    if (customer) {
      logout();
      router.push('/');
    } else {
      const redirectUrl = encodeURIComponent(window.location.pathname + window.location.search);
      router.push(`/customer-login?redirectUrl=${redirectUrl}`);
    }
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-primary/15 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]">
      <nav className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200",
                isActive 
                  ? "text-primary font-bold scale-105" 
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
            >
              <div className={cn(
                "p-1 rounded-full transition-colors",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")} />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5">{item.label}</span>
            </Link>
          );
        })}

        {/* More Options Tab (Drawer) */}
        <Sheet open={isMoreOpen} onOpenChange={setIsMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 transition-all duration-200",
                isMoreOpen || pathname === '/about' || pathname === '/benefits' || pathname === '/cancellation-refund-policy'
                  ? "text-primary font-bold scale-105" 
                  : "text-muted-foreground hover:text-foreground font-medium"
              )}
            >
              <div className={cn(
                "p-1 rounded-full transition-colors",
                (isMoreOpen || pathname === '/about' || pathname === '/benefits') && "bg-primary/10"
              )}>
                <MenuIcon className="h-5 w-5" />
              </div>
              <span className="text-[11px] tracking-tight mt-0.5">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl max-h-[85vh] overflow-y-auto px-5 pb-8 pt-6">
            <SheetHeader className="text-left pb-3">
              <SheetTitle className="text-lg font-headline font-bold text-primary flex items-center gap-2">
                Quick Navigation & Info
              </SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Explore community kitchens, discover benefits, and access legal policies.
              </SheetDescription>
            </SheetHeader>

            {customer ? (
              <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-2xl mb-4 border border-border/50">
                <Avatar className="h-10 w-10 border border-primary/20">
                  {customer.imageUrl && <AvatarImage src={customer.imageUrl} alt={customer.name} />}
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {customer.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{customer.contact || customer.email || 'Customer'}</p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleNavigate('/customer-details')}
                  className="rounded-xl text-xs"
                >
                  Details
                </Button>
              </div>
            ) : null}

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-1">
                Explore HyperDelivery
              </div>
              
              <button
                onClick={() => handleNavigate('/benefits')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10 text-pink-500">
                    <Heart className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Why Us?</p>
                    <p className="text-xs text-muted-foreground">Benefits for foodies & home chefs</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => handleNavigate('/about')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Info className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">About Us</p>
                    <p className="text-xs text-muted-foreground">Our story & community mission</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <Separator className="my-3" />

            <div className="space-y-1">
              <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider px-3 py-1">
                Policies & Support
              </div>

              <button
                onClick={() => handleNavigate('/cancellation-refund-policy')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Cancellation & Refunds</p>
                    <p className="text-xs text-muted-foreground">Returns, cancellation terms & refunds</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => handleNavigate('/terms-of-service')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Terms of Service</p>
                    <p className="text-xs text-muted-foreground">Platform usage terms & conditions</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button
                onClick={() => handleNavigate('/privacy-policy')}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Privacy Policy</p>
                    <p className="text-xs text-muted-foreground">How we safeguard your data</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <Separator className="my-4" />

            <Button
              variant={customer ? "destructive" : "default"}
              onClick={handleAuthAction}
              className="w-full rounded-2xl h-11 font-semibold flex items-center justify-center gap-2"
            >
              {customer ? (
                <>
                  <LogOut className="h-4 w-4" />
                  Logout
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Login / Signup
                </>
              )}
            </Button>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  );
}

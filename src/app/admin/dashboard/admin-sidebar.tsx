
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { LogOut, Package, Utensils, PanelLeftClose, PanelRight, Bike, LayoutDashboard, LayoutList, IndianRupee, Settings, Users, Sparkles, ClipboardList, FileSpreadsheet, Gift, Table } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { useOrder } from '@/context/order-context';
import { useVendor } from '@/context/vendor-context';
import type { OrderStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import Logo from '@/components/logo';

const navLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/dashboard/orders', label: 'Orders', icon: Package },
  { href: '/admin/dashboard/expenses', label: 'Expenses', icon: FileSpreadsheet, featureFlag: 'isExpenseTrackingEnabled' },
  { href: '/admin/dashboard/menu', label: 'Menu', icon: Utensils },
  { href: '/admin/dashboard/availability', label: 'Availability', icon: ClipboardList },
  { href: '/admin/dashboard/specials', label: 'Specials', icon: Sparkles },
  { href: '/admin/dashboard/offers', label: 'Offers', icon: Gift, featureFlag: 'isOfferCreationEnabled' },
  { href: '/admin/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/admin/dashboard/delivery', label: 'Delivery Team', icon: Bike },
  { href: '/admin/dashboard/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/admin/details', label: 'Shop Details', icon: Settings },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { vendor } = useVendor();
  const { orders } = useOrder();

  const activeOrderStatuses: OrderStatus[] = ['Order Placed', 'Processing', 'Out for Delivery'];
  
  const activeOrdersCount = useMemo(() => {
    if (!vendor) return 0;
    return orders.filter(order =>
      order.vendorUsername === vendor.username && activeOrderStatuses.includes(order.status)
    ).length;
  }, [orders, vendor, activeOrderStatuses]);

  const visibleNavLinks = useMemo(() => {
    return navLinks.filter(link => {
        if (link.featureFlag) {
            return !!(vendor as any)?.[link.featureFlag];
        }
        return true;
    });
  }, [vendor]);


  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "sticky top-0 h-screen flex flex-col items-center gap-4 p-4 border-r border-primary/10 bg-background/80 backdrop-blur-sm transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}>
        <div className={cn("flex items-center w-full", isCollapsed ? "justify-center" : "justify-between")}>
          {!isCollapsed && (
             <Link href="/" className="flex items-center gap-2">
                <motion.div
                  animate={{ rotateY: 360 }}
                  transition={{
                    duration: 4,
                    ease: "linear",
                    repeat: Infinity,
                  }}
                >
                  <Logo className="h-8 w-8 text-primary" />
                </motion.div>
                <span className="font-headline text-lg font-bold">
                Vendor Admin
                </span>
            </Link>
          )}
           <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <PanelRight /> : <PanelLeftClose />}
          </Button>
        </div>
        
        <nav className="flex flex-col gap-2 w-full flex-1 mt-8">
          {visibleNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isOrdersLink = link.label === 'Orders';

            return (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                  <Link href={link.href} passHref>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full flex justify-start gap-4 relative',
                         isCollapsed && 'justify-center',
                         isOrdersLink && activeOrdersCount > 0 && 'animate-vibrate'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {!isCollapsed && <span>{link.label}</span>}
                       {isOrdersLink && activeOrdersCount > 0 && (
                          <Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center rounded-full">{activeOrdersCount}</Badge>
                       )}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{link.label}</p>
                    {isOrdersLink && activeOrdersCount > 0 && (
                      <p className="text-xs text-center text-destructive-foreground bg-destructive rounded-full px-1.5 mt-1">{activeOrdersCount} new</p>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </aside>
    </TooltipProvider>
  );
}

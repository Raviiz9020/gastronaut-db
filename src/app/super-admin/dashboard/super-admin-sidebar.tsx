'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Package, Utensils, PanelLeftClose, PanelRight, Building, LayoutDashboard, LayoutList, IndianRupee, Shapes, Gift, Brush, Users, FileSpreadsheet, Mail, Activity, Bike, Route } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import Logo from '@/components/logo';

const navLinks = [
  { href: '/super-admin/dashboard', label: 'Vendors', icon: Building },
  { href: '/super-admin/dashboard/live-monitor', label: 'Live Monitor', icon: Activity },
  { href: '/super-admin/dashboard/orders', label: 'Orders', icon: Package },
  { href: '/super-admin/dashboard/riders', label: 'Riders', icon: Bike },
  { href: '/super-admin/dashboard/customers', label: 'Customers', icon: Users },
  { href: '/super-admin/dashboard/vendor-categories', label: 'Vendor Categories', icon: Shapes },
  { href: '/super-admin/dashboard/category', label: 'Menu Categories', icon: LayoutList },
  { href: '/super-admin/dashboard/expense-categories', label: 'Expense Categories', icon: FileSpreadsheet },
  { href: '/super-admin/dashboard/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/super-admin/dashboard/offers', label: 'Offers', icon: Gift },
  { href: '/super-admin/dashboard/campaigns', label: 'Campaigns', icon: Mail },
  { href: '/super-admin/dashboard/delivery-charges', label: 'Delivery Charges', icon: Route },
  { href: '/super-admin/dashboard/settings', label: 'Site Settings', icon: Brush },
];

export default function SuperAdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <TooltipProvider delayDuration={0}>
      <aside className={cn(
        "sticky top-0 h-screen flex flex-col items-center gap-4 p-4 border-r border-destructive/10 bg-background/80 backdrop-blur-sm transition-all duration-300",
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
                  <Logo className="h-8 w-8 text-destructive" />
                </motion.div>
                <span className="font-headline text-lg font-bold" style={{textShadow: '0 0 8px hsl(var(--destructive))'}}>
                    Super Admin
                </span>
            </Link>
          )}
           <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            {isCollapsed ? <PanelRight /> : <PanelLeftClose />}
          </Button>
        </div>
        
        <nav className="flex flex-col gap-2 w-full flex-1 mt-8">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                  <Link href={link.href} passHref>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      className={cn(
                        'w-full flex justify-start gap-4',
                         isCollapsed && 'justify-center',
                         isActive && 'text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {!isCollapsed && <span>{link.label}</span>}
                    </Button>
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">
                    <p>{link.label}</p>
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

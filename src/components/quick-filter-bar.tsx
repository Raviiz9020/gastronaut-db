'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Zap, Star, Tag, SlidersHorizontal, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface QuickFilterOption {
  id: string;
  label: string;
  href: string;
  icon?: React.ReactNode;
  activeColor?: string;
}

export const QUICK_FILTERS: QuickFilterOption[] = [
  {
    id: 'pure-veg',
    label: 'Pure Veg',
    href: '/menu?vegOnly=true',
    icon: (
      <span className="w-3.5 h-3.5 rounded-sm border border-emerald-600 flex items-center justify-center p-0.5 shrink-0 bg-emerald-50">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
      </span>
    ),
  },
  {
    id: 'fast-delivery',
    label: 'Under 30 Mins',
    href: '/menu?fastDelivery=true',
    icon: <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />,
  },
  {
    id: 'top-rated',
    label: 'Rating 4.0+',
    href: '/menu?minRating=4.0',
    icon: <Star className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500 shrink-0" />,
  },
  {
    id: 'offers',
    label: 'Great Offers',
    href: '/menu?offersOnly=true',
    icon: <Tag className="h-3.5 w-3.5 text-rose-500 shrink-0" />,
  },
  {
    id: 'budget',
    label: 'Budget under ₹150',
    href: '/menu?maxPrice=150',
    icon: <span className="text-xs font-bold text-primary">₹</span>,
  },
];

export default function QuickFilterBar({ className }: { className?: string }) {
  const router = useRouter();

  return (
    <div className={cn('w-full overflow-x-auto hide-scrollbar py-2', className)}>
      <div className="flex items-center gap-2.5 min-w-max px-1">
        <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground pr-1 shrink-0">
          <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
          <span>Filters:</span>
        </div>

        {QUICK_FILTERS.map((filter) => (
          <Link key={filter.id} href={filter.href} passHref>
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-full border-border/80 bg-card/80 backdrop-blur-sm px-3.5 text-xs font-medium text-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200 shadow-xs flex items-center gap-1.5 group"
            >
              {filter.icon}
              <span>{filter.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}

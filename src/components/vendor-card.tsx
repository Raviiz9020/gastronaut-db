'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Clock, MapPin, Tag, Utensils, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Vendor, Offer } from '@/types';
import { VendorStatus } from '@/types';
import { VendorStatusManager } from '@/lib/vendorStatusManager';
import { calculateDistanceInKm } from '@/lib/location-utils';
import { createSlug, cn } from '@/lib/utils';

interface VendorCardProps {
  vendor: Vendor;
  offers?: Offer[];
  userLocation?: { latitude: number; longitude: number } | null;
  className?: string;
}

export default function VendorCard({
  vendor,
  offers = [],
  userLocation,
  className,
}: VendorCardProps) {
  // Vendor URL slug resolution
  const vendorUrl = useMemo(() => {
    const identifier = vendor.slug || (vendor.shopName ? createSlug(vendor.shopName) : vendor.username);
    return `/menu?vendor=${identifier}`;
  }, [vendor]);

  // Ratings calculation
  const { ratingAverage, ratingCount } = useMemo(() => {
    const count = vendor.ratingCount || 0;
    const sum = vendor.totalRatingSum || 0;
    const avg = count > 0 ? (sum / count).toFixed(1) : null;
    return { ratingAverage: avg, ratingCount: count };
  }, [vendor]);

  // Distance & Dynamic ETA calculation
  const { distanceKm, etaString } = useMemo(() => {
    if (!userLocation || vendor.latitude === undefined || vendor.longitude === undefined) {
      return { distanceKm: null, etaString: '20-25 min' };
    }

    const dist = calculateDistanceInKm(
      userLocation.latitude,
      userLocation.longitude,
      vendor.latitude,
      vendor.longitude
    );

    // Hyperlocal ETA formula: 15 mins base prep + 4 mins per km
    const transitTime = Math.ceil(dist * 4);
    const minEta = 15 + transitTime;
    const maxEta = minEta + 10;

    return {
      distanceKm: dist < 1 ? `${Math.round(dist * 1000)} m` : `${dist.toFixed(1)} km`,
      etaString: `${minEta}-${maxEta} min`,
    };
  }, [userLocation, vendor]);

  // Active vendor offer
  const activeOffer = useMemo(() => {
    return offers.find(o => !o.vendorUsername || o.vendorUsername === vendor.username);
  }, [offers, vendor]);

  // Render About / Tagline description (2 lines max)
  const cateringText = 'We accept catering services for functions and birthdays';
  const renderDescription = () => {
    const text = vendor.about || vendor.tagline;
    if (!text) return null;

    if (text.includes(cateringText)) {
      const parts = text.split(cateringText);
      return (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {parts[0]} <span className="font-semibold text-blue-500">{cateringText}</span> {parts[1]}
        </p>
      );
    }
    return <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{text}</p>;
  };

  const shopStatus = useMemo(() => {
    return VendorStatusManager.getShopStatus(vendor);
  }, [vendor]);

  const isShopOpen = shopStatus.status === VendorStatus.OPEN;

  return (
    <Link href={vendorUrl} className="block group h-full">
      <Card
        className={cn(
          'relative h-full flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:border-primary/40 hover:-translate-y-1',
          !isShopOpen && 'opacity-75 grayscale-[20%]',
          className
        )}
      >
        {/* Cover Photo / Hero Media */}
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          <Image
            src={vendor.shopImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80'}
            alt={vendor.shopName || vendor.name || 'Vendor'}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            placeholder={vendor.shopImageBlur ? 'blur' : 'empty'}
            blurDataURL={vendor.shopImageBlur}
          />

          {/* Gradient Overlay for bottom badges */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* Top Badges: Open/Closed & Featured */}
          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
            {isShopOpen ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[10px] font-semibold text-emerald-400 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-900/80 border border-zinc-700/40 text-[10px] font-semibold text-zinc-300 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                {shopStatus.msg || 'Closed'}
              </span>
            )}

            {vendor.category && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-black/60 border border-white/20 text-[10px] font-medium text-white/90 backdrop-blur-md">
                {vendor.category}
              </span>
            )}
          </div>

          {/* Bottom Overlaid Badges: Offer & Distance/ETA */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2 pointer-events-none">
            {/* Active Offer Ribbon */}
            {activeOffer ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600/90 text-white text-[11px] font-bold tracking-tight shadow-md backdrop-blur-sm max-w-[60%] truncate">
                <Tag className="h-3 w-3 shrink-0" />
                <span className="truncate">{activeOffer.title}</span>
              </span>
            ) : (
              <div />
            )}

            {/* ETA & Distance Pill */}
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/75 border border-white/15 text-white text-[11px] font-medium backdrop-blur-md shrink-0 shadow-md">
              <Clock className="h-3 w-3 text-amber-400" />
              <span>{etaString}</span>
              {distanceKm && (
                <>
                  <span className="text-white/40">•</span>
                  <span>{distanceKm}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Card Content & Details */}
        <CardContent className="p-3.5 flex flex-col flex-1 gap-1.5">
          {/* Row 1: Shop Name & Rating Badge */}
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-foreground truncate group-hover:text-primary transition-colors">
              {vendor.shopName || vendor.name}
            </h3>

            {ratingAverage ? (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-xs font-bold shrink-0 shadow-sm">
                <span>{ratingAverage}</span>
                <Star className="h-3 w-3 fill-current" />
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium shrink-0">
                New
              </span>
            )}
          </div>

          {/* Row 2: About / Description (2 lines) */}
          {renderDescription()}

          {/* Row 3: Minimum Order & Delivery Details Footer */}
          <div className="mt-auto pt-2 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Utensils className="h-3 w-3 text-primary/70" />
              <span>Min. Order: ₹{vendor.minOrderAmount || 50}</span>
            </div>

            {ratingCount > 0 && (
              <span className="text-[10px] text-muted-foreground">
                ({ratingCount} {ratingCount === 1 ? 'review' : 'reviews'})
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

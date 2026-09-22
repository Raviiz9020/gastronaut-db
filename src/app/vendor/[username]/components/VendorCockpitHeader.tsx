'use client';

import React from 'react';
import Image from 'next/image';
import {
  Utensils,
  Download,
  Clock,
  MapPin,
  ExternalLink,
  Phone,
  Info,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VendorStatusManager } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';
import type { Vendor } from '@/types';

export interface VendorCockpitHeaderProps {
  vendor: Vendor;
  isDineInMode: boolean;
  activeTableId: string;
  locationVerified: boolean | null;
  onOpenTablePicker: () => void;
  onDownloadPdf: () => void;
}

export function VendorCockpitHeader({
  vendor,
  isDineInMode,
  activeTableId,
  locationVerified,
  onOpenTablePicker,
  onDownloadPdf,
}: VendorCockpitHeaderProps) {
  const statusInfo = VendorStatusManager.getShopStatus(vendor);
  const isOpen = statusInfo.status === VendorStatus.OPEN;
  const isTempClosed = statusInfo.status === VendorStatus.CLOSED_TEMP;

  let badgeColor = 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  let pulseColor = 'bg-emerald-500';

  if (isTempClosed) {
    badgeColor = 'bg-destructive/15 text-destructive border-destructive/30';
    pulseColor = 'bg-destructive';
  } else if (!isOpen) {
    badgeColor = 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    pulseColor = 'bg-amber-500';
  }

  return (
    <div className={cn(
      "rounded-2xl border border-border/70 bg-card/95 backdrop-blur-md shadow-xs max-w-5xl mx-auto",
      isDineInMode ? "p-2.5 sm:p-3.5 mb-3" : "p-3.5 sm:p-4 mb-4"
    )}>
      {/* Top Row: Brand, Live Status, and Table/Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Brand & Status */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-2xl overflow-hidden border border-border/60 shadow-xs bg-muted shrink-0">
            <Image
              src={vendor.shopImage || 'https://placehold.co/224x224.png'}
              alt={vendor.shopName || 'Vendor'}
              fill
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-headline text-base sm:text-xl font-black text-foreground tracking-tight truncate">
                {vendor.shopName}
              </h1>
              {/* Live Status Badge */}
              <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold border shadow-2xs", badgeColor)}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", pulseColor)} />
                  <span className={cn("relative inline-flex rounded-full h-1.5 w-1.5", pulseColor)} />
                </span>
                <span>{statusInfo.msg}</span>
              </span>
            </div>
            {!isDineInMode && vendor.tagline && (
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {vendor.tagline}
              </p>
            )}
          </div>
        </div>

        {/* Action Cluster: Dine-In Table Capsule + PDF Download */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
          {vendor?.canAcceptDineIn && (
            activeTableId ? (
              <div className="inline-flex items-center gap-1.5 p-1 sm:p-1.5 rounded-full bg-primary/10 border border-primary/25 shadow-2xs">
                <div className="flex items-center gap-1 px-2 text-xs font-extrabold text-foreground">
                  <Utensils className="h-3.5 w-3.5 text-primary" />
                  <span>Table {activeTableId}</span>
                </div>
                {locationVerified === true && (
                  <span title="In-store location verified" className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
                {locationVerified === false && (
                  <span title="Location unverified" className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                    <AlertCircle className="h-3 w-3" /> Unverified
                  </span>
                )}
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs font-bold rounded-full border-primary/30 text-primary hover:bg-primary/10 gap-1 px-3"
                onClick={onOpenTablePicker}
              >
                <Utensils className="h-3 w-3" />
                <span>Select Table</span>
              </Button>
            )
          )}

          <Button
            onClick={onDownloadPdf}
            size="sm"
            variant="outline"
            className="h-7 sm:h-8 px-3 rounded-full text-xs font-bold gap-1 text-muted-foreground hover:text-foreground border-border/80 shadow-2xs"
            title="Download Menu PDF"
          >
            <Download className="h-3 w-3 text-primary" />
            <span className="hidden md:inline">Menu PDF</span>
          </Button>
        </div>
      </div>

      {/* Bottom Metadata Strip: Address, Hours, Phone (Home Delivery only - Hidden for in-store Dine-In) */}
      {!isDineInMode && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2.5 mt-2.5 border-t border-border/40 text-[11px] sm:text-xs text-muted-foreground">
          {vendor.workingHours && (
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-primary shrink-0" />
              <span>{vendor.workingHours}</span>
            </div>
          )}
          {vendor.address && (
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary shrink-0" />
              <span className="truncate max-w-[200px] sm:max-w-[320px]">{vendor.address}</span>
              {vendor.googleMapsUrl && (
                <a
                  href={vendor.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5 font-bold"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          )}
          {vendor.contact && (
            <a
              href={`tel:${vendor.contact}`}
              className="flex items-center gap-1 hover:text-primary font-medium transition-colors"
            >
              <Phone className="h-3 w-3 text-primary shrink-0" />
              <span>{vendor.contact.replace('+91', '')}</span>
            </a>
          )}
          {vendor.minOrderAmount && vendor.minOrderAmount > 0 ? (
            <div className="flex items-center gap-1 text-primary font-medium">
              <Info className="h-3 w-3 shrink-0" />
              <span>Min ₹{vendor.minOrderAmount}</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

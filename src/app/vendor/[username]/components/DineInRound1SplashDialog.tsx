'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  ChefHat,
  Clock,
  Globe,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface DineInRound1SplashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName?: string | null;
  tableId?: string | null;
}

const GooglePlayIcon = () => (
  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
    <path
      d="M3.609 1.814L13.793 12 3.61 22.186c-.378-.344-.61-.84-.61-1.403V3.217c0-.563.232-1.06.61-1.403z"
      fill="#2196F3"
    />
    <path
      d="M17.186 8.607L13.793 12l3.393 3.393 3.829-2.188c.84-.48.84-1.265 0-1.745l-3.83-2.19z"
      fill="#FFC107"
    />
    <path
      d="M13.793 12L3.61 1.814c.264-.24.62-.387 1.018-.387.485 0 .97.18 1.488.476l10.97 6.27-3.293 3.827z"
      fill="#4CAF50"
    />
    <path
      d="M13.793 12l3.393 3.827-10.97 6.27c-.518.296-1.003.476-1.488.476-.398 0-.754-.147-1.018-.387L13.793 12z"
      fill="#F44336"
    />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-3.5 h-3.5 shrink-0 fill-white" viewBox="0 0 24 24">
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 12c0 1.78.46 3.45 1.28 4.93L2 22l5.25-1.38c1.45.77 3.09 1.18 4.79 1.18h.01c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zM12.04 20.15c-1.5 0-2.95-.39-4.23-1.09l-.3-.18-3.14.82.84-3.07-.2-.31a8.29 8.29 0 0 1-1.28-4.38c0-4.54 3.7-8.24 8.24-8.24s8.24 3.7 8.24 8.24-3.7 8.24-8.24 8.24zm4.49-6.17c-.24-.12-1.45-.71-1.67-.79s-.39-.12-.55.12-.63.79-.78.95c-.14.16-.28.18-.52.06s-1.03-.38-1.96-1.21c-.72-.64-1.2-1.43-1.34-1.67-.14-.24-.01-.37.11-.48.1-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42s-.55-1.32-.76-1.81c-.2-.48-.4-.42-.55-.42h-.48c-.16 0-.42.06-.63.3s-.84.82-.84 2c0 1.18.86 2.32 1 2.48.13.16 1.69 2.59 4.1 3.6.58.24 1.04.39 1.4.5.52.17 1-.06 1.16-.36.16-.3.16-.55.11-.67s-.16-.18-.4-.3z" />
  </svg>
);

export const DineInRound1SplashDialog: React.FC<DineInRound1SplashDialogProps> = ({
  open,
  onOpenChange,
  vendorName,
  tableId,
}) => {
  const safeVendorName = vendorName || 'this restaurant';

  const handleWhatsAppShare = () => {
    const text = `Order food from ${safeVendorName} & daily essentials delivered to your home on HyperDelivery! 🏠✨\n\n🌐 Website: https://hyperdelivery.in\n📲 Android App: https://play.google.com/store/apps/details?id=com.hyperdelivery.app`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-md rounded-3xl p-4 sm:p-5 overflow-hidden border-border/80 shadow-2xl bg-card">
        {/* 1. Compact Header: Order Sent to Kitchen */}
        <div className="flex items-center gap-3 pb-2.5 border-b border-border/50">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ChefHat className="w-5 h-5" />
          </div>
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <DialogTitle className="font-headline text-base font-black text-foreground tracking-tight leading-tight">
                Order Sent to Kitchen!
              </DialogTitle>
            </div>
            <DialogDescription className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
              Table {tableId || 'Order'} • Food is being freshly prepared
            </DialogDescription>
          </div>
        </div>

        {/* 2. The Moving Bike Journey (Slim & Cute) */}
        <div className="my-2 p-2 rounded-xl bg-muted/50 border border-border/60">
          <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold">
            <span className="flex items-center gap-1 bg-background px-2 py-1 rounded-lg border border-border shadow-2xs shrink-0 text-foreground">
              🍽️ Table {tableId || '1'}
            </span>
            <div className="flex-1 flex flex-col items-center justify-center relative px-1">
              <div className="w-full h-0.5 border-t border-dashed border-primary/40 relative flex items-center justify-center">
                <motion.div
                  animate={{ x: [-12, 12, -12] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                  className="bg-card px-1 text-xs absolute -top-2.5 text-primary"
                >
                  🛵💨
                </motion.div>
              </div>
              <span className="text-[8px] font-extrabold text-primary uppercase tracking-wider mt-1.5">
                HyperDelivery
              </span>
            </div>
            <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-lg border border-primary/30 shrink-0">
              🏠 Your Doorstep
            </span>
          </div>
        </div>

        {/* 3. The Bold & Open Doorstep Hook (No extra fluff) */}
        <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/25 text-center">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-wider mb-1.5">
            <Zap className="w-2.5 h-2.5 fill-primary" />
            Doorstep Delivery Across Town
          </div>
          <h4 className="text-sm font-black text-foreground leading-snug">
            Do you know <span className="text-primary font-black">HyperDelivery</span> delivers{' '}
            <span className="underline decoration-primary decoration-2 underline-offset-2">{safeVendorName}</span>{' '}
            right to your doorstep?
          </h4>

          {/* Clean 3-pill feature line (Zero scroll, instant readability) */}
          <div className="flex items-center justify-center gap-1.5 mt-2.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 border border-border/60 text-[10px] font-semibold text-foreground">
              🍲 Hot Food
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 border border-border/60 text-[10px] font-semibold text-foreground">
              🥦 Daily Groceries
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/80 border border-border/60 text-[10px] font-semibold text-foreground">
              ⚡ 20m Delivery
            </span>
          </div>
        </div>

        {/* 4. Action Buttons (All in one view) */}
        <div className="space-y-1.5 mt-1">
          {/* Google Play Store button */}
          <a
            href="https://play.google.com/store/apps/details?id=com.hyperdelivery.app"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-foreground text-background hover:opacity-95 transition-all shadow-sm group h-11"
          >
            <div className="flex items-center gap-2.5">
              <GooglePlayIcon />
              <div className="text-left">
                <div className="text-[8px] uppercase tracking-wider opacity-75 font-semibold leading-none">
                  Get It On
                </div>
                <div className="text-xs font-black tracking-tight leading-tight">
                  Google Play Store
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-background/20 group-hover:bg-background/30 transition-colors flex items-center gap-1">
              Install App <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </a>

          {/* HyperDelivery.in + WhatsApp side-by-side */}
          <div className="grid grid-cols-2 gap-1.5">
            <a
              href="https://hyperdelivery.in"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-border/80 bg-background hover:bg-muted/50 transition-all text-[11px] font-bold text-foreground shadow-2xs h-9"
            >
              <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">HyperDelivery.in</span>
            </a>

            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all text-[11px] font-bold shadow-2xs cursor-pointer h-9"
            >
              <WhatsAppIcon />
              <span className="truncate">Save on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* 5. Dismissal Link */}
        <div className="pt-1 text-center">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="w-full text-[11px] text-muted-foreground hover:text-foreground h-7 rounded-lg font-medium p-0"
          >
            <Clock className="w-3 h-3 mr-1" /> Back to Live Kitchen Status
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

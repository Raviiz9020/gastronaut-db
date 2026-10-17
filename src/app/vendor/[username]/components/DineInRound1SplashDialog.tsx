'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  Globe,
  ArrowRight,
  ChevronRight,
  Flame,
  ShoppingBasket,
  Truck,
  Share2,
  Search,
  ShoppingCart,
  Home,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '@/components/logo';

interface DineInRound1SplashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName?: string | null;
  tableId?: string | null;
  /**
   * 'order-placed' (default): shown right after Round 1, includes kitchen confirmation.
   * 'promo': opened from the header "Order at Home" button, shows a How-it-works row instead.
   */
  mode?: 'order-placed' | 'promo';
}

const HOW_IT_WORKS_STEPS = [
  { icon: Search, label: 'Browse menu' },
  { icon: ShoppingCart, label: 'Order online' },
  { icon: Home, label: 'Delivered home' },
];

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

export const DineInRound1SplashDialog: React.FC<DineInRound1SplashDialogProps> = ({
  open,
  onOpenChange,
  vendorName,
  tableId,
  mode = 'order-placed',
}) => {
  const safeVendorName = vendorName || 'this restaurant';

  const handleWhatsAppShare = () => {
    const text = `Order food from ${safeVendorName} & daily essentials delivered to your home on HyperDelivery! 🏠✨\n\n🌐 Website: https://hyperdelivery.in\n📲 Android App: https://play.google.com/store/apps/details?id=com.hyperdelivery.app`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] sm:max-w-sm rounded-3xl p-0 gap-0 overflow-hidden border-border/80 shadow-2xl bg-card">
        {/* 1. Brand bar: logo + wordmark (corner X is rendered by DialogContent) */}
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3 pr-12 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden bg-background ring-1 ring-primary/20 shadow-sm text-primary">
            <Logo className="h-full w-full text-primary" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-headline text-lg font-black tracking-tight text-foreground leading-none">
              Hyper<span className="text-primary">Delivery</span>
            </span>
            <span className="text-[11px] font-semibold text-muted-foreground tracking-wide mt-1 leading-none">
              hyperdelivery.in
            </span>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-3">
          {mode === 'order-placed' ? (
            /* 2a. Slim order confirmation (after Round 1) */
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0 text-left">
                <DialogTitle className="text-xs font-extrabold text-foreground leading-tight">
                  Order sent to kitchen
                </DialogTitle>
                <DialogDescription className="text-[11px] text-muted-foreground truncate">
                  Table {tableId || 'Order'} • {safeVendorName}
                </DialogDescription>
              </div>
            </div>
          ) : (
            /* 2b. How it works (opened from header "Order at Home") */
            <div>
              <DialogTitle className="sr-only">Order at Home with HyperDelivery</DialogTitle>
              <DialogDescription className="sr-only">
                Browse the menu, order online and get it delivered to your home.
              </DialogDescription>
              <div className="flex items-start justify-between gap-1">
                {HOW_IT_WORKS_STEPS.map((step, idx) => (
                  <React.Fragment key={step.label}>
                    <div className="flex-1 flex flex-col items-center gap-1.5 text-center">
                      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/25 text-primary flex items-center justify-center">
                        <step.icon className="w-4 h-4" />
                      </div>
                      <span className="text-[11px] font-bold text-foreground leading-tight">
                        {step.label}
                      </span>
                    </div>
                    {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                      <ChevronRight className="w-4 h-4 text-primary/40 shrink-0 mt-3" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* 3. Headline + subtext */}
          <div className="text-center space-y-1.5">
            <h4 className="text-lg font-black text-foreground leading-snug tracking-tight">
              Start ordering food at home with{' '}
              <span className="text-primary">HyperDelivery</span>
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Get <span className="font-semibold text-foreground">{safeVendorName}</span> and more
              delivered to your doorstep.
            </p>

            {/* Subtle motion line */}
            <div className="relative mx-auto w-3/4 h-4">
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-primary/30" />
              <motion.div
                animate={{ x: ['-45%', '45%', '-45%'] }}
                transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                className="absolute left-1/2 top-0 -translate-x-1/2 bg-card px-1 text-primary"
              >
                <Truck className="w-4 h-4" />
              </motion.div>
            </div>

            {/* Feature chips (no time claims) */}
            <div className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-[10px] font-semibold text-foreground">
                <Flame className="w-3 h-3 text-primary" /> Hot Food
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-[10px] font-semibold text-foreground">
                <ShoppingBasket className="w-3 h-3 text-primary" /> Daily Groceries
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-[10px] font-semibold text-foreground">
                <Truck className="w-3 h-3 text-primary" /> Doorstep Delivery
              </span>
            </div>
          </div>

          {/* 4. Actions: primary Play Store, secondary website + share */}
          <div className="space-y-1.5">
            <a
              href="https://play.google.com/store/apps/details?id=com.hyperdelivery.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-foreground text-background hover:opacity-95 transition-all shadow-sm group h-12"
            >
              <div className="flex items-center gap-2.5">
                <GooglePlayIcon />
                <div className="text-left">
                  <div className="text-[8px] uppercase tracking-wider opacity-75 font-semibold leading-none">
                    Get it on
                  </div>
                  <div className="text-sm font-black tracking-tight leading-tight">
                    Google Play
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>

            <div className="grid grid-cols-2 gap-1.5">
              <a
                href="https://hyperdelivery.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-border/80 bg-background hover:bg-muted/50 transition-all text-[11px] font-bold text-foreground h-9"
              >
                <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">hyperdelivery.in</span>
              </a>

              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl border border-emerald-600/40 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 transition-all text-[11px] font-bold cursor-pointer h-9"
              >
                <Share2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Share</span>
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

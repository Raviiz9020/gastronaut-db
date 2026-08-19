'use client';

import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy, Image as ImageIcon, Smartphone, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface UpiAppDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    id: string;
    vendorName: string;
    amount: number;
    upiId: string;
  } | null;
  onConfirmPaid: () => void;
  isButtonDisabled?: boolean;
  secondsRemaining?: number;
}

export default function UpiAppDrawer({
  open,
  onOpenChange,
  order,
  onConfirmPaid,
  isButtonDisabled = false,
  secondsRemaining = 0,
}: UpiAppDrawerProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);

  if (!order) return null;

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(order.upiId);
    setHasCopied(true);
    toast({
      title: 'UPI ID Copied! 📋',
      description: `${order.upiId} copied to clipboard.`,
    });
    setTimeout(() => setHasCopied(false), 2500);
  };

  const openUpiApp = (appKey: 'gpay' | 'phonepe' | 'paytm' | 'cred' | 'bhim' | 'generic') => {
    const cleanUpiId = order.upiId.trim();
    const note = `Order -- ${order.id}`;
    const encodedShop = encodeURIComponent(order.vendorName);
    const encodedNote = encodeURIComponent(note);
    const amt = order.amount.toFixed(2);
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    const genericUpi = `upi://pay?pa=${cleanUpiId}&pn=${encodedShop}&am=${amt}&tn=${encodedNote}&tr=${order.id}`;

    if (appKey === 'generic') {
      window.location.href = genericUpi;
      return;
    }

    if (appKey === 'gpay') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${cleanUpiId}&pn=${encodedShop}&am=${amt}&tn=${encodedNote}&tr=${order.id}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
      } else {
        window.location.href = 'gpay://';
      }
    } else if (appKey === 'phonepe') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${cleanUpiId}&pn=${encodedShop}&am=${amt}&tn=${encodedNote}&tr=${order.id}#Intent;scheme=upi;package=com.phonepe.app;end`;
      } else {
        window.location.href = 'phonepe://';
      }
    } else if (appKey === 'paytm') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${cleanUpiId}&pn=${encodedShop}&am=${amt}&tn=${encodedNote}&tr=${order.id}#Intent;scheme=upi;package=net.one97.paytm;end`;
      } else {
        window.location.href = 'paytmmp://';
      }
    } else if (appKey === 'cred') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${cleanUpiId}&pn=${encodedShop}&am=${amt}&tn=${encodedNote}&tr=${order.id}#Intent;scheme=upi;package=com.dreamplug.androidapp;end`;
      } else {
        window.location.href = 'cred://';
      }
    } else if (appKey === 'bhim') {
      if (isAndroid) {
        window.location.href = `intent://pay?pa=${cleanUpiId}&pn=${encodedShop}&am=${amt}&tn=${encodedNote}&tr=${order.id}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;
      } else {
        window.location.href = 'bhim://';
      }
    }
  };

  const upiApps = [
    {
      id: 'gpay',
      name: 'Google Pay',
      shortName: 'GPay',
      tag: 'Popular',
      color: 'from-blue-500/15 to-emerald-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400',
      icon: (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
        </svg>
      ),
    },
    {
      id: 'phonepe',
      name: 'PhonePe',
      shortName: 'PhonePe',
      tag: 'Fastest',
      color: 'from-purple-500/15 to-indigo-500/15 border-purple-500/30 text-purple-600 dark:text-purple-400',
      icon: (
        <div className="h-6 w-6 rounded-full bg-[#5f259f] flex items-center justify-center text-white font-bold text-xs shadow-xs">
          पे
        </div>
      ),
    },
    {
      id: 'paytm',
      name: 'Paytm',
      shortName: 'Paytm',
      tag: 'Popular',
      color: 'from-sky-500/15 to-blue-500/15 border-sky-500/30 text-sky-600 dark:text-sky-400',
      icon: (
        <div className="h-6 w-6 rounded-lg bg-[#002e6e] flex items-center justify-center text-white font-extrabold text-[9px] shadow-xs">
          <span className="text-[#00baf2]">Pay</span>tm
        </div>
      ),
    },
    {
      id: 'cred',
      name: 'CRED',
      shortName: 'CRED',
      tag: 'Rewards',
      color: 'from-zinc-500/15 to-amber-500/15 border-zinc-500/30 text-foreground',
      icon: (
        <div className="h-6 w-6 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center text-amber-400 font-black text-[10px] shadow-xs">
          CR
        </div>
      ),
    },
    {
      id: 'bhim',
      name: 'BHIM UPI',
      shortName: 'BHIM',
      tag: 'Govt. UPI',
      color: 'from-emerald-500/15 to-teal-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      icon: (
        <div className="h-6 w-6 rounded-md bg-gradient-to-r from-orange-500 via-white to-green-600 p-[1.5px] shadow-xs">
          <div className="h-full w-full bg-zinc-900 rounded-[3px] flex items-center justify-center text-white font-black text-[8px]">
            BHIM
          </div>
        </div>
      ),
    },
    {
      id: 'generic',
      name: 'Any UPI App',
      shortName: 'All Apps',
      tag: 'System',
      color: 'from-primary/15 to-purple-500/15 border-primary/30 text-primary',
      icon: (
        <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center text-primary">
          <Smartphone className="h-3.5 w-3.5" />
        </div>
      ),
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-[2.5rem] border-t border-purple-500/20 bg-card p-0 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden max-w-md mx-auto"
      >
        {/* Top Handle Bar */}
        <div className="w-full flex justify-center pt-3.5 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25" />
        </div>

        {/* Drawer Header */}
        <SheetHeader className="px-6 pt-1 pb-2 text-center sm:text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold mx-auto">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>QR Code Saved to Your Photos</span>
          </div>

          <SheetTitle className="text-xl sm:text-2xl font-extrabold font-headline tracking-tight text-foreground">
            Choose Your UPI App
          </SheetTitle>

          <SheetDescription className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
            Open your app, tap <b>Scan QR</b>, and select the saved QR from <b>Gallery / Photos</b>.
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <div className="px-6 py-2 flex-1 overflow-y-auto space-y-3">
          {/* Order Price & Vendor Pill Container */}
          <div className="flex items-center justify-between bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-indigo-500/10 border border-purple-500/20 rounded-full px-5 py-3 shadow-xs">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Paying to</p>
              <h4 className="font-bold text-sm text-foreground truncate max-w-[160px]">
                {order.vendorName}
              </h4>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Amount</p>
              <p className="text-xl font-black text-purple-600 dark:text-purple-400">
                ₹{order.amount.toFixed(2)}
              </p>
            </div>
          </div>

          {/* UPI Apps Section */}
          <div>
            <p className="text-[11px] font-bold text-muted-foreground mb-2 px-1 uppercase tracking-wider">
              Tap to open app:
            </p>

            <div className="grid grid-cols-3 gap-2.5">
              {upiApps.map((app) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => openUpiApp(app.id as any)}
                  className={cn(
                    'group relative flex flex-col items-center justify-center p-3 rounded-2xl border bg-gradient-to-b transition-all duration-200 hover:scale-[1.03] active:scale-95 shadow-xs hover:shadow-md cursor-pointer',
                    app.color
                  )}
                >
                  <div className="mb-1.5 transition-transform group-hover:scale-110">
                    {app.icon}
                  </div>
                  <span className="font-bold text-xs leading-tight text-foreground text-center">
                    {app.shortName}
                  </span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                    {app.tag}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Tip Pill Card */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
              <ImageIcon className="h-3.5 w-3.5" />
            </div>
            <div className="text-[11px] text-muted-foreground leading-snug">
              <span className="font-semibold text-foreground">How to pay:</span> In UPI app, tap <b>Scan QR</b> → tap <b>Gallery/Photos</b> icon → select saved QR.
            </div>
          </div>

          {/* 1-Tap Copy VPA Pill */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-background rounded-full border border-border/80 shadow-xs">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold mr-1.5">UPI ID:</span>
              <span className="text-xs font-mono font-bold text-foreground truncate">
                {order.upiId}
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'h-7 px-3 text-xs font-semibold rounded-full shrink-0 transition-all shadow-xs',
                hasCopied && 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600'
              )}
              onClick={handleCopyUpiId}
            >
              {hasCopied ? (
                <>
                  <Check className="h-3 w-3 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" /> Copy ID
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Dedicated Structured Footer Buttons */}
        <div className="p-4 bg-muted/20 border-t border-border/50 flex flex-col gap-2.5 shrink-0">
          <Button
            type="button"
            size="lg"
            onClick={onConfirmPaid}
            disabled={isButtonDisabled}
            className={cn(
              'w-full h-12 rounded-full text-white font-extrabold text-sm shadow-lg transition-all duration-200 flex items-center justify-center gap-2',
              isButtonDisabled
                ? 'bg-neutral-600 cursor-not-allowed text-neutral-300 shadow-none'
                : 'bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-500/25 active:scale-[0.99]'
            )}
          >
            {isButtonDisabled ? (
              `I Have Paid (${secondsRemaining}s)`
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>I Have Completed Payment</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full h-10 rounded-full border border-border/80 bg-background/80 hover:bg-muted font-semibold text-xs text-muted-foreground hover:text-foreground transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            Back to QR Code
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Bike, Hand } from 'lucide-react';

interface SelfPickupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorName?: string;
  minOrderAmount?: number;
  onSelectOption: (choice: 'delivery' | 'pickup') => void;
}

export default function SelfPickupDialog({
  open,
  onOpenChange,
  vendorName,
  minOrderAmount = 0,
  onSelectOption,
}: SelfPickupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl sm:text-2xl text-center">
            {vendorName || 'This Kitchen'} offers Self-Pickup only
          </DialogTitle>
          <DialogDescription className="text-center pt-2 text-xs sm:text-sm">
            This vendor does not provide home delivery through our platform. How would you like to proceed?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 py-4">
          <div
            className="flex flex-col items-center p-3.5 sm:p-4 border-2 border-border/80 rounded-2xl cursor-pointer hover:bg-primary/5 hover:border-primary transition-all text-center group"
            onClick={() => {
              onSelectOption('delivery');
              onOpenChange(false);
            }}
          >
            <Bike className="h-9 w-9 sm:h-10 sm:w-10 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-center text-xs sm:text-sm text-foreground">
              Request Delivery
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              Min. order ₹{minOrderAmount} applies.
            </p>
          </div>
          <div
            className="flex flex-col items-center p-3.5 sm:p-4 border-2 border-border/80 rounded-2xl cursor-pointer hover:bg-emerald-500/5 hover:border-emerald-500 transition-all text-center group"
            onClick={() => {
              onSelectOption('pickup');
              onOpenChange(false);
            }}
          >
            <Hand className="h-9 w-9 sm:h-10 sm:w-10 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-center text-xs sm:text-sm text-foreground">
              I&apos;ll Pick It Up
            </h3>
            <p className="text-[11px] text-muted-foreground mt-1">
              No minimum order required.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

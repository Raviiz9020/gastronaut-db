'use client';

import React from 'react';
import type { MenuItem as MenuItemType } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bike, Hand } from 'lucide-react';

interface SelfPickupDialogProps {
  open: boolean;
  item: MenuItemType | null;
  items: MenuItemType[] | null;
  minOrderAmount?: number;
  onClose: (choice: 'yes' | 'no' | 'cancel') => void;
}

export const SelfPickupDialog: React.FC<SelfPickupDialogProps> = ({
  open,
  item,
  items,
  minOrderAmount = 0,
  onClose,
}) => {
  const shopName = item?.shopName || items?.[0]?.shopName || 'This vendor';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose('cancel')}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl text-center">
            {shopName} offers Self-Pickup only
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            This vendor does not provide home delivery through our platform. How would you like to proceed?
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div
            className="flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-primary/5 hover:border-primary transition-all"
            onClick={() => onClose('no')}
          >
            <Bike className="h-10 w-10 text-primary mb-2" />
            <h3 className="font-semibold text-center">Request Delivery</h3>
            <p className="text-xs text-muted-foreground text-center">
              A minimum order of ₹{minOrderAmount} is required.
            </p>
          </div>
          <div
            className="flex flex-col items-center p-4 border-2 rounded-2xl cursor-pointer hover:bg-green-500/5 hover:border-green-500 transition-all"
            onClick={() => onClose('yes')}
          >
            <Hand className="h-10 w-10 text-green-500 mb-2" />
            <h3 className="font-semibold text-center">I'll Pick It Up</h3>
            <p className="text-xs text-muted-foreground text-center">
              No minimum order amount applies.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SelfPickupDialog;

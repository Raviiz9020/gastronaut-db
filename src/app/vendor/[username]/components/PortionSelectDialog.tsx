'use client';

import React, { useEffect, useState } from 'react';
import type { MenuItem as MenuItemType, Vendor } from '@/types';
import { isItemInStock } from '@/lib/vendorStatusManager';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PortionSelectDialogProps {
  items: MenuItemType[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isVendorOwner?: boolean;
  isDineInMode?: boolean;
  onAddToCart?: (item: MenuItemType, quantity: number) => void;
  onAddToTableOrder?: (item: MenuItemType, quantity: number) => void;
  vendor?: Vendor | null;
}

export const PortionSelectDialog: React.FC<PortionSelectDialogProps> = ({
  items,
  open,
  onOpenChange,
  isVendorOwner,
  isDineInMode,
  onAddToCart,
  onAddToTableOrder,
  vendor,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    if (open && items && items.length > 0) {
      const defaultItem = items.find(item => item.isAvailable) || items[0];
      setSelectedItemId(defaultItem.id);
      setQuantity(1);
    }
  }, [open, items]);

  if (!items || items.length === 0) return null;

  const primaryItem = items[0];
  const baseName = primaryItem.name.replace(/\s+(full|half)$/i, '').trim();

  const handleConfirmClick = () => {
    const selectedItem = items.find(item => item.id === selectedItemId);
    if (!selectedItem) {
      toast({ title: "Please select a portion.", variant: "destructive" });
      return;
    }

    if ((isVendorOwner || isDineInMode) && onAddToTableOrder) {
      onAddToTableOrder(selectedItem, quantity);
    } else if (onAddToCart) {
      onAddToCart(selectedItem, quantity);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{baseName}</DialogTitle>
          <DialogDescription>Select your desired portion size.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedItemId} onValueChange={setSelectedItemId} className="space-y-2">
            {items.map(item => {
              const variation = item.name.match(/\s+(full|half)$/i)?.[1] || 'Portion';
              const price = (item.isDiscountActive && item.discountPrice) ? item.discountPrice : item.price;
              const isAvailable = isItemInStock(item, vendor?.isInventory);
              return (
                <Label
                  key={item.id}
                  htmlFor={item.id}
                  className={cn(
                    "flex items-center justify-between rounded-full border p-3 transition-colors",
                    isAvailable ? "cursor-pointer" : "opacity-50 cursor-not-allowed",
                    selectedItemId === item.id && "border-primary bg-primary/5"
                  )}
                >
                  <div>
                    <span className="font-semibold">{variation.charAt(0).toUpperCase() + variation.slice(1)}</span>
                    {!isAvailable && <span className="text-xs text-destructive ml-2">(Out of Stock)</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm">₹{price.toFixed(2)}</span>
                    <RadioGroupItem value={item.id} id={item.id} disabled={!isAvailable} />
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
        <DialogFooter className="sm:justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="font-bold text-lg w-10 text-center">{quantity}</span>
            <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => q + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={handleConfirmClick} disabled={!selectedItemId}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PortionSelectDialog;

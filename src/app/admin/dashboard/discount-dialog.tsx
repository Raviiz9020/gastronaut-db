
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMenu } from '@/context/menu-context';
import type { MenuItem } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface DiscountDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  menuItem: MenuItem | null;
}

export default function DiscountDialog({ isOpen, onOpenChange, menuItem }: DiscountDialogProps) {
  const [discountPrice, setDiscountPrice] = useState<number | string>('');
  const { updateMenuItem } = useMenu();
  const { toast } = useToast();

  useEffect(() => {
    if (menuItem) {
      setDiscountPrice(menuItem.discountPrice || '');
    }
  }, [menuItem]);

  const handleSave = async () => {
    if (!menuItem) return;

    const price = Number(discountPrice);

    // If price is invalid, not positive, or higher than original, turn off discount
    if (isNaN(price) || price <= 0 || (menuItem.price > 0 && price >= menuItem.price)) {
        if (isNaN(price) || price <= 0) {
            toast({
                title: 'Discount Deactivated',
                description: 'No valid discount price was entered.',
                variant: 'default',
            });
        } else {
             toast({
                title: 'Invalid Discount',
                description: 'Discount price must be less than the original price.',
                variant: 'destructive',
            });
        }
        await updateMenuItem({ ...menuItem, discountPrice: 0, isDiscountActive: false });
        onOpenChange(false);
        return;
    }

    if (menuItem.price === 0) {
        toast({
            title: 'Action Required',
            description: 'Please set an "Original Price" for this item first (it acts as a reference for the discount).',
            variant: 'destructive',
        });
        onOpenChange(false);
        return;
    }
    
    // Otherwise, save and activate the discount
    await updateMenuItem({ ...menuItem, discountPrice: price, isDiscountActive: true });
    toast({
      title: 'Discount Saved!',
      description: `The discount for ${menuItem.name} has been set and activated.`,
    });
    onOpenChange(false);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set Discount for {menuItem?.name}</DialogTitle>
          <DialogDescription>
            {menuItem?.price && menuItem.price > 0 
              ? `Original price: ₹${menuItem.price.toFixed(2)}. This will apply a ${( (1 - Number(discountPrice || 0) / menuItem.price) * 100).toFixed(0)}% discount to the final customized total.`
              : 'Warning: Original price is set to ₹0.00. Please set an "Original Price" in the Edit form first to calculate discounts correctly.'}
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-4">
          <Label htmlFor="discount-price" className="whitespace-nowrap">
            Discount Price (₹)
          </Label>
          <Input
            id="discount-price"
            type="number"
            value={discountPrice}
            onChange={(e) => setDiscountPrice(e.target.value)}
            className="w-full"
            placeholder="e.g. 199.50"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSave}>Save and Activate</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

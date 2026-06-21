
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Vendor } from '@/types';
import { IndianRupee, Award, ShieldCheck } from 'lucide-react';

interface RewardsConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (config: { spend: number; points: number; minRedemptionPoints: number; }) => void;
  vendor: Vendor | null;
}

export default function RewardsConfigDialog({ isOpen, onOpenChange, onSave, vendor }: RewardsConfigDialogProps) {
  const [spend, setSpend] = useState(100);
  const [points, setPoints] = useState(5);
  const [minRedemptionPoints, setMinRedemptionPoints] = useState(100);

  useEffect(() => {
    if (vendor && vendor.rewardsConfig) {
      setSpend(vendor.rewardsConfig.spend);
      setPoints(vendor.rewardsConfig.points);
      setMinRedemptionPoints(vendor.rewardsConfig.minRedemptionPoints || 100);
    } else {
      setSpend(100);
      setPoints(5);
      setMinRedemptionPoints(100);
    }
  }, [vendor]);

  const handleSave = () => {
    onSave({ spend, points, minRedemptionPoints });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure Rewards for {vendor?.shopName}</DialogTitle>
          <DialogDescription>
            Set the rules for how customers earn and redeem HyperPoints from this vendor.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spend-amount" className="flex items-center gap-1"><IndianRupee className="h-4 w-4"/> Spend Amount</Label>
              <Input
                id="spend-amount"
                type="number"
                value={spend}
                onChange={(e) => setSpend(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">For every ₹ spent...</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points-awarded" className="flex items-center gap-1"><Award className="h-4 w-4"/> Points Awarded</Label>
              <Input
                id="points-awarded"
                type="number"
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">...award this many points.</p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-redemption-points" className="flex items-center gap-1"><ShieldCheck className="h-4 w-4"/> Minimum to Redeem</Label>
            <Input
              id="min-redemption-points"
              type="number"
              value={minRedemptionPoints}
              onChange={(e) => setMinRedemptionPoints(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">Customer must have at least this many points to redeem.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save and Enable</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

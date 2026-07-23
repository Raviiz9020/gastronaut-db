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
import { Percent, BadgePercent } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CommissionConfigDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSave: (percentage: number) => void;
  vendor: Vendor | null;
}

const PRESET_PERCENTAGES = [5, 8, 10, 12, 15, 20];

export default function CommissionConfigDialog({
  isOpen,
  onOpenChange,
  onSave,
  vendor,
}: CommissionConfigDialogProps) {
  const [percentage, setPercentage] = useState<number>(10);

  useEffect(() => {
    if (vendor && vendor.commissionPercentage !== undefined) {
      setPercentage(vendor.commissionPercentage);
    } else {
      setPercentage(10);
    }
  }, [vendor]);

  const handleSave = () => {
    const validPercentage = Math.max(0, Math.min(100, Number(percentage) || 0));
    onSave(validPercentage);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BadgePercent className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Set Vendor Commission</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure order commission for <span className="font-semibold text-foreground">{vendor?.shopName || vendor?.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-5 py-3">
          <div className="space-y-2">
            <Label htmlFor="commission-rate" className="flex items-center gap-1.5 text-sm font-medium">
              <Percent className="h-4 w-4 text-primary" />
              Commission Rate (%)
            </Label>
            <div className="relative">
              <Input
                id="commission-rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                placeholder="e.g. 10"
                value={percentage}
                onChange={(e) => setPercentage(Number(e.target.value))}
                className="pr-8 text-lg font-bold"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Superadmin share automatically calculated per order for this vendor.
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground font-normal">Quick Presets</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_PERCENTAGES.map((preset) => (
                <Badge
                  key={preset}
                  variant={percentage === preset ? 'default' : 'outline'}
                  className="cursor-pointer px-3 py-1 text-xs transition-all hover:scale-105"
                  onClick={() => setPercentage(preset)}
                >
                  {preset}%
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground font-semibold">
            Save & Enable
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

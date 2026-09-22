'use client';

import React from 'react';
import type { Vendor } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UniversalTablePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendor: Vendor | null;
  activeTableId: string;
  occupiedTableIds: Set<string>;
  onSelectTable: (tableNumber: string) => void;
}

export const UniversalTablePickerDialog: React.FC<UniversalTablePickerDialogProps> = ({
  open,
  onOpenChange,
  vendor,
  activeTableId,
  occupiedTableIds,
  onSelectTable,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl text-center flex items-center justify-center gap-2">
            <Utensils className="h-5 w-5 text-primary" /> Select Your Table
          </DialogTitle>
          <DialogDescription className="text-center text-xs">
            Choose the table you are currently seated at in {vendor?.shopName || 'the restaurant'}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 max-h-60 overflow-y-auto p-1">
            {Array.from({ length: vendor?.dineInTables ?? 6 }, (_, i) => i + 1).map((tableNum) => {
              const isSelected = activeTableId === `${tableNum}`;
              const isOccupied = occupiedTableIds.has(`${tableNum}`);
              const isDisabled = isOccupied && !isSelected;

              return (
                <Button
                  key={tableNum}
                  type="button"
                  disabled={isDisabled}
                  variant={isSelected ? 'default' : isOccupied ? 'secondary' : 'outline'}
                  className={cn(
                    "h-12 text-sm font-extrabold rounded-2xl flex flex-col items-center justify-center transition-all relative",
                    isSelected && "shadow-md scale-105 border-primary",
                    isDisabled && "opacity-50 cursor-not-allowed bg-muted/60 border-dashed text-muted-foreground",
                    !isDisabled && !isSelected && "hover:border-primary/50"
                  )}
                  onClick={() => {
                    if (isDisabled) return;
                    onSelectTable(`${tableNum}`);
                  }}
                >
                  <span className="text-[10px] font-medium opacity-75">T</span>
                  <span>{tableNum}</span>
                  {isOccupied && (
                    <span className="text-[9px] font-semibold text-rose-500 uppercase tracking-wider scale-90">
                      Busy
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UniversalTablePickerDialog;

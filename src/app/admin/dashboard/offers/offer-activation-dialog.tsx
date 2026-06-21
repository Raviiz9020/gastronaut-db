'use client';

import { useState, useEffect } from 'react';
import { addDays, format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, ArrowRight } from 'lucide-react';
import type { Offer } from '@/types';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface OfferActivationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  offer: Offer | null;
  onConfirm: (offerId: string, startDate: Date, endDate: Date) => void;
}

const durationOptions = [5, 10, 20, 30, 60];

export default function OfferActivationDialog({
  isOpen,
  onOpenChange,
  offer,
  onConfirm,
}: OfferActivationDialogProps) {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(5);

  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setStartDate(today);

      const defaultEndDate = addDays(today, 5 - 1);
      defaultEndDate.setHours(23, 59, 59, 999);
      setEndDate(defaultEndDate);
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (startDate) {
      const newEndDate = addDays(startDate, selectedDuration - 1);
      newEndDate.setHours(23, 59, 59, 999);
      setEndDate(newEndDate);
    }
  }, [selectedDuration, startDate]);

  if (!offer) return null;

  const handleConfirm = () => {
    if (offer && startDate && endDate) {
      onConfirm(offer.id, startDate, endDate);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary"/>
            Activate Offer
          </DialogTitle>
          <DialogDescription>
            Choose the duration for your offer. It will start today.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
            <div className="space-y-4">
                <h3 className="font-semibold">Preview</h3>
                <div className="rounded-lg border bg-card p-4 space-y-3">
                    <div className="aspect-video w-full relative rounded-md overflow-hidden">
                        <Image src={offer.imageUrl} alt={offer.title} fill className="object-cover" />
                    </div>
                    <h4 className="font-bold text-lg">{offer.title}</h4>
                    <p className="text-sm text-muted-foreground">{offer.description}</p>
                </div>
            </div>

            <div className="space-y-6">
                <div>
                    <h3 className="font-semibold">Duration</h3>
                    <p className="text-sm text-muted-foreground">Select how long the offer should run.</p>
                </div>
                 <RadioGroup value={String(selectedDuration)} onValueChange={(v) => setSelectedDuration(Number(v))} className="grid grid-cols-3 gap-2">
                    {durationOptions.map(days => (
                        <Label key={days} htmlFor={`duration-${days}`} className={cn(
                            "flex items-center justify-center rounded-full border p-3 cursor-pointer transition-colors text-sm font-semibold",
                            selectedDuration === days && "border-primary bg-primary/10 text-primary"
                        )}>
                             <RadioGroupItem value={String(days)} id={`duration-${days}`} className="sr-only"/>
                            {days} Days
                        </Label>
                    ))}
                </RadioGroup>

                <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                    <h4 className="font-semibold text-center text-sm">Active Period</h4>
                    <div className="flex items-center justify-center gap-2 text-sm">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4"/>
                            <span>{startDate ? format(startDate, 'dd MMM') : '...'}</span>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground"/>
                         <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4"/>
                            <span>{endDate ? format(endDate, 'dd MMM') : '...'}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
                    <h4 className="font-semibold text-green-800 dark:text-green-300">Confirmation</h4>
                    <p className="text-sm text-green-700 dark:text-green-400">
                        Please double-check the offer's image, spelling, and description in the preview. Once activated, it will be visible to customers.
                    </p>
                </div>
            </div>
        </div>
        </ScrollArea>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirm}>
            Confirm & Activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import type { Offer } from '@/types';
import Image from 'next/image';

interface OfferSplashDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  offer: Offer | null; // Changed to accept a single offer or null
}

export default function OfferSplashDialog({
  isOpen,
  onOpenChange,
  offer,
}: OfferSplashDialogProps) {
  if (!offer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px] p-0 overflow-hidden">
        <div className="aspect-video w-full relative">
            <Image 
                src={offer.imageUrl} 
                alt={offer.title} 
                fill 
                className="object-cover"
                data-ai-hint="promotion food"
             />
        </div>
        <DialogHeader className="p-6 text-left">
          <DialogTitle className="text-2xl font-bold font-headline">{offer.title}</DialogTitle>
          <DialogDescription>
            {offer.description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="p-6 pt-0">
          <Button type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
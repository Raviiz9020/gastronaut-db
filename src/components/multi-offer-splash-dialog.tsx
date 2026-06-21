
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
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';
import { Gift } from 'lucide-react';

interface MultiOfferSplashDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  offers: Offer[];
}

const SingleOfferDisplay = ({ offer }: { offer: Offer }) => (
  <div className="space-y-4">
    <div className="aspect-video w-full relative rounded-lg overflow-hidden">
        <Image 
            src={offer.imageUrl} 
            alt={offer.title} 
            fill 
            className="object-contain"
            data-ai-hint="promotion food"
         />
    </div>
    <div className="text-left px-1">
      <DialogTitle className="text-2xl font-bold font-headline">
        {offer.title}
        {offer.vendorName && <div className="text-base font-semibold text-primary mt-1">From: {offer.vendorName}</div>}
      </DialogTitle>
      <DialogDescription>
        {offer.description}
      </DialogDescription>
    </div>
  </div>
);

export default function MultiOfferSplashDialog({
  isOpen,
  onOpenChange,
  offers,
}: MultiOfferSplashDialogProps) {
  const router = useRouter();
  
  if (!offers || offers.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
       <>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-headline text-center">Special Offers!</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 p-1">
                {offers.map((offer, index) => (
                    <div key={offer.id}>
                        <SingleOfferDisplay offer={offer} />
                        {index < offers.length - 1 && <Separator className="mt-6"/>}
                    </div>
                ))}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button type="button" className="w-full" onClick={() => onOpenChange(false)}>
            Sounds Good!
          </Button>
        </DialogFooter>
       </>
      </DialogContent>
    </Dialog>
  );
}

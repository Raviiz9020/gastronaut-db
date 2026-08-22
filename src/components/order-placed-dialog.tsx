'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PartyPopper } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Alert, AlertDescription as AlertDesc, AlertTitle as AlertT } from '@/components/ui/alert';
import { Button } from './ui/button';

interface OrderPlacedDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function OrderPlacedDialog({
  isOpen,
  onOpenChange,
}: OrderPlacedDialogProps) {
  const router = useRouter();

  const handleTrackOrderClick = () => {
    onOpenChange(false);
    setTimeout(() => {
      router.push('/track');
    }, 150);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-sm sm:max-w-md p-6 sm:p-8 bg-card/95 backdrop-blur-xl border-purple-500/20 shadow-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex justify-center mb-1">
            <div className="h-16 w-16 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500 animate-bounce">
              <PartyPopper className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl font-headline font-bold text-purple-500">Order Confirmed! 🎉</DialogTitle>
          <DialogDescription className="text-center text-sm text-muted-foreground leading-relaxed">
            Your order is placed and the kitchen has been notified to start preparation. You can follow live updates on the tracking page!
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex-col sm:flex-row gap-3">
           <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full rounded-xl">Continue Exploring</Button>
           <Button onClick={handleTrackOrderClick} className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20">Track Live Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

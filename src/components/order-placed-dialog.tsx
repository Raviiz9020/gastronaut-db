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
    // Use a short timeout to ensure the dialog has started its closing animation
    // before the router navigates, preventing UI freezes.
    setTimeout(() => {
      router.push('/track');
    }, 150);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <PartyPopper className="h-16 w-16 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl font-headline">Thank You for Your Order!</DialogTitle>
          <DialogDescription className="text-center">
            Your order has been placed successfully. You can track its progress on the "My Orders" page.
          </DialogDescription>
        </DialogHeader>
        <Alert className="mt-4 rounded-2xl border-blue-500/50 bg-blue-950 text-blue-200">
          <AlertT className="font-bold text-white">Advance Payment Information</AlertT>
          <AlertDesc className="text-blue-200">
            If you wish to make an advance payment for this order you can do it from your 'Track Order' page. just open QR code and long press the QR code and choose your UPI app
          </AlertDesc>
        </Alert>
        <DialogFooter className="mt-4 flex-col sm:flex-row gap-2">
           <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">Continue Shopping</Button>
           <Button onClick={handleTrackOrderClick} className="w-full">Track My Order</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

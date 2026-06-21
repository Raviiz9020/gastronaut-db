
'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface CancellationReasonDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: (reason: string) => void;
}

const cancellationOptions = [
    "Apologies we are closed not accepting orders",
    "Apologies Item you requested is not available / sold out",
    "Apologies we cant deliver at this time",
    "Others"
]

export default function CancellationReasonDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: CancellationReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    const finalReason = reason === 'Others' ? customReason : reason;
    if (finalReason) {
        onConfirm(finalReason);
    }
    setReason('');
    setCustomReason('');
  };

  const isConfirmDisabled = !reason || (reason === 'Others' && !customReason.trim());

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reason for Cancellation</AlertDialogTitle>
          <AlertDialogDescription>
            Please select a reason for cancelling this order. This will be visible to the customer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4">
            <RadioGroup value={reason} onValueChange={setReason}>
                {cancellationOptions.map((option) => (
                    <div className="flex items-center space-x-2" key={option}>
                        <RadioGroupItem value={option} id={option} />
                        <Label htmlFor={option} className="font-normal">{option}</Label>
                    </div>
                ))}
            </RadioGroup>
            
            {reason === 'Others' && (
                 <div className="pt-2">
                    <Label htmlFor="custom-reason" className="mb-2 block">Please specify:</Label>
                    <Textarea
                        id="custom-reason"
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        placeholder="Type your custom message here..."
                    />
                </div>
            )}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => { setReason(''); setCustomReason('')}}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isConfirmDisabled}>
            Confirm Cancellation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

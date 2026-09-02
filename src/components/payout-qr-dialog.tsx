'use client';

import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import QRCode from 'qrcode';
import Image from 'next/image';
import { 
  QrCode, 
  Copy, 
  Check, 
  Phone, 
  AlertCircle, 
  CheckCheck, 
  ExternalLink,
  ShieldCheck,
  Receipt
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PayoutQrDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  payeeName: string;
  payeeType: 'vendor' | 'rider';
  upiId?: string;
  contact?: string;
  netPayout: number;
  totalSubtotal?: number;
  totalCommission?: number;
  ordersCount: number;
  onConfirmSettlement: () => Promise<void> | void;
  isProcessing?: boolean;
}

export default function PayoutQrDialog({
  isOpen,
  onOpenChange,
  title,
  payeeName,
  payeeType,
  upiId,
  contact,
  netPayout,
  totalSubtotal,
  totalCommission,
  ordersCount,
  onConfirmSettlement,
  isProcessing = false
}: PayoutQrDialogProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const cleanUpiId = upiId?.trim() || '';
  const note = `HyperDelivery Settlement - ${payeeName.slice(0, 15)}`;
  const upiString = cleanUpiId
    ? `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(payeeName)}&am=${netPayout.toFixed(2)}&cu=INR&tn=${encodeURIComponent(note)}`
    : '';

  useEffect(() => {
    if (isOpen && upiString) {
      setIsGenerating(true);
      QRCode.toDataURL(upiString, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => {
          setQrCodeUrl(url);
          setIsGenerating(false);
        })
        .catch((err) => {
          console.error('Failed to generate Payout QR:', err);
          setIsGenerating(false);
        });
    }

    if (!isOpen) {
      setQrCodeUrl('');
      setCopied(false);
    }
  }, [isOpen, upiString]);

  const copyUpiId = () => {
    if (!cleanUpiId) return;
    navigator.clipboard.writeText(cleanUpiId);
    setCopied(true);
    toast({ title: 'Copied!', description: `UPI ID ${cleanUpiId} copied to clipboard.` });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyAmount = () => {
    navigator.clipboard.writeText(netPayout.toFixed(2));
    toast({ title: 'Copied!', description: `Amount ₹${netPayout.toFixed(2)} copied to clipboard.` });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 overflow-hidden">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2 border border-emerald-500/20">
            <QrCode className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            {title || `Pay Net Payout — ${payeeName}`}
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            Scan with any UPI app (GPay, PhonePe, Paytm) to transfer the exact net payout.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Amount Badge Banner */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 rounded-2xl p-3.5 text-center">
            <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
              Exact Net Payout
            </div>
            <div className="flex items-center justify-center gap-2 mt-0.5">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                ₹{netPayout.toFixed(2)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={copyAmount}
                title="Copy Exact Amount"
                className="h-7 w-7 rounded-lg text-emerald-700 hover:bg-emerald-500/20"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            {totalSubtotal !== undefined && totalCommission !== undefined && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Gross Sales: <strong>₹{totalSubtotal.toFixed(2)}</strong> · Commission: <strong>-₹{totalCommission.toFixed(2)}</strong> ({ordersCount} Orders)
              </p>
            )}
          </div>

          {/* QR Code Container */}
          {cleanUpiId ? (
            <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm">
              {qrCodeUrl ? (
                <div className="relative p-2 bg-white rounded-xl">
                  <Image
                    src={qrCodeUrl}
                    alt={`Payout QR Code for ${payeeName}`}
                    width={220}
                    height={220}
                    className="rounded-lg"
                    priority
                  />
                </div>
              ) : (
                <div className="w-[220px] h-[220px] flex flex-col items-center justify-center text-muted-foreground text-xs">
                  {isGenerating ? 'Generating secure UPI QR...' : 'Loading QR...'}
                </div>
              )}
              <span className="text-[10px] text-muted-foreground font-medium mt-1">
                🔒 Amount & Beneficiary UPI are pre-locked
              </span>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
              <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
              <h4 className="font-bold text-sm text-foreground">No UPI ID Configured</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                {payeeName} does not have a registered UPI ID on their profile. Please contact them or transfer to their bank account directly.
              </p>
              {contact && (
                <a href={`tel:${contact}`} className="inline-block mt-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-2 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10">
                    <Phone className="h-3.5 w-3.5" />
                    Call {payeeName} ({contact})
                  </Button>
                </a>
              )}
            </div>
          )}

          {/* Beneficiary Details Row */}
          {cleanUpiId && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/40 border text-xs">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                  Beneficiary UPI ID
                </span>
                <span className="font-mono font-bold text-foreground truncate block">
                  {cleanUpiId}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyUpiId}
                  className="rounded-xl h-8 text-xs gap-1.5 border-border"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                {contact && (
                  <a href={`tel:${contact}`} title="Call Payee">
                    <Button variant="outline" size="icon" className="rounded-xl h-8 w-8">
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Direct Mobile UPI Intent Link */}
          {cleanUpiId && (
            <div className="block sm:hidden text-center">
              <a href={upiString}>
                <Button variant="secondary" size="sm" className="w-full rounded-xl text-xs gap-2 font-bold h-9">
                  <ExternalLink className="h-3.5 w-3.5 text-primary" />
                  Open in GPay / PhonePe / Paytm
                </Button>
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer / Confirmation Action */}
        <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between pt-3 border-t mt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="rounded-xl text-xs font-semibold"
          >
            Close
          </Button>

          <Button
            onClick={onConfirmSettlement}
            disabled={isProcessing}
            className="rounded-xl text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 shadow-md font-bold text-xs gap-2 h-10 px-5"
          >
            <CheckCheck className="h-4 w-4" />
            {isProcessing ? 'Settling...' : 'I Have Paid — Confirm & Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

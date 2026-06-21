'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import QRCode from 'qrcode';
import Image from 'next/image';
import type { Order, Vendor } from '@/types';

interface QrCodeDialogProps {
  order: Order | null;
  vendor?: Vendor | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const QrCodeDialog = ({ order, vendor, isOpen, onOpenChange }: QrCodeDialogProps) => {
    const [qrCodeUrl, setQrCodeUrl] = useState('');

    useEffect(() => {
        if (isOpen && vendor?.upiId && order) {
            const cleanUpiId = vendor.upiId.trim();
            const orderIdentifier = order.displayId || order.orderId;
            const transactionNote = `Order ${orderIdentifier}`;
            const upiString = `upi://pay?pa=${cleanUpiId}&pn=${encodeURIComponent(vendor.shopName || vendor.name)}&am=${order.totalPrice.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote)}`;
            QRCode.toDataURL(upiString, { width: 256 })
                .then(url => {
                    setQrCodeUrl(url);
                })
                .catch(err => {
                    console.error('QR code generation failed:', err);
                });
        }
        if (!isOpen) {
            setQrCodeUrl(''); // Reset QR code on close
        }
    }, [isOpen, order, vendor]);
    
    if (!isOpen || !order || !vendor?.upiId) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xs sm:rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-center">Scan to Pay</DialogTitle>
                    <DialogDescription className="text-center">
                        <span className="font-bold text-lg text-foreground">₹{order.totalPrice.toFixed(2)}</span><br/>
                        to {vendor.shopName}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-4 gap-4">
                    {qrCodeUrl ? (
                        <Image src={qrCodeUrl} alt={`QR Code for Order #${order.displayId || order.orderId}`} width={256} height={256} />
                    ) : (
                        <p>Generating QR code...</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default QrCodeDialog;

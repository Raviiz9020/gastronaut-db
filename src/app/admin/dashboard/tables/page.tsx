'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useVendor } from '@/context/vendor-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  QrCode,
  Download,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Sparkles,
  ShieldAlert,
  ArrowUpRight,
  Utensils,
  Layers,
  Plus,
  Minus,
  Loader2,
  Store,
  Grid,
  MapPin,
  Tag,
  Percent,
} from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import copy from 'copy-to-clipboard';
import { cn } from '@/lib/utils';
import { useMenu } from '@/context/menu-context';
import { db } from '@/lib/firebase';
import { writeBatch, doc } from 'firebase/firestore';
import type { MenuItem } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function AdminTablesQRPage() {
  const { vendor, updateDetails } = useVendor();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'universal' | 'individual'>('universal');
  const [tableCount, setTableCount] = useState<number>(6);
  const [isUpdatingCount, setIsUpdatingCount] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Dine-In Geofence Radius (meters, default 300)
  const [dineInRadius, setDineInRadius] = useState<number>(300);
  const [isUpdatingRadius, setIsUpdatingRadius] = useState(false);

  // QR Data URLs cache
  const [universalQrUrl, setUniversalQrUrl] = useState<string>('');
  const [tableQrUrls, setTableQrUrls] = useState<Record<number, string>>({});
  const [isGeneratingPdfs, setIsGeneratingPdfs] = useState(false);

  const shopName = vendor?.shopName || vendor?.name || 'Restaurant';
  const vendorIdentifier = vendor?.slug || vendor?.username || '';

  // Calculate base URL
  const baseUrl = useMemo(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/vendor/${vendorIdentifier}`;
    }
    return `https://hyperdelivery.in/vendor/${vendorIdentifier}`;
  }, [vendorIdentifier]);

  // Sync table count and geofence radius with vendor data
  useEffect(() => {
    if (vendor?.dineInTables) {
      setTableCount(vendor.dineInTables);
    }
    if (vendor?.dineInRadiusMeters) {
      setDineInRadius(vendor.dineInRadiusMeters);
    }
  }, [vendor?.dineInTables, vendor?.dineInRadiusMeters]);

  // Menu items and Bulk Dine-In Pricing Generator state
  const { menuItems: allMenuItems } = useMenu();
  const vendorMenuItems = useMemo(() => {
    if (!vendor?.username) return [];
    return allMenuItems.filter(item => item.vendorUsername === vendor.username);
  }, [allMenuItems, vendor]);

  const vendorCommission = typeof vendor?.commissionPercentage === 'number' && vendor.commissionPercentage > 0 
    ? vendor.commissionPercentage 
    : 10;

  const [selectedReduction, setSelectedReduction] = useState<number>(vendorCommission);
  const [customReduction, setCustomReduction] = useState<string>('');
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [overwriteMode, setOverwriteMode] = useState<'unconfigured' | 'all'>('unconfigured');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isApplyingBatch, setIsApplyingBatch] = useState(false);

  useEffect(() => {
    if (!isCustomSelected && vendorCommission) {
      setSelectedReduction(vendorCommission);
    }
  }, [vendorCommission, isCustomSelected]);

  const totalItemsCount = vendorMenuItems.length;
  const configuredItemsCount = useMemo(() => {
    return vendorMenuItems.filter(i => typeof i.dineInPrice === 'number' && i.dineInPrice > 0).length;
  }, [vendorMenuItems]);
  const unconfiguredItemsCount = totalItemsCount - configuredItemsCount;

  const effectiveReduction = isCustomSelected 
    ? Math.max(1, Math.min(90, parseInt(customReduction, 10) || 10)) 
    : selectedReduction;

  const targetItems = useMemo(() => {
    if (overwriteMode === 'all') return vendorMenuItems;
    return vendorMenuItems.filter(item => {
      const isItemMissing = typeof item.dineInPrice !== 'number' || item.dineInPrice <= 0;
      const hasMissingOption = item.customizations?.some(c => 
        c.options.some(o => typeof o.dineInPrice !== 'number' || o.dineInPrice <= 0)
      );
      return isItemMissing || hasMissingOption;
    });
  }, [vendorMenuItems, overwriteMode]);

  const sampleItemsPreview = useMemo(() => {
    return targetItems.slice(0, 3).map(item => {
      const currentPrice = item.price || 0;
      const newDineInPrice = Math.round(currentPrice * (1 - effectiveReduction / 100));
      return {
        id: item.id,
        name: item.name,
        price: currentPrice,
        newDineInPrice,
        saving: currentPrice - newDineInPrice,
      };
    });
  }, [targetItems, effectiveReduction]);

  const handleExecuteBulkUpdate = async () => {
    if (!vendor?.username || targetItems.length === 0) return;
    setIsApplyingBatch(true);
    try {
      let updatedCount = 0;
      const CHUNK_SIZE = 400;

      for (let i = 0; i < targetItems.length; i += CHUNK_SIZE) {
        const chunk = targetItems.slice(i, i + CHUNK_SIZE);
        const batch = writeBatch(db);

        chunk.forEach(item => {
          const updateData: Partial<MenuItem> = {};

          if (overwriteMode === 'all' || typeof item.dineInPrice !== 'number' || item.dineInPrice <= 0) {
            if (item.price > 0) {
              updateData.dineInPrice = Math.round(item.price * (1 - effectiveReduction / 100));
            }
          }

          if (item.customizations && item.customizations.length > 0) {
            const updatedCustomizations = item.customizations.map(group => ({
              ...group,
              options: group.options.map(opt => {
                if (overwriteMode === 'all' || typeof opt.dineInPrice !== 'number' || opt.dineInPrice <= 0) {
                  if (opt.price > 0) {
                    return {
                      ...opt,
                      dineInPrice: Math.round(opt.price * (1 - effectiveReduction / 100))
                    };
                  }
                }
                return opt;
              })
            }));
            updateData.customizations = updatedCustomizations;
          }

          if (Object.keys(updateData).length > 0) {
            const docRef = doc(db, 'menuItems', item.id);
            batch.update(docRef, updateData);
            updatedCount++;
          }
        });

        await batch.commit();
      }

      toast({
        title: "⚡ Dine-In Prices Updated!",
        description: `Successfully updated ${updatedCount} menu items at -${effectiveReduction}%.`,
      });
      setIsConfirmModalOpen(false);
    } catch (error: any) {
      console.error("Error bulk updating dine-in prices:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update menu items in bulk.",
        variant: "destructive"
      });
    } finally {
      setIsApplyingBatch(false);
    }
  };

  // Generate Universal QR
  useEffect(() => {
    if (!vendorIdentifier) return;
    QRCode.toDataURL(baseUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })
      .then((url) => setUniversalQrUrl(url))
      .catch((err) => console.error('Failed to generate universal QR:', err));
  }, [baseUrl, vendorIdentifier]);

  // Generate Individual Table QRs
  useEffect(() => {
    if (!vendorIdentifier || tableCount <= 0) return;

    const generateTableQrs = async () => {
      const urls: Record<number, string> = {};
      for (let i = 1; i <= tableCount; i++) {
        const tableUrl = `${baseUrl}?table=${i}`;
        try {
          const url = await QRCode.toDataURL(tableUrl, {
            width: 350,
            margin: 2,
            color: { dark: '#000000', light: '#ffffff' },
          });
          urls[i] = url;
        } catch (e) {
          console.error(`Failed to generate QR for table ${i}:`, e);
        }
      }
      setTableQrUrls(urls);
    };

    generateTableQrs();
  }, [baseUrl, vendorIdentifier, tableCount]);

  const handleUpdateTableCount = async (newCount: number) => {
    const clamped = Math.max(1, Math.min(50, newCount));
    setTableCount(clamped);
    setIsUpdatingCount(true);
    try {
      await updateDetails({ dineInTables: clamped });
      toast({
        title: 'Table Count Updated',
        description: `Your shop is now configured for ${clamped} dine-in tables.`,
      });
    } catch (e) {
      toast({
        title: 'Update failed',
        description: 'Could not update table count.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingCount(false);
    }
  };

  const handleUpdateRadius = async (newRadius: number) => {
    const clamped = Math.max(100, Math.min(1000, newRadius));
    setDineInRadius(clamped);
    setIsUpdatingRadius(true);
    try {
      await updateDetails({ dineInRadiusMeters: clamped });
      toast({
        title: 'Geofence Radius Updated',
        description: `Dine-in boundary set to ${clamped} meters.`,
      });
    } catch (e) {
      toast({
        title: 'Update failed',
        description: 'Could not update geofence radius.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingRadius(false);
    }
  };

  const handleCopyLink = (url: string) => {
    copy(url);
    setCopiedUrl(true);
    toast({ title: 'Link Copied', description: 'Table order link copied to clipboard.' });
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const generateAndDownloadCardPng = (
    qrDataUrl: string,
    title: string,
    badgeText: string,
    instructionText: string,
    filename: string
  ) => {
    if (!qrDataUrl) return;

    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1000;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Clean White Background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Helper for rounded rectangles
    const drawRoundRect = (
      rx: number,
      ry: number,
      rw: number,
      rh: number,
      radius: number,
      fillColor?: string,
      strokeColor?: string,
      strokeWidth?: number
    ) => {
      ctx.beginPath();
      ctx.moveTo(rx + radius, ry);
      ctx.lineTo(rx + rw - radius, ry);
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
      ctx.lineTo(rx + rw, ry + rh - radius);
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
      ctx.lineTo(rx + radius, ry + rh);
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
      ctx.lineTo(rx, ry + radius);
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
      ctx.closePath();
      if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fill();
      }
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth || 1;
        ctx.stroke();
      }
    };

    // 2. Outer Card Border
    drawRoundRect(24, 24, canvas.width - 48, canvas.height - 48, 28, undefined, '#CBD5E1', 3);

    // 3. Top Header Box
    drawRoundRect(44, 44, canvas.width - 88, 140, 18, '#F8FAFC', '#E2E8F0', 1.5);

    // 4. Shop Name at Top (Dynamic sizing for long names)
    ctx.textAlign = 'center';
    const cleanTitle = title.trim() || 'Restaurant';
    const fontSize = cleanTitle.length > 26 ? 26 : cleanTitle.length > 18 ? 30 : 36;
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = '#0F172A';
    ctx.fillText(cleanTitle.toUpperCase(), canvas.width / 2, 115);

    // Subtitle under shop name
    ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('DINE-IN DIGITAL MENU & ORDERING', canvas.width / 2, 155);

    // 5. Draw QR Image
    const img = document.createElement('img');
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const qrSize = 460;
      const qrX = (canvas.width - qrSize) / 2;
      const qrY = 225;

      // Subtle QR border box
      drawRoundRect(qrX - 12, qrY - 12, qrSize + 24, qrSize + 24, 16, '#FFFFFF', '#F1F5F9', 2);
      ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

      // 6. Draw BOLD Table / Action Badge Pill
      const bw = 340;
      const bh = 68;
      const bx = (canvas.width - bw) / 2;
      const by = 740;

      // Dark Charcoal Pill
      drawRoundRect(bx, by, bw, bh, 34, '#0F172A');

      ctx.font = 'bold 34px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(badgeText, canvas.width / 2, by + 47);

      // 7. Helper Instruction
      ctx.font = '500 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText(instructionText, canvas.width / 2, 850);

      // 8. Footer
      ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText('Powered by HyperDelivery · Scan with camera to order', canvas.width / 2, 920);

      // Trigger Download
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Card Downloaded',
        description: `Saved PNG for ${badgeText} with ${cleanTitle}.`,
      });
    };
    img.onerror = () => {
      toast({
        title: 'Download Failed',
        description: 'Could not render the card image.',
        variant: 'destructive',
      });
    };
    img.src = qrDataUrl;
  };

  // Generate PDF Flyer for Single Universal QR (A4 Standee)
  const handleDownloadUniversalPdf = () => {
    if (!universalQrUrl) return;
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Outer Decorative Border
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(1);
      doc.roundedRect(12, 12, pageWidth - 24, pageHeight - 24, 6, 6);

      // Inner Accent Header Card
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(20, 20, pageWidth - 40, 48, 4, 4, 'F');

      // Shop Name Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(15, 23, 42);
      doc.text(shopName.toUpperCase(), pageWidth / 2, 40, { align: 'center' });

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(13);
      doc.setTextColor(100, 116, 139);
      doc.text('DIGITAL MENU & SELF-ORDERING', pageWidth / 2, 53, { align: 'center' });

      // Big QR Code in Center
      const qrSize = 105;
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 82;
      doc.addImage(universalQrUrl, 'PNG', qrX, qrY, qrSize, qrSize);

      // Call to action pill
      doc.setFillColor(16, 185, 129); // Emerald accent
      doc.roundedRect(pageWidth / 2 - 45, qrY + qrSize + 12, 90, 12, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text('SCAN TO ORDER ON YOUR TABLE', pageWidth / 2, qrY + qrSize + 20, { align: 'center' });

      // Step-by-Step Instructions
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 41, 59);
      doc.text('How to Order:', pageWidth / 2, qrY + qrSize + 40, { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(71, 85, 105);
      doc.text('1. Open your phone camera and point it at the QR code', pageWidth / 2, qrY + qrSize + 48, { align: 'center' });
      doc.text('2. Tap the link to view our live digital menu', pageWidth / 2, qrY + qrSize + 55, { align: 'center' });
      doc.text('3. Choose your table number & send items to the kitchen', pageWidth / 2, qrY + qrSize + 62, { align: 'center' });

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Powered by HyperDelivery · No app install required', pageWidth / 2, pageHeight - 18, { align: 'center' });

      doc.save(`${vendorIdentifier}-universal-menu-qr.pdf`);
      toast({ title: 'Flyer Downloaded', description: 'Universal QR Standee PDF is ready to print.' });
    } catch (e) {
      console.error('Failed to generate universal PDF:', e);
      toast({ title: 'Error', description: 'Could not generate PDF.', variant: 'destructive' });
    }
  };

  // Generate Multi-Sticker A4 PDF Sheet for Table 1..N
  const handleDownloadAllTableStickersPdf = async () => {
    if (Object.keys(tableQrUrls).length === 0) return;
    setIsGeneratingPdfs(true);

    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Grid Layout: 2 columns x 3 rows = 6 stickers per A4 page
      const cols = 2;
      const rows = 3;
      const stickersPerPage = cols * rows;
      const marginX = 14;
      const marginY = 15;
      const stickerWidth = (pageWidth - marginX * 2 - 10) / cols; // ~86mm
      const stickerHeight = (pageHeight - marginY * 2 - 16) / rows; // ~82mm
      const gapX = 10;
      const gapY = 8;

      let currentPage = 1;

      for (let i = 1; i <= tableCount; i++) {
        const indexOnPage = (i - 1) % stickersPerPage;

        if (indexOnPage === 0 && i > 1) {
          doc.addPage();
          currentPage++;
        }

        const col = indexOnPage % cols;
        const row = Math.floor(indexOnPage / cols);
        const x = marginX + col * (stickerWidth + gapX);
        const y = marginY + row * (stickerHeight + gapY);

        // Sticker Outer Border & Background
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.6);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, stickerWidth, stickerHeight, 4, 4, 'FD');

        // Shop Name Header inside sticker
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        const displayShop = shopName.length > 20 ? shopName.substring(0, 18) + '...' : shopName;
        doc.text(displayShop.toUpperCase(), x + stickerWidth / 2, y + 8, { align: 'center' });

        // QR Code in middle
        const qrSize = 42;
        const qrX = x + (stickerWidth - qrSize) / 2;
        const qrY = y + 11;
        const qrData = tableQrUrls[i];
        if (qrData) {
          doc.addImage(qrData, 'PNG', qrX, qrY, qrSize, qrSize);
        }

        // BOLD TABLE NUMBER BADGE (High contrast so staff knows immediately)
        doc.setFillColor(15, 23, 42); // Dark Charcoal
        const badgeWidth = 46;
        const badgeHeight = 8.5;
        const badgeX = x + (stickerWidth - badgeWidth) / 2;
        const badgeY = qrY + qrSize + 3;
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(`TABLE ${i}`, x + stickerWidth / 2, badgeY + 6, { align: 'center' });

        // Friendly instruction text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Scan camera to order from this table', x + stickerWidth / 2, badgeY + 13, { align: 'center' });
      }

      doc.save(`${vendorIdentifier}-table-stickers-1-to-${tableCount}.pdf`);
      toast({
        title: 'Table Stickers Generated',
        description: `Multi-sticker PDF for Tables 1 to ${tableCount} is downloaded.`,
      });
    } catch (e) {
      console.error('Failed to generate sticker PDF:', e);
      toast({ title: 'Generation Error', description: 'Could not generate sticker sheet.', variant: 'destructive' });
    } finally {
      setIsGeneratingPdfs(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER: Gated State (Non-paying / feature disabled)
  // -------------------------------------------------------------
  if (vendor && !vendor.canAcceptDineIn) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-4xl space-y-6">
        <Card className="border-amber-500/30 bg-amber-500/5 rounded-3xl overflow-hidden shadow-xs">
          <CardHeader className="text-center p-8 sm:p-12 space-y-3">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold font-headline">Dine-In & QR Ordering is Locked</CardTitle>
            <CardDescription className="text-sm max-w-md mx-auto text-muted-foreground">
              Dine-In self-ordering from tables is a premium feature. Please contact the platform administrator to activate this capability for your store.
            </CardDescription>
            <div className="pt-4 flex flex-wrap justify-center gap-3">
              <Link href="/admin/dashboard">
                <Button variant="outline" className="rounded-full">Back to Dashboard</Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight">Dine-In QR Studio</h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-xs">
              Feature Active
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate and print table QR standees and stickers for {shopName}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/vendor/${vendorIdentifier}/tables`} target="_blank">
            <Button variant="outline" size="sm" className="rounded-full text-xs font-bold gap-1.5 h-9">
              <Utensils className="h-3.5 w-3.5 text-primary" />
              Floor POS
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={() => handleCopyLink(baseUrl)}
            variant="secondary"
            className="rounded-full text-xs font-bold gap-1.5 h-9"
          >
            {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedUrl ? 'Copied' : 'Copy Menu URL'}
          </Button>
        </div>
      </div>

      {/* Table Capacity & Geofence Configuration Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Total Tables */}
        <Card className="rounded-2xl border-primary/20 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Grid className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Total Dine-In Tables</h3>
                  <p className="text-xs text-muted-foreground">Number of physical tables available for ordering.</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto pt-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                disabled={tableCount <= 1 || isUpdatingCount}
                onClick={() => handleUpdateTableCount(tableCount - 1)}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-10 text-center font-bold text-base">{tableCount}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-full"
                disabled={tableCount >= 50 || isUpdatingCount}
                onClick={() => handleUpdateTableCount(tableCount + 1)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground pl-1">tables configured</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Dine-In Geofence Radius */}
        <Card className="rounded-2xl border-primary/20 bg-card shadow-xs">
          <CardContent className="p-4 sm:p-5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground">Geofence Boundary</h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">Anti-spoof soft verification radius.</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-black px-2.5 py-0.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 shrink-0">
                {dineInRadius}m
              </Badge>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5 pt-1 flex-wrap">
              {[
                { label: '150m (Compact)', val: 150 },
                { label: '300m (Standard)', val: 300 },
                { label: '500m (Resort)', val: 500 },
              ].map((preset) => {
                const isActive = dineInRadius === preset.val;
                return (
                  <button
                    key={preset.val}
                    type="button"
                    disabled={isUpdatingRadius}
                    onClick={() => handleUpdateRadius(preset.val)}
                    className={cn(
                      "text-[11px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-muted/60 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Dine-In Pricing Generator Card */}
      <Card className="rounded-2xl border-primary/20 bg-card shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                <Tag className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-bold font-headline flex items-center gap-2">
                  Bulk Dine-In Price Generator
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Quickly set fair in-store prices for all menu items and variations without manual entry.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full",
                  configuredItemsCount === totalItemsCount && totalItemsCount > 0
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                    : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                )}
              >
                {configuredItemsCount} of {totalItemsCount} items configured
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 space-y-5">
          {/* Platform Commission Notice */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5 sm:mt-0">
                <Percent className="h-3.5 w-3.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  Your Platform Commission: <span className="text-primary font-black">{vendorCommission}%</span>
                </p>
                <p className="text-[11px] text-muted-foreground leading-snug">
                  Online delivery prices usually include this platform markup. We recommend reducing by {vendorCommission}% for in-store diners.
                </p>
              </div>
            </div>
          </div>

          {/* Reduction Rate Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Select Dine-In Reduction Percentage:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: `${vendorCommission}% (Commission Rate)`, val: vendorCommission },
                { label: '15%', val: 15 },
                { label: '20%', val: 20 },
              ].map(opt => {
                const isActive = !isCustomSelected && selectedReduction === opt.val;
                return (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => {
                      setIsCustomSelected(false);
                      setSelectedReduction(opt.val);
                    }}
                    className={cn(
                      "text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                        : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setIsCustomSelected(true)}
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-full border transition-all cursor-pointer",
                  isCustomSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                )}
              >
                Custom %
              </button>

              {isCustomSelected && (
                <div className="flex items-center gap-1.5 ml-1">
                  <Input
                    type="number"
                    min="1"
                    max="90"
                    placeholder="e.g. 12"
                    value={customReduction}
                    onChange={(e) => setCustomReduction(e.target.value)}
                    className="h-8 w-20 text-xs text-center font-bold"
                  />
                  <span className="text-xs font-bold text-muted-foreground">%</span>
                </div>
              )}
            </div>

            {/* Live Rounding Example */}
            <p className="text-[11px] text-muted-foreground bg-muted/30 px-3 py-2 rounded-lg border border-border/40 inline-block">
              💡 Example calculation: ₹100 item becomes <strong className="text-foreground">₹{Math.round(100 * (1 - effectiveReduction / 100))}</strong> • ₹95 item becomes <strong className="text-foreground">₹{Math.round(95 * (1 - effectiveReduction / 100))}</strong> (clean whole rupee, zero paise).
            </p>
          </div>

          {/* Scope Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground block">
              Application Scope:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => setOverwriteMode('unconfigured')}
                className={cn(
                  "p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5",
                  overwriteMode === 'unconfigured'
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/70 hover:border-primary/40 bg-card"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                  overwriteMode === 'unconfigured' ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                )}>
                  {overwriteMode === 'unconfigured' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Only Unconfigured Items ({unconfiguredItemsCount})
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Safe mode — keeps any custom Dine-In prices you have already manually set.
                  </p>
                </div>
              </div>

              <div
                onClick={() => setOverwriteMode('all')}
                className={cn(
                  "p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5",
                  overwriteMode === 'all'
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border/70 hover:border-primary/40 bg-card"
                )}
              >
                <div className={cn(
                  "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5",
                  overwriteMode === 'all' ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                )}>
                  {overwriteMode === 'all' && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">
                    Overwrite All Menu Items ({totalItemsCount})
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    Recalculates and replaces Dine-In prices on every item and variation.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground">
              {targetItems.length > 0 ? (
                <>Ready to apply <strong>-{effectiveReduction}%</strong> to <strong>{targetItems.length}</strong> items.</>
              ) : (
                <>All menu items already have Dine-In prices configured.</>
              )}
            </span>

            <Button
              type="button"
              disabled={targetItems.length === 0 || isApplyingBatch}
              onClick={() => setIsConfirmModalOpen(true)}
              className="rounded-full font-bold text-xs gap-1.5 px-5 h-9"
            >
              {isApplyingBatch ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Preview & Apply to {targetItems.length} Items
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Mode Selector Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 max-w-md h-11 p-1 rounded-full bg-muted/80">
          <TabsTrigger value="universal" className="rounded-full text-xs font-bold gap-2">
            <Store className="h-4 w-4" />
            Single Universal QR
          </TabsTrigger>
          <TabsTrigger value="individual" className="rounded-full text-xs font-bold gap-2">
            <Layers className="h-4 w-4" />
            Table-Specific Stickers
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SINGLE UNIVERSAL QR STANDEE */}
        <TabsContent value="universal" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Visual Standee Card Preview */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm rounded-3xl border-2 border-primary/20 bg-card p-6 shadow-xl text-center space-y-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />

                {/* Header info */}
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    Table Standee
                  </Badge>
                  <h2 className="text-xl font-black font-headline text-foreground">{shopName}</h2>
                  <p className="text-xs text-muted-foreground">Dine-In Digital Menu & Ordering</p>
                </div>

                {/* QR Box */}
                <div className="p-3 bg-white rounded-2xl inline-block shadow-sm border border-slate-100">
                  {universalQrUrl ? (
                    <Image src={universalQrUrl} alt="Universal QR Code" width={220} height={220} className="mx-auto" />
                  ) : (
                    <div className="w-52 h-52 flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* CTA Tag */}
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-extrabold">
                    <Sparkles className="h-3.5 w-3.5" />
                    Scan with camera to order
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Diners scan this single QR, choose their table, and order directly.
                  </p>
                </div>
              </div>
            </div>

            {/* Explainer & Download Options */}
            <div className="lg:col-span-7 space-y-4">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Single Universal QR Standee</CardTitle>
                  <CardDescription className="text-xs">
                    Best for restaurants that prefer printing <strong>one standard QR standee</strong> for all tables or at the entrance.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-muted/40 border text-xs space-y-2">
                    <p className="font-bold text-foreground">How this works for customers:</p>
                    <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                      <li>Customer sits at any table and scans this QR code.</li>
                      <li>Our app opens and gently asks: <em>"Which table are you at?"</em></li>
                      <li>Customer taps their table number (or browses first) and sends food to the kitchen.</li>
                    </ol>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      onClick={handleDownloadUniversalPdf}
                      disabled={!universalQrUrl}
                      className="rounded-full text-xs font-bold gap-2 h-10 px-5 shadow-xs"
                    >
                      <Printer className="h-4 w-4" />
                      Download Standee Flyer (PDF)
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        generateAndDownloadCardPng(
                          universalQrUrl,
                          shopName,
                          'SCAN TO ORDER',
                          'Scan camera to choose table & order food',
                          `${vendorIdentifier}-universal-menu-card.png`
                        )
                      }
                      disabled={!universalQrUrl}
                      className="rounded-full text-xs font-bold gap-2 h-10 px-4"
                    >
                      <Download className="h-4 w-4" />
                      Download Standee Card (PNG)
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* TAB 2: TABLE-SPECIFIC QR STICKERS */}
        <TabsContent value="individual" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-2xl bg-muted/40 border">
            <div>
              <h3 className="text-sm font-bold text-foreground">Individual Table Stickers ({tableCount} Tables)</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every sticker is pre-linked to its specific table number with shop name and high-contrast table label.
              </p>
            </div>

            <Button
              onClick={handleDownloadAllTableStickersPdf}
              disabled={isGeneratingPdfs || Object.keys(tableQrUrls).length === 0}
              className="rounded-full text-xs font-bold gap-2 h-10 px-6 shrink-0 bg-primary shadow-xs"
            >
              {isGeneratingPdfs ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              Download All Stickers (PDF Sheet)
            </Button>
          </div>

          {/* Grid Preview of All Tables */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: tableCount }, (_, idx) => idx + 1).map((tableNum) => {
              const qrData = tableQrUrls[tableNum];
              const tableUrl = `${baseUrl}?table=${tableNum}`;

              return (
                <Card
                  key={tableNum}
                  className="rounded-2xl p-3 border hover:border-primary/50 transition-all flex flex-col items-center justify-between text-center gap-2 bg-card shadow-xs group"
                >
                  {/* Shop name tag */}
                  <span className="text-[10px] font-bold text-muted-foreground line-clamp-1">
                    {shopName}
                  </span>

                  {/* QR Image */}
                  <div className="p-1.5 bg-white rounded-xl shadow-2xs border">
                    {qrData ? (
                      <Image
                        src={qrData}
                        alt={`Table ${tableNum} QR`}
                        width={110}
                        height={110}
                        className="mx-auto"
                      />
                    ) : (
                      <div className="w-24 h-24 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Table Badge */}
                  <Badge className="bg-slate-900 hover:bg-slate-900 text-white font-black text-xs px-2.5 py-0.5 rounded-full">
                    TABLE {tableNum}
                  </Badge>

                  {/* Actions */}
                  <div className="w-full flex items-center justify-center gap-1.5 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-[11px] font-semibold rounded-full gap-1 shadow-2xs hover:bg-primary hover:text-primary-foreground transition-colors"
                      title={`Download Table ${tableNum} Sticker Card (PNG)`}
                      onClick={() =>
                        qrData &&
                        generateAndDownloadCardPng(
                          qrData,
                          shopName,
                          `TABLE ${tableNum}`,
                          `Scan camera to order from Table ${tableNum}`,
                          `${vendorIdentifier}-table-${tableNum}-card.png`
                        )
                      }
                    >
                      <Download className="h-3 w-3" />
                      PNG
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
                      title="Copy URL"
                      onClick={() => handleCopyLink(tableUrl)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmModalOpen} onOpenChange={setIsConfirmModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold font-headline flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Confirm Bulk Price Update
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              You are about to calculate and set in-store Dine-In prices at a <strong>-{effectiveReduction}%</strong> reduction for <strong>{targetItems.length}</strong> menu items and their variations.
            </DialogDescription>
          </DialogHeader>

          {/* Sample items preview */}
          <div className="py-2 space-y-3">
            <p className="text-xs font-bold text-foreground">Sample Preview:</p>
            <div className="rounded-xl border border-border/70 overflow-hidden divide-y divide-border/50 bg-muted/20 text-xs">
              {sampleItemsPreview.length > 0 ? (
                sampleItemsPreview.map(sample => (
                  <div key={sample.id} className="p-2.5 flex items-center justify-between">
                    <span className="font-medium truncate max-w-[170px] sm:max-w-[200px]">{sample.name}</span>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-muted-foreground line-through">₹{sample.price}</span>
                      <span className="font-extrabold text-foreground">➔ ₹{sample.newDineInPrice}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        (-₹{sample.saving})
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 text-center text-muted-foreground text-xs">
                  All items are already configured.
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              ✓ All prices are strictly rounded to whole rupees (no paise).<br />
              ✓ You can still edit individual menu items anytime in your Menu Manager.
            </p>
          </div>

          <DialogFooter className="flex-row sm:justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isApplyingBatch}
              onClick={() => setIsConfirmModalOpen(false)}
              className="rounded-full text-xs font-bold flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isApplyingBatch}
              onClick={handleExecuteBulkUpdate}
              className="rounded-full text-xs font-bold gap-1.5 flex-1 sm:flex-initial"
            >
              {isApplyingBatch ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Applying Batch...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Confirm & Update {targetItems.length} Items
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

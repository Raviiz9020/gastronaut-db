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
} from 'lucide-react';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import copy from 'copy-to-clipboard';
import { cn } from '@/lib/utils';

export default function AdminTablesQRPage() {
  const { vendor, updateDetails } = useVendor();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'universal' | 'individual'>('universal');
  const [tableCount, setTableCount] = useState<number>(6);
  const [isUpdatingCount, setIsUpdatingCount] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

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

  // Sync table count with vendor data
  useEffect(() => {
    if (vendor?.dineInTables) {
      setTableCount(vendor.dineInTables);
    }
  }, [vendor?.dineInTables]);

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

      {/* Table Capacity Configuration Bar */}
      <Card className="rounded-2xl border-primary/20 bg-card shadow-xs">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Grid className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Total Dine-In Tables</h3>
              <p className="text-xs text-muted-foreground">Number of physical tables available for customer self-ordering.</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
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
            <span className="text-xs text-muted-foreground pl-1">tables</span>
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
    </div>
  );
}

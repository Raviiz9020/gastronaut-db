'use client';

import { useState, useRef, useTransition, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOffer } from '@/context/offer-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  Mail,
  Upload,
  Send,
  Wand2,
  Users,
  Building,
  Globe,
  Sparkles,
  FileDown,
  User,
  CheckCircle2,
  Eye,
  Store,
  Tag,
  Megaphone,
  Trash2,
  X,
  Smartphone,
  Layers,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { sendCampaignEmail } from '@/ai/flows/send-campaign-email';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';
import type { Vendor, Offer, Customer } from '@/types';
import { Combobox } from '@/components/ui/combobox';
import { useVendor } from '@/context/vendor-context';
import { useCustomer } from '@/context/customer-context';
import { generateCampaignEmail } from '@/ai/flows/generate-campaign-email';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const formSchema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters long.'),
  body: z.string().min(20, 'Email body must be at least 20 characters long.'),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

type AudienceType = 'all-vendors' | 'all-customers' | 'specific-vendor' | 'specific-customer' | 'all';

interface CampaignPreview {
  subject: string;
  body: string;
  imageUrl?: string;
  audience: {
    type: AudienceType;
    vendorId?: string;
    customerId?: string;
    description: string;
    recipientEmail?: string;
    recipientName?: string;
    recipientsList?: { email: string; name?: string }[];
  };
}

const ImportOfferDialog = ({
  offers,
  open,
  onOpenChange,
  onSelect
}: {
  offers: Offer[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (offer: Offer) => void;
}) => {
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const offerOptions = offers.map(o => ({
    value: o.id,
    label: `${o.title} (${o.vendorName || 'All Vendors'})`
  }));

  const handleConfirm = () => {
    const selectedOffer = offers.find(o => o.id === selectedOfferId);
    if (selectedOffer) {
      onSelect(selectedOffer);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border/80">
        <DialogHeader className="pb-2 border-b border-border/60">
          <DialogTitle className="text-lg font-bold font-headline flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <span>Import from Active Offer</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Select an active offer to automatically populate the campaign subject, body, and banner image.
          </DialogDescription>
        </DialogHeader>

        <div className="py-3">
          <Combobox
            options={offerOptions}
            value={selectedOfferId}
            onChange={setSelectedOfferId}
            placeholder="Select an offer to import..."
            searchPlaceholder="Search active offers..."
            noResultsText="No active offers found."
          />
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" size="sm" className="rounded-full text-xs font-bold">
              Cancel
            </Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!selectedOfferId}
            className="rounded-full text-xs font-bold px-4"
          >
            Import Content
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default function SuperAdminCampaignsPage() {
  const { allVendors } = useVendor();
  const { fetchAllCustomers } = useCustomer();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { offers, fetchAllOffers } = useOffer();
  const { toast } = useToast();
  const [isSending, startSending] = useTransition();
  const [isGenerating, startGenerating] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');

  const [audienceType, setAudienceType] = useState<AudienceType>('all-customers');
  const [specificVendorId, setSpecificVendorId] = useState<string | null>(null);
  const [specificCustomerId, setSpecificCustomerId] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<CampaignPreview | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  useEffect(() => {
    fetchAllOffers();
    const loadCustomers = async () => {
      const fetched = await fetchAllCustomers();
      setCustomers(fetched);
    };
    loadCustomers();
  }, [fetchAllOffers, fetchAllCustomers]);

  const activeOffers = useMemo(() => offers.filter(o => o.isActive), [offers]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: '', body: '', imageUrl: '' },
  });

  const { watch, setValue, reset } = form;
  const currentSubject = watch('subject');
  const currentBody = watch('body');
  const currentImageUrl = watch('imageUrl');

  const vendorOptions = useMemo(() => {
    return allVendors.map(v => ({
      value: v.username,
      label: `${v.shopName || v.name} (@${v.username})`,
    }));
  }, [allVendors]);

  const customerOptions = useMemo(() => {
    return customers.map(c => {
      const name = c.name || 'Unnamed';
      const contactInfo = c.email || c.contact || `@${c.username}`;
      return {
        value: c.username,
        label: `${name} (${contactInfo})`,
      };
    });
  }, [customers]);

  const handleGenerateCampaign = () => {
    if (!aiPrompt.trim()) {
      toast({ title: 'Please enter a prompt for the AI.', variant: 'destructive' });
      return;
    }
    startGenerating(async () => {
      try {
        const result = await generateCampaignEmail({ prompt: aiPrompt });
        if (result.subject && result.body) {
          setValue('subject', result.subject, { shouldValidate: true });
          setValue('body', result.body, { shouldValidate: true });
          toast({ title: 'Draft Generated!', description: 'Subject and body updated from AI.' });
        }
      } catch (e: any) {
        toast({ title: 'Generation Failed', description: e.message, variant: 'destructive' });
      }
    });
  };

  const getAudienceDescription = (): string => {
    switch (audienceType) {
      case 'all':
        return `All Audience (${customers.length + allVendors.length} Recipients)`;
      case 'all-vendors':
        return `All Partner Stores (${allVendors.length} Vendors)`;
      case 'all-customers':
        return `All Customers (${customers.length} Customers)`;
      case 'specific-vendor': {
        const vendor = allVendors.find(v => v.username === specificVendorId);
        return `Specific Store: ${vendor?.shopName || 'Select store'}`;
      }
      case 'specific-customer': {
        const customer = customers.find(c => c.username === specificCustomerId);
        return `Specific Customer: ${customer?.name || 'Select customer'}`;
      }
      default:
        return 'Audience';
    }
  };

  const handlePreview = (values: z.infer<typeof formSchema>) => {
    if (audienceType === 'specific-vendor' && !specificVendorId) {
      toast({ title: 'Please select a vendor', variant: 'destructive' });
      return;
    }
    if (audienceType === 'specific-customer' && !specificCustomerId) {
      toast({ title: 'Please select a customer', variant: 'destructive' });
      return;
    }

    const audiencePayload: CampaignPreview['audience'] = {
      type: audienceType,
      description: getAudienceDescription(),
    };

    if (audienceType === 'specific-vendor' && specificVendorId) {
      audiencePayload.vendorId = specificVendorId;
      const targetVendor = allVendors.find(v => v.username === specificVendorId);
      if (targetVendor?.email && targetVendor.email.trim() !== '') {
        audiencePayload.recipientEmail = targetVendor.email.trim();
        audiencePayload.recipientName = targetVendor.shopName || targetVendor.name || 'Valued Partner';
      } else {
        toast({ title: 'No Email Found', description: 'Selected store does not have a registered email address.', variant: 'destructive' });
        return;
      }
    }

    if (audienceType === 'specific-customer' && specificCustomerId) {
      audiencePayload.customerId = specificCustomerId;
      const targetCustomer = customers.find(c => c.username === specificCustomerId);
      if (targetCustomer?.email && targetCustomer.email.trim() !== '') {
        audiencePayload.recipientEmail = targetCustomer.email.trim();
        audiencePayload.recipientName = targetCustomer.name || 'Valued Customer';
      } else {
        toast({ title: 'No Email Found', description: 'Selected customer does not have a registered email address in their profile.', variant: 'destructive' });
        return;
      }
    }

    if (audienceType === 'all-customers') {
      audiencePayload.recipientsList = customers
        .filter(c => c.email && c.email.trim() !== '' && (c.emailPreferences?.campaigns ?? true))
        .map(c => ({ email: c.email!, name: c.name || 'Valued Customer' }));
    }

    if (audienceType === 'all-vendors') {
      audiencePayload.recipientsList = allVendors
        .filter(v => v.email && v.email.trim() !== '' && (v.emailPreferences?.campaigns ?? true))
        .map(v => ({ email: v.email!, name: v.shopName || v.name || 'Valued Partner' }));
    }

    if (audienceType === 'all') {
      const custs = customers
        .filter(c => c.email && c.email.trim() !== '' && (c.emailPreferences?.campaigns ?? true))
        .map(c => ({ email: c.email!, name: c.name || 'Valued Customer' }));
      const vends = allVendors
        .filter(v => v.email && v.email.trim() !== '' && (v.emailPreferences?.campaigns ?? true))
        .map(v => ({ email: v.email!, name: v.shopName || v.name || 'Valued Partner' }));
      audiencePayload.recipientsList = [...custs, ...vends];
    }

    setPreviewData({
      ...values,
      audience: audiencePayload
    });
  };

  const handleSendConfirm = () => {
    if (!previewData) return;

    const { subject, body, imageUrl, audience } = previewData;

    startSending(async () => {
      try {
        const result = await sendCampaignEmail({ subject, body, imageUrl, audience });
        if (result.success) {
          toast({ title: 'Campaign Broadcasted!', description: result.message });
          reset({ subject: '', body: '', imageUrl: '' });
          setAiPrompt('');
          setPreviewData(null);
        } else {
          toast({ title: 'Campaign Failed', description: result.message, variant: 'destructive' });
        }
      } catch (error: any) {
        toast({ title: 'Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
      }
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const { compressedDataUrl } = await compressImage(URL.createObjectURL(file));
        const finalImageUrl = await uploadImageToStorage(compressedDataUrl, `campaign-images/${Date.now()}`);
        setValue('imageUrl', finalImageUrl, { shouldValidate: true });
        toast({ title: 'Banner Uploaded', description: 'Banner image attached to draft.' });
      } catch (err) {
        toast({ title: 'Image upload error', variant: 'destructive' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleOfferSelect = (offer: Offer) => {
    const subject = offer.vendorName
      ? `${offer.vendorName}: ${offer.title}`
      : offer.title;

    let body = `Check out this great new offer from ${offer.vendorName || 'us'}:\n\n${offer.description}`;

    if (offer.startDate && offer.endDate) {
      const formattedStart = format(new Date(offer.startDate), 'MMM dd');
      const formattedEnd = format(new Date(offer.endDate), 'MMM dd, yyyy');
      body += `\n\nThis offer is valid from ${formattedStart} to ${formattedEnd}.`;
    }

    body += "\n\nDon't miss out!";

    setValue('subject', subject, { shouldValidate: true });
    setValue('body', body, { shouldValidate: true });
    setValue('imageUrl', offer.imageUrl, { shouldValidate: true });

    if (offer.vendorUsername) {
      setAudienceType('all-customers');
    }
    toast({ title: 'Offer Imported!', description: `Loaded "${offer.title}".` });
  };

  const isActionDisabled = isSending || isUploading || isGenerating;

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card to-primary/[0.05] p-5 sm:p-6 border border-border/80 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30 shadow-2xs">
                <Megaphone className="h-3 w-3" />
                BROADCAST STUDIO
              </span>
              <span className="text-muted-foreground text-xs font-semibold">
                {customers.length + allVendors.length} Total Potential Reach
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-headline text-foreground tracking-tight flex items-center gap-2.5">
              <span>Email Campaigns & Announcements</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-extrabold">
                SUPER ADMIN
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Author promotional campaigns, AI-assisted announcements, and targeted email broadcasts
            </p>
          </div>
        </div>
      </div>

      {/* 2. 4-KPI Audience Telemetry Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Audience</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{customers.length + allVendors.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Combined recipient pool</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Customers</span>
            <User className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{customers.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Registered customer emails</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Partner Stores</span>
            <Building className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{allVendors.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Merchant owner accounts</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Active Offers</span>
            <Tag className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{activeOffers.length}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Ready for 1-click import</p>
        </div>
      </div>

      {/* 3. 2-COLUMN SPLIT STUDIO (Left: Composer & AI Tools • Right: Live Email Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Controls & Composer (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Smart Creation Strip: AI Generator & Offer Importer */}
          <Card className="rounded-3xl border border-border/80 overflow-hidden shadow-2xs bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold font-headline flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-purple-600" />
                  <span>AI Copywriter & Offer Importer</span>
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsImportDialogOpen(true)}
                  disabled={isActionDisabled}
                  className="rounded-full text-xs font-bold gap-1.5 h-7 px-3 border-border/70 hover:bg-primary/10 hover:text-primary shadow-2xs"
                >
                  <FileDown className="h-3.5 w-3.5 text-primary" />
                  <span>Import Offer ({activeOffers.length})</span>
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-3">
              <Textarea
                placeholder="e.g., Announce a 20% weekend discount on all Biryanis with free delivery above ₹299..."
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="min-h-[75px] text-xs rounded-2xl border-border/70 bg-background resize-none"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleGenerateCampaign}
                  disabled={isActionDisabled || !aiPrompt.trim()}
                  size="sm"
                  className="rounded-full text-xs font-bold gap-1.5 h-8 px-4 bg-purple-600 hover:bg-purple-700 text-white shadow-2xs"
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  <span>{isGenerating ? "Drafting with AI..." : "Generate Draft with AI"}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Email Composer Form */}
          <Card className="rounded-3xl border border-border/80 overflow-hidden shadow-2xs bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/20">
              <CardTitle className="text-sm font-bold font-headline flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <span>Campaign Content & Targeting</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Draft your message, attach an optional banner, and select target recipients.
              </CardDescription>
            </CardHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handlePreview)} className="space-y-4 p-4 sm:p-5">
                {/* Subject Line */}
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">Subject Line</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 🍕 Weekend Flash Sale: 20% Off All Orders!"
                          className="h-9 text-xs rounded-xl border-border/70 bg-background"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                {/* Email Body */}
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold">Email Message Body</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Write your email announcement or offer details here..."
                          className="min-h-[140px] text-xs rounded-2xl border-border/70 bg-background leading-relaxed"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-[11px]" />
                    </FormItem>
                  )}
                />

                {/* Banner Image Uploader */}
                <div className="space-y-2">
                  <FormLabel className="text-xs font-bold">Campaign Banner Image (Optional)</FormLabel>
                  <div className="p-3 border border-border/70 rounded-2xl bg-muted/20 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {currentImageUrl ? (
                        <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-muted border border-border/60 shrink-0">
                          <Image src={currentImageUrl} alt="Banner" fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-muted/60 border border-dashed border-border/80 flex items-center justify-center text-muted-foreground shrink-0">
                          <Upload className="h-5 w-5 opacity-40" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {currentImageUrl ? "Custom Banner Attached" : "No Banner Image"}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Recommended 16:9 high resolution graphic
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/*"
                      />
                      <Button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        variant="outline"
                        size="sm"
                        disabled={isActionDisabled}
                        className="rounded-full text-xs font-bold h-8 px-3 border-border/70 shadow-2xs"
                      >
                        {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                        {currentImageUrl ? "Change" : "Upload"}
                      </Button>
                      {currentImageUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setValue('imageUrl', '')}
                          className="h-8 w-8 rounded-full text-rose-600 hover:bg-rose-500/10"
                          title="Remove Banner"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audience Selection Pills */}
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <FormLabel className="text-xs font-bold">Target Audience</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAudienceType('all-customers')}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all cursor-pointer",
                        audienceType === 'all-customers'
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-blue-500" /> All Customers
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {customers.length} recipients
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAudienceType('all-vendors')}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all cursor-pointer",
                        audienceType === 'all-vendors'
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Building className="h-3.5 w-3.5 text-emerald-600" /> All Vendors
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {allVendors.length} stores
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAudienceType('all')}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all cursor-pointer",
                        audienceType === 'all'
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-primary" /> All Users
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        {customers.length + allVendors.length} total
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAudienceType('specific-customer')}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all cursor-pointer",
                        audienceType === 'specific-customer'
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-blue-500" /> Specific Customer
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        1-on-1 direct message
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAudienceType('specific-vendor')}
                      className={cn(
                        "p-2.5 rounded-2xl border text-left transition-all cursor-pointer",
                        audienceType === 'specific-vendor'
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border/60 bg-card hover:bg-muted/40"
                      )}
                    >
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Store className="h-3.5 w-3.5 text-emerald-600" /> Specific Store
                      </span>
                      <span className="text-[10px] text-muted-foreground block mt-0.5">
                        Single merchant broadcast
                      </span>
                    </button>
                  </div>

                  {/* Dropdowns for specific targets */}
                  {audienceType === 'specific-vendor' && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/30 space-y-2 animate-in fade-in-50 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Store className="h-4 w-4 text-emerald-600" />
                          <span>Direct Store Merchant Targeting</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {allVendors.length} partner stores
                        </span>
                      </div>
                      <Combobox
                        options={vendorOptions}
                        value={specificVendorId}
                        onChange={setSpecificVendorId}
                        placeholder="Search & select a partner store by name or @username..."
                        searchPlaceholder="Type store name (e.g. Pizza, Burger) or username..."
                        noResultsText="No matching store found."
                      />
                    </div>
                  )}

                  {audienceType === 'specific-customer' && (
                    <div className="p-3.5 rounded-2xl bg-blue-500/[0.06] border border-blue-500/30 space-y-2 animate-in fade-in-50 duration-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <User className="h-4 w-4 text-blue-600" />
                          <span>Direct 1-on-1 Customer Targeting</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground font-semibold">
                          {customers.length} registered customers
                        </span>
                      </div>
                      <Combobox
                        options={customerOptions}
                        value={specificCustomerId}
                        onChange={setSpecificCustomerId}
                        placeholder="Search by customer name, email, phone or @username..."
                        searchPlaceholder="Type name (e.g. Ravi), email, phone or username..."
                        noResultsText="No matching customer found."
                      />
                    </div>
                  )}
                </div>

                {/* Bottom Submit Action */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Target: <strong className="text-foreground">{getAudienceDescription()}</strong>
                  </span>

                  <Button
                    type="submit"
                    disabled={isActionDisabled}
                    className="rounded-full text-xs font-bold gap-2 px-5 h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Preview & Send Broadcast</span>
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>

        {/* RIGHT COLUMN: Live Real-Time Email Preview Mockup (5 Cols) */}
        <div className="lg:col-span-5 sticky top-6">
          <Card className="rounded-3xl border border-border/80 overflow-hidden shadow-md bg-card">
            <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Real-Time Email Preview</span>
                </CardTitle>
                <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/25 px-2 py-0.5 rounded-full">
                  LIVE MOCKUP
                </span>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5 space-y-4">
              {/* Email Client Simulated Header */}
              <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60 space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground font-semibold">To:</span>
                  <span className="font-extrabold text-foreground bg-background px-2 py-0.5 rounded-md border border-border/50">
                    {getAudienceDescription()}
                  </span>
                </div>
                <div className="flex items-start justify-between text-[11px] gap-2">
                  <span className="text-muted-foreground font-semibold shrink-0">Subject:</span>
                  <span className="font-black text-foreground text-right leading-tight">
                    {currentSubject || <span className="text-muted-foreground italic font-normal">Enter subject line...</span>}
                  </span>
                </div>
              </div>

              {/* Email Content Canvas */}
              <div className="p-4 rounded-2xl border border-border/70 bg-background space-y-3.5 shadow-2xs min-h-[260px]">
                {/* Banner Image */}
                {currentImageUrl ? (
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted border border-border/50 shadow-2xs">
                    <Image src={currentImageUrl} alt="Banner Preview" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="w-full h-20 rounded-xl bg-muted/20 border border-dashed border-border/60 flex items-center justify-center text-muted-foreground text-[10px] font-semibold">
                    <span>Optional Banner Graphic Will Appear Here</span>
                  </div>
                )}

                {/* Email Body text */}
                <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                  {currentBody || (
                    <span className="text-muted-foreground italic">
                      Your campaign message body will render here in real time as you compose or generate with AI...
                    </span>
                  )}
                </div>

                {/* Footer simulation */}
                <div className="pt-3 border-t border-border/40 text-center space-y-1 text-[10px] text-muted-foreground">
                  <p className="font-bold text-foreground">Hyperdelivery Platform Notifications</p>
                  <p>You received this email as a registered partner or customer.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation & Dispatch Dialog */}
      <Dialog open={!!previewData} onOpenChange={(open) => !open && setPreviewData(null)}>
        <DialogContent className="max-w-2xl rounded-3xl p-6 bg-card border border-border/80">
          <DialogHeader className="pb-3 border-b border-border/60">
            <DialogTitle className="text-lg font-bold font-headline flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              <span>Confirm Campaign Broadcast</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              You are about to send this campaign email to:{' '}
              <strong className="text-primary font-black">{previewData?.audience.description}</strong>.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[55vh] pr-2 my-2">
            <div className="space-y-3.5 rounded-2xl border border-border/70 p-4 bg-muted/20 text-xs">
              <div className="pb-2 border-b border-border/60">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block">
                  Subject Line
                </span>
                <p className="font-black text-sm text-foreground mt-0.5">{previewData?.subject}</p>
              </div>

              {previewData?.imageUrl && (
                <div className="relative w-full aspect-video overflow-hidden rounded-xl bg-muted border border-border/60 shadow-2xs">
                  <Image src={previewData.imageUrl} alt="Campaign banner" fill className="object-cover" />
                </div>
              )}

              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground block mb-1">
                  Message Content
                </span>
                <div
                  className="prose prose-xs dark:prose-invert max-w-none leading-relaxed text-foreground whitespace-pre-wrap bg-background p-3 rounded-xl border border-border/50"
                  dangerouslySetInnerHTML={{ __html: previewData?.body.replace(/\n/g, '<br/>') || '' }}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 pt-2 border-t border-border/60">
            <DialogClose asChild>
              <Button variant="outline" size="sm" className="rounded-full text-xs font-bold">
                Back to Editor
              </Button>
            </DialogClose>
            <Button
              onClick={handleSendConfirm}
              disabled={isSending}
              size="sm"
              className="rounded-full text-xs font-bold px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
            >
              {isSending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  <span>Broadcasting Campaign...</span>
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  <span>Confirm & Send Broadcast</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Offer Dialog */}
      <ImportOfferDialog
        offers={activeOffers}
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSelect={handleOfferSelect}
      />
    </div>
  );
}

'use client';

import { useState, useRef, useTransition, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOffer } from '@/context/offer-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Upload, Send, Wand2, Users, Building, Globe, Sparkles, FileDown, User } from 'lucide-react';
import Image from 'next/image';
import { sendCampaignEmail } from '@/ai/flows/send-campaign-email';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';
import type { Vendor, Offer, Customer } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { useVendor } from '@/context/vendor-context';
import { useCustomer } from '@/context/customer-context';
import { generateCampaignEmail } from '@/ai/flows/generate-campaign-email';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';

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
    }
}

const ImportOfferDialog = ({ offers, open, onOpenChange, onSelect }: { offers: Offer[], open: boolean, onOpenChange: (open: boolean) => void, onSelect: (offer: Offer) => void }) => {
    const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
    const offerOptions = offers.map(o => ({ value: o.id, label: `${o.title} (${o.vendorName || 'All Vendors'})`}));

    const handleConfirm = () => {
        const selectedOffer = offers.find(o => o.id === selectedOfferId);
        if (selectedOffer) {
            onSelect(selectedOffer);
        }
        onOpenChange(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Import from Active Offer</DialogTitle>
                    <DialogDescription>Select an active offer to automatically create a campaign draft.</DialogDescription>
                </DialogHeader>
                <Combobox
                    options={offerOptions}
                    value={selectedOfferId}
                    onChange={setSelectedOfferId}
                    placeholder="Select an offer..."
                    searchPlaceholder="Search active offers..."
                    noResultsText="No active offers found."
                />
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleConfirm} disabled={!selectedOfferId}>Import</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
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
    }
    loadCustomers();
  }, [fetchAllOffers, fetchAllCustomers]);

  const activeOffers = useMemo(() => offers.filter(o => o.isActive), [offers]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { subject: '', body: '', imageUrl: '' },
  });

  const { watch, setValue, reset, getValues } = form;
  const imageUrl = watch('imageUrl');

  const vendorOptions = useMemo(() => {
    return allVendors.map(v => ({
      value: v.username,
      label: v.shopName || v.name,
    }));
  }, [allVendors]);
  
  const customerOptions = useMemo(() => {
    return customers
        .filter(c => c.name && c.email)
        .map(c => ({
            value: c.username,
            label: `${c.name} (${c.email})`
        }));
  }, [customers]);

  const handleGenerateCampaign = () => {
    if (!aiPrompt) {
        toast({ title: 'Please enter a prompt for the AI.', variant: 'destructive'});
        return;
    }
    startGenerating(async () => {
        try {
            const result = await generateCampaignEmail({ prompt: aiPrompt });
            if (result.subject && result.body) {
              setValue('subject', result.subject, { shouldValidate: true });
              setValue('body', result.body, { shouldValidate: true });
            }
        } catch (e: any) {
            toast({ title: 'Generation Failed', description: e.message, variant: 'destructive' });
        }
    });
  }

  const getAudienceDescription = (): string => {
    switch (audienceType) {
        case 'all': return 'All Vendors & Customers';
        case 'all-vendors': return 'All Vendors';
        case 'all-customers': return 'All Customers';
        case 'specific-vendor': {
            const vendor = allVendors.find(v => v.username === specificVendorId);
            return `Specific Vendor: ${vendor?.shopName || 'Unknown'}`;
        }
        case 'specific-customer': {
            const customer = customers.find(c => c.username === specificCustomerId);
            return `Specific Customer: ${customer?.name || 'Unknown'}`;
        }
        default: return 'Unknown Audience';
    }
  }


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
    }
    if (audienceType === 'specific-customer' && specificCustomerId) {
        audiencePayload.customerId = specificCustomerId;
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
          toast({ title: 'Campaign Sent!', description: result.message });
          reset({ subject: '', body: '', imageUrl: ''});
          setAiPrompt('');
          setPreviewData(null); // Close dialog
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
      } catch (err) {
        toast({ title: 'Image upload error', variant: 'destructive'});
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
  };


  const isActionDisabled = isSending || isUploading || isGenerating;

  return (
    <>
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Email Campaigns</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 space-y-8">
            <Card className="rounded-3xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-destructive"/>AI Assistant</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        placeholder="e.g., Write a short email announcing a 20% discount on all biryani for the weekend."
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        className="min-h-[100px]"
                    />
                </CardContent>
                <CardFooter className="flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="w-full sm:w-auto">
                        <Button onClick={handleGenerateCampaign} disabled={isActionDisabled} className="w-full">
                            {isGenerating ? <Loader2 className="animate-spin" /> : 'Generate Email'}
                        </Button>
                    </div>
                    <div className="w-full sm:w-auto">
                        <Button onClick={() => setIsImportDialogOpen(true)} variant="outline" className="w-full">
                            <FileDown className="mr-2 h-4 w-4"/> Import Offer
                        </Button>
                    </div>
                </CardFooter>
            </Card>
            <Card className="rounded-3xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-destructive"/>Email Composer</CardTitle>
                <CardDescription>Craft and send an email to your selected audience.</CardDescription>
              </CardHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handlePreview)}>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl><Input placeholder="e.g., Happy Diwali!" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="body"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body</FormLabel>
                          <FormControl><Textarea placeholder="Hi vendors, we wish you..." className="min-h-[150px]" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormItem>
                      <FormLabel>Banner Image (Optional)</FormLabel>
                      <div className="p-4 border rounded-2xl space-y-4">
                        {imageUrl && (
                            <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                              <Image src={imageUrl} alt="Email banner preview" width={500} height={281} className="object-cover w-full"/>
                            </div>
                        )}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="w-full">
                                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                                <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full" disabled={isActionDisabled}>
                                    {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="mr-2 h-4 w-4"/>} Upload Image
                                </Button>
                            </div>
                          </div>
                      </div>
                    </FormItem>
                  </CardContent>
                  <CardFooter className="flex-col sm:flex-row gap-4">
                    <div className="flex-1 w-full">
                        <div className="space-y-2">
                            <FormLabel>Audience</FormLabel>
                            <RadioGroup value={audienceType} onValueChange={(v) => setAudienceType(v as AudienceType)} className="flex flex-wrap gap-4">
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all" id="r4"/>
                                    <Label htmlFor="r4" className="flex items-center gap-1"><Globe className="h-4 w-4"/> All</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all-vendors" id="r1"/>
                                    <Label htmlFor="r1" className="flex items-center gap-1"><Building className="h-4 w-4"/> All Vendors</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="all-customers" id="r2"/>
                                    <Label htmlFor="r2" className="flex items-center gap-1"><Users className="h-4 w-4"/> All Customers</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="specific-vendor" id="r3"/>
                                    <Label htmlFor="r3" className="flex items-center gap-1"><Building className="h-4 w-4" /> Specific Vendor</Label>
                                </div>
                                 <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="specific-customer" id="r5"/>
                                    <Label htmlFor="r5" className="flex items-center gap-1"><User className="h-4 w-4" /> Specific Customer</Label>
                                </div>
                            </RadioGroup>
                            {audienceType === 'specific-vendor' && (
                                <Combobox
                                    options={vendorOptions}
                                    value={specificVendorId}
                                    onChange={setSpecificVendorId}
                                    placeholder="Select a vendor"
                                    searchPlaceholder='Search vendors...'
                                    noResultsText='No vendors found.'
                                />
                            )}
                             {audienceType === 'specific-customer' && (
                                <Combobox
                                    options={customerOptions}
                                    value={specificCustomerId}
                                    onChange={setSpecificCustomerId}
                                    placeholder="Select a customer"
                                    searchPlaceholder='Search customers...'
                                    noResultsText='No customers found.'
                                />
                            )}
                        </div>
                    </div>

                    <Button type="submit" className="w-full sm:w-auto text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move" disabled={isActionDisabled}>
                      <Send className="mr-2 h-4 w-4" /> Preview & Send
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
        </div>
      </div>
    </div>
    
    <Dialog open={!!previewData} onOpenChange={(open) => !open && setPreviewData(null)}>
        <DialogContent className="max-w-2xl">
            <DialogHeader>
                <DialogTitle>Confirm Campaign</DialogTitle>
                <DialogDescription>
                    You are about to send this email to: <span className="font-semibold text-destructive">{previewData?.audience.description}</span>.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 rounded-lg border p-4">
                    <h3 className="font-semibold">Subject: {previewData?.subject}</h3>
                    <Separator />
                    {previewData?.imageUrl && (
                        <div className="w-full overflow-hidden rounded-lg">
                           <Image src={previewData.imageUrl} alt="Campaign banner" width={600} height={338} className="object-cover w-full"/>
                        </div>
                    )}
                    <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: previewData?.body.replace(/\n/g, '<br/>') || '' }} />
                </div>
            </ScrollArea>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSendConfirm} disabled={isSending}>
                    {isSending ? <Loader2 className="animate-spin" /> : 'Confirm & Send'}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
     <ImportOfferDialog
        offers={activeOffers}
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onSelect={handleOfferSelect}
      />
    </>
  );
}

'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useOffer } from '@/context/offer-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Loader2, Gift, Sparkles, PlusCircle, Upload, Trash2, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';
import { useVendor } from '@/context/vendor-context';
import type { Offer } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createSlug } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import ConfirmationDialog from '@/components/confirmation-dialog';
import OfferActivationDialog from './offer-activation-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }),
  aiHint: z.string().optional(),
  blurDataUrl: z.string().optional(),
});

const OfferCard = ({ offer, onToggleActive, onEdit, onDelete, disabled }: { offer: Offer, onToggleActive: (offer: Offer) => void, onEdit: (offer: Offer) => void, onDelete: (offerId: string) => void, disabled?: boolean }) => {
    
    return (
        <Card className="rounded-3xl flex flex-col">
            <CardHeader>
                <CardTitle>{offer.title}</CardTitle>
                <CardDescription>{offer.vendorName}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
                <Image src={offer.imageUrl} alt={offer.title} width={300} height={169} className="rounded-md object-cover w-full aspect-video"/>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                 <div className="flex items-center space-x-2">
                    <Switch
                        id={`switch-${offer.id}`}
                        checked={offer.isActive}
                        onCheckedChange={() => onToggleActive(offer)}
                        disabled={disabled}
                    />
                    <Label htmlFor={`switch-${offer.id}`}>{offer.isActive ? 'Active' : 'Inactive'}</Label>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(offer)} disabled={disabled}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(offer.id)} disabled={disabled}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                 </div>
            </CardFooter>
        </Card>
    )
}

export default function VendorOffersPage() {
  const { offers, saveOffer, addOffer, toggleOfferStatus, removeOffer, fetchAllOffers, updateOfferSchedule } = useOffer();
  const { vendor } = useVendor();
  const router = useRouter();
  const { toast } = useToast();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const [offerToActivate, setOfferToActivate] = useState<Offer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isMenuEditDisabled = !!vendor?.isMenuEditDisabled;

  useEffect(() => {
    if (vendor && !vendor.isOfferCreationEnabled) {
      router.replace('/admin/dashboard');
    }
  }, [vendor, router]);
  
  useEffect(() => {
    fetchAllOffers();
  }, [fetchAllOffers]);

  const vendorOffers = useMemo(() => {
      if (!vendor) return [];
      return offers.filter(o => o.vendorUsername === vendor.username);
  }, [offers, vendor]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: 'https://placehold.co/600x400.png',
      aiHint: '',
      blurDataUrl: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { watch, setValue } = form;
  const watchedTitle = watch('title');

  useEffect(() => {
    if (isSheetOpen) {
      if (editingOffer) {
        form.reset({
          title: editingOffer.title,
          description: editingOffer.description,
          imageUrl: editingOffer.imageUrl,
          blurDataUrl: editingOffer.blurDataUrl || '',
          aiHint: editingOffer.aiHint || `Title: ${editingOffer.title}\nVendor: ${editingOffer.vendorName}`,
        });
      } else {
        form.reset({
          title: '',
          description: '',
          imageUrl: 'https://placehold.co/600x400.png',
          blurDataUrl: '',
          aiHint: '',
        });
      }
    }
  }, [isSheetOpen, editingOffer, form]);

  useEffect(() => {
      if (!editingOffer) {
          const simpleHint = `Title: ${watchedTitle}\nVendor: ${vendor?.shopName}`;
          if (watchedTitle) {
            setValue('aiHint', simpleHint);
          }
      }
  }, [watchedTitle, vendor, setValue, editingOffer]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isMenuEditDisabled) return;
    const file = event.target.files?.[0];
    if (file && vendor) {
      setIsSubmitting(true);
      try {
        const { compressedDataUrl, blurDataUrl } = await compressImage(URL.createObjectURL(file));
        const imageUrl = await uploadImageToStorage(compressedDataUrl, `offer-images/${vendor.username}/${createSlug(file.name)}-${Date.now()}`);
        setValue('imageUrl', imageUrl, { shouldValidate: true });
        setValue('blurDataUrl', blurDataUrl, { shouldValidate: true });
        toast({ title: 'Image Uploaded', description: 'The image has been uploaded and is ready.' });
      } catch (err) {
        console.error(err);
        toast({ title: 'Image upload error', description: 'Could not process the uploaded image.', variant: 'destructive'});
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (isMenuEditDisabled) return;
    setIsSubmitting(true);
    if (!vendor) {
        setIsSubmitting(false);
        return;
    };
    
    try {
      const dataToSave = {
          ...values,
          vendorUsername: vendor.username,
          vendorName: vendor.shopName || vendor.name
      }

      if(editingOffer) {
        await saveOffer({ ...editingOffer, ...dataToSave });
        toast({ title: 'Offer Saved!', description: 'The promotional offer has been updated.' });
      } else {
        await addOffer(dataToSave as Omit<Offer, 'id' | 'isActive'>);
        toast({ title: 'Offer Added!', description: 'The new promotional offer has been created.' });
      }
      setIsSheetOpen(false);

    } catch (e: any) {
      toast({ title: 'Error Saving Offer', description: e.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (offerToToggle: Offer) => {
    if (isMenuEditDisabled) return;
    if (offerToToggle.isActive) {
        // If it's already active, just deactivate it
        await toggleOfferStatus(offerToToggle.id, true);
    } else {
        // If it's inactive, always open the dialog to set a new duration.
        setOfferToActivate(offerToToggle);
    }
  }

  const handleActivationConfirm = async (offerId: string, startDate: Date, endDate: Date) => {
    if (isMenuEditDisabled) return;
    await updateOfferSchedule(offerId, startDate, endDate);
  };
  
  const handleAddNew = () => {
    setEditingOffer(null);
    setIsSheetOpen(true);
  }
  
  const handleEdit = (offer: Offer) => {
    setEditingOffer(offer);
    setIsSheetOpen(true);
  }
  
  const handleDeleteConfirm = async () => {
    if (offerToDelete) {
        await removeOffer(offerToDelete);
        setOfferToDelete(null);
    }
  };

  const imageUrl = form.watch('imageUrl');
  const blurDataUrl = form.watch('blurDataUrl');

  if (!vendor?.isOfferCreationEnabled) {
      return null;
  }

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Manage Offers</h2>
            {!isMenuEditDisabled && <p className="text-muted-foreground">Create and manage your promotional offers.</p>}
        </div>
        {!isMenuEditDisabled && (
            <Button onClick={handleAddNew} size="sm" className="rounded-full">
                <PlusCircle className="mr-2 h-4 w-4"/>
                Add Offer
            </Button>
        )}
      </div>

      {isMenuEditDisabled && (
            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">View Only Mode</AlertTitle>
                <AlertDescription className="text-blue-600">
                    Offers management is currently restricted for this demo account to maintain platform integrity.
                </AlertDescription>
            </Alert>
       )}

        {vendorOffers.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {vendorOffers.map(offer => (
                    <OfferCard key={offer.id} offer={offer} onToggleActive={handleToggleActive} onEdit={handleEdit} onDelete={setOfferToDelete} disabled={isMenuEditDisabled} />
                ))}
            </div>
        ) : (
             <Card className="rounded-3xl border-dashed">
                <CardContent className="p-12 text-center">
                    <Gift className="mx-auto h-12 w-12 text-muted-foreground"/>
                    <h3 className="mt-4 text-lg font-medium">No offers created yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Click "Add New Offer" to get started.</p>
                </CardContent>
            </Card>
        )}


       <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
            <SheetHeader className="p-6">
                <SheetTitle>{editingOffer ? 'Edit' : 'Create'} Promotional Offer</SheetTitle>
                <SheetDescription>
                    Fill in the details for your promotional offer.
                </SheetDescription>
            </SheetHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                    <ScrollArea className="flex-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6">
                            <div className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Weekend Special!" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                            placeholder="Describe the offer..."
                                            className="min-h-[60px]"
                                            {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                            </div>
                            <div className="space-y-6">
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/webp"
                                    />
                                    <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full" disabled={isSubmitting}>
                                        <Upload className="mr-2 h-4 w-4"/> Upload Banner Image
                                    </Button>
                                </div>
                            
                                <div className="space-y-2">
                                    <Label>Image Preview</Label>
                                    <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                                        {imageUrl ? (
                                            <Image 
                                                src={imageUrl} 
                                                alt="Offer image preview" 
                                                width={600} height={400} 
                                                data-ai-hint="promotion offer" 
                                                className="object-cover h-full w-full"
                                                placeholder={blurDataUrl ? 'blur' : 'empty'}
                                                blurDataURL={blurDataUrl}
                                            />
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Image will appear here</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <SheetFooter className="p-6 bg-card border-t border-destructive/10 sticky bottom-0">
                        <SheetClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </SheetClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="animate-spin" /> : 'Save Offer'}
                        </Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>
      <OfferActivationDialog
        isOpen={!!offerToActivate}
        onOpenChange={() => setOfferToActivate(null)}
        offer={offerToActivate}
        onConfirm={handleActivationConfirm}
      />
      <ConfirmationDialog
        isOpen={!!offerToDelete}
        onOpenChange={() => setOfferToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Offer?"
        description="This will permanently delete the offer and its image. This action cannot be undone."
      />
    </div>
  );
}


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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Upload, Send, Wand2, Users, Building, Globe, Sparkles, FileDown, User, Gift, PlusCircle, Trash2 } from 'lucide-react';
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
import { generateImage } from '@/ai/flows/generate-image';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { createSlug } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import ConfirmationDialog from '@/components/confirmation-dialog';


const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string().url({ message: 'Please enter a valid image URL.' }),
  vendorUsername: z.string().optional(),
  aiHint: z.string().optional(),
  blurDataUrl: z.string().optional(),
});

const OfferCard = ({ offer, onToggleActive, onEdit, onDelete }: { offer: Offer, onToggleActive: (offer: Offer) => void, onEdit: (offer: Offer) => void, onDelete: (offerId: string) => void }) => {
    return (
        <Card className="rounded-3xl">
            <CardHeader>
                <CardTitle>{offer.title}</CardTitle>
                <CardDescription>Vendor: {offer.vendorName || 'All Vendors'}</CardDescription>
            </CardHeader>
            <CardContent>
                <Image src={offer.imageUrl} alt={offer.title} width={300} height={169} className="rounded-md object-cover w-full aspect-video"/>
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                 <div className="flex items-center space-x-2">
                    <Switch
                        id={`switch-${offer.id}`}
                        checked={offer.isActive}
                        onCheckedChange={() => onToggleActive(offer)}
                    />
                    <Label htmlFor={`switch-${offer.id}`}>{offer.isActive ? 'Active' : 'Inactive'}</Label>
                </div>
                 <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(offer)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => onDelete(offer.id)}>
                        <Trash2 className="h-4 w-4"/>
                    </Button>
                 </div>
            </CardFooter>
        </Card>
    )
}


export default function SuperAdminOffersPage() {
  const { offers, saveOffer, addOffer, toggleOfferStatus, fetchAllOffers, removeOffer } = useOffer();
  const { allVendors } = useVendor();
  const { toast } = useToast();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerToDelete, setOfferToDelete] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchAllOffers();
  }, [fetchAllOffers]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      imageUrl: 'https://placehold.co/600x400.png',
      vendorUsername: '',
      aiHint: '',
      blurDataUrl: '',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, startImageGeneration] = useTransition();

  const { watch, setValue } = form;
  const watchedTitle = watch('title');
  const watchedVendorUsername = watch('vendorUsername');

  const vendorOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Vendors' },
      ...allVendors.map(v => ({ value: v.username, label: v.shopName || v.name }))
    ]
  }, [allVendors]);

  useEffect(() => {
    if (isSheetOpen) {
      if (editingOffer) {
        form.reset({
          title: editingOffer.title,
          description: editingOffer.description,
          imageUrl: editingOffer.imageUrl,
          blurDataUrl: editingOffer.blurDataUrl || '',
          vendorUsername: editingOffer.vendorUsername || 'all',
          aiHint: editingOffer.aiHint || `Title: ${editingOffer.title}\nVendor: ${editingOffer.vendorName || 'All Vendors'}`,
        });
      } else {
        form.reset({
          title: '',
          description: '',
          imageUrl: 'https://placehold.co/600x400.png',
          blurDataUrl: '',
          vendorUsername: 'all',
          aiHint: '',
        });
      }
    }
  }, [isSheetOpen, editingOffer, form]);

  useEffect(() => {
      if (!editingOffer) {
          const selectedVendor = allVendors.find(v => v.username === watchedVendorUsername);
          const vendorName = selectedVendor?.shopName || 'our restaurants';
          const simpleHint = `Title: ${watchedTitle}\nVendor: ${vendorName}`;
          if (watchedTitle) {
            setValue('aiHint', simpleHint);
          }
      }
  }, [watchedTitle, watchedVendorUsername, allVendors, setValue, editingOffer]);

   const handleGenerateImage = () => {
    const promptToUse = form.getValues('aiHint');
    if (!promptToUse) {
      toast({ title: 'Please provide details for the AI.', variant: 'destructive'});
      return;
    }

    startImageGeneration(async () => {
        try {
            const { imageUrl: imageDataUrl } = await generateImage({ prompt: promptToUse, promptType: 'offer' });
            if (imageDataUrl) {
                const { compressedDataUrl, blurDataUrl } = await compressImage(imageDataUrl);
                const finalImageUrl = await uploadImageToStorage(compressedDataUrl, `offer-images/${createSlug(promptToUse)}-${Date.now()}`);
                
                setValue('imageUrl', finalImageUrl, { shouldValidate: true });
                setValue('blurDataUrl', blurDataUrl, { shouldValidate: true });
            } else {
                toast({ title: 'Failed to generate image', description: 'The AI could not generate an image. Please try a different hint.', variant: 'destructive'});
            }
        } catch(e) {
            console.error(e);
            toast({ title: 'Image generation error', description: 'An unexpected error occurred.', variant: 'destructive'});
        }
    });
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsSubmitting(true);
      try {
        const { compressedDataUrl, blurDataUrl } = await compressImage(URL.createObjectURL(file));
        const imageUrl = await uploadImageToStorage(compressedDataUrl, `offer-images/${createSlug(file.name)}-${Date.now()}`);
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
    setIsSubmitting(true);
    try {
      const selectedVendor = allVendors.find(v => v.username === values.vendorUsername);
      
      const dataToSave = {
          ...values,
          vendorUsername: values.vendorUsername === 'all' ? '' : values.vendorUsername,
          vendorName: values.vendorUsername === 'all' ? '' : (selectedVendor?.shopName || selectedVendor?.name)
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
    await toggleOfferStatus(offerToToggle.id, offerToToggle.isActive);
  }
  
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

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Manage Offers</h2>
            <p className="text-muted-foreground">Create and manage promotional offers for all vendors.</p>
        </div>
        <Button
          onClick={handleAddNew}
          className="text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
        >
            <PlusCircle className="mr-2 h-4 w-4"/>
            Add New Offer
        </Button>
      </div>

        {offers.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {offers.map(offer => (
                    <OfferCard key={offer.id} offer={offer} onToggleActive={handleToggleActive} onEdit={handleEdit} onDelete={setOfferToDelete}/>
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
                    Fill in the details for the promotional offer.
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
                                    name="vendorUsername"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormLabel>Vendor</FormLabel>
                                        <Controller
                                            name="vendorUsername"
                                            control={form.control}
                                            render={({ field }) => (
                                                <Combobox
                                                    options={vendorOptions}
                                                    value={field.value || 'all'}
                                                    onChange={field.onChange}
                                                    placeholder="Select a vendor"
                                                    searchPlaceholder='Search vendors...'
                                                    noResultsText='No vendors found.'
                                                />
                                            )}
                                        />
                                        <FormDescription>
                                            Select "All Vendors" for a site-wide offer.
                                        </FormDescription>
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
                                <FormField
                                    control={form.control}
                                    name="aiHint"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>AI Image Prompt</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="e.g., A futuristic burger with glowing cheese..."
                                                    className="min-h-[80px]"
                                                    {...field}
                                                />
                                            </FormControl>
                                             <FormDescription>
                                                The AI will use this to generate an image. Edit it for custom results.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                    />
                                <div className="flex gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/webp"
                                    />
                                    <Button type="button" onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1" disabled={isSubmitting || isGenerating}>
                                        <Upload className="mr-2 h-4 w-4"/> Upload
                                    </Button>
                                    <Button type="button" onClick={handleGenerateImage} disabled={isGenerating || isSubmitting} className="flex-1">
                                        {isGenerating ? <Loader2 className="animate-spin" /> : <><Sparkles className="mr-2 h-4 w-4"/>Generate</>}
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
                        <Button
                          type="submit"
                          className="w-auto text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                          disabled={isSubmitting || isGenerating}
                        >
                            {isSubmitting || isGenerating ? <Loader2 className="animate-spin" /> : 'Save Offer'}
                        </Button>
                    </SheetFooter>
                </form>
            </Form>
        </SheetContent>
      </Sheet>
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

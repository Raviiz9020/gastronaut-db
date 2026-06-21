
'use client';

import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { useDelivery } from '@/context/delivery-context';
import type { DeliveryBoy } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { useVendor } from '@/context/vendor-context';
import { uploadImageToStorage, compressImage } from '@/lib/client-utils';
import { Loader2, Upload } from 'lucide-react';
import Image from 'next/image';

interface DeliveryBoyFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  deliveryBoy: DeliveryBoy | null;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional().or(z.literal('')),
  contact: z.string().min(10, { message: 'Contact must be at least 10 characters.' }),
  image: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  isApproved: z.boolean().default(true),
});

export default function DeliveryBoyForm({ isOpen, onOpenChange, deliveryBoy }: DeliveryBoyFormProps) {
  const { addDeliveryBoy, updateDeliveryBoy } = useDelivery();
  const { vendor } = useVendor();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      username: '',
      password: '',
      contact: '',
      image: '',
      isApproved: true,
    },
  });

  const currentImage = form.watch('image');

  useEffect(() => {
    if (isOpen) {
      if (deliveryBoy) {
        form.reset({
            ...deliveryBoy,
            image: deliveryBoy.image || '',
            password: '', // Don't pre-fill password for security
        });
      } else {
        form.reset({
          name: '',
          username: '',
          password: '',
          contact: '',
          image: `https://placehold.co/100x100.png`,
          isApproved: true,
        });
      }
    }
  }, [form, isOpen, deliveryBoy]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && vendor) {
        setIsUploading(true);
        try {
            const { compressedDataUrl } = await compressImage(URL.createObjectURL(file));
            const imageUrl = await uploadImageToStorage(compressedDataUrl, `rider-images/${vendor.username}/${Date.now()}`);
            form.setValue('image', imageUrl, { shouldValidate: true });
        } catch (e) {
            toast({ title: 'Upload Failed', description: 'Could not upload image.', variant: 'destructive'});
        } finally {
            setIsUploading(false);
        }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
        if (deliveryBoy) {
            await updateDeliveryBoy(deliveryBoy.id, values);
        } else {
            if (!values.password) {
                form.setError('password', { message: 'Password is required for a new rider.' });
                return;
            }
            await addDeliveryBoy(values as any);
        }
        onOpenChange(false);
    } catch(e: any) {
        toast({
            title: 'Error',
            description: e.message,
            variant: 'destructive',
        })
    }
  };

  const isEditMode = !!deliveryBoy;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle>{isEditMode ? 'Edit' : 'Add'} Delivery Person</SheetTitle>
          <SheetDescription>
            {isEditMode ? 'Update the details of your delivery team member.' : 'Add a new member to your delivery team.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ryder" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98765 43210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="rider_username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder={isEditMode ? "Leave blank to keep unchanged" : "••••••••"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem className="col-span-full">
                    <FormLabel>Rider Image</FormLabel>
                     <FormControl>
                        <div className="flex items-center gap-4">
                            <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                {currentImage ? (
                                    <Image src={currentImage} alt="Rider image" width={100} height={100} className="object-cover h-full w-full"/>
                                ) : (
                                    <span className="text-sm text-muted-foreground">No Image</span>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                            />
                            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Upload className="mr-2 h-4 w-4"/>}
                                {isUploading ? 'Uploading...' : 'Upload Image'}
                            </Button>
                        </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isApproved"
                render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm col-span-full">
                        <div className="space-y-0.5">
                            <FormLabel>Approved</FormLabel>
                            <FormMessage />
                        </div>
                        <FormControl>
                            <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            />
                        </FormControl>
                    </FormItem>
                )}
                />
            </div>
             <SheetFooter className="p-6 bg-card border-t border-primary/10 sticky bottom-0">
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button type="submit" disabled={isUploading}>{isEditMode ? 'Save Changes' : 'Add'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

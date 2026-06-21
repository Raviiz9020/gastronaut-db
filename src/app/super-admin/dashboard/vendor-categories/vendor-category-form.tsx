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
  FormDescription,
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
import { useMenu } from '@/context/menu-context';
import type { VendorCategory } from '@/types';
import Image from 'next/image';
import { Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/client-utils';
import { uploadImageToStorage, createSlug } from '@/lib/utils';
import { useVendorCategory } from '@/context/vendor-category-context';

interface VendorCategoryFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: VendorCategory | null;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  imageUrl: z.string().url().optional(),
  blurDataUrl: z.string().optional(),
  aiHint: z.string().optional(),
});

export default function VendorCategoryForm({ isOpen, onOpenChange, category }: VendorCategoryFormProps) {
  const { addVendorCategory, updateVendorCategory } = useVendorCategory();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', imageUrl: '', blurDataUrl: '', aiHint: '' },
  });

  const { watch, setValue } = form;
  const currentImage = watch('imageUrl');
  const currentBlur = watch('blurDataUrl');
  const categoryName = watch('name');

  useEffect(() => {
    if (isOpen) {
      if (category) {
        form.reset({
          name: category.name,
          imageUrl: category.imageUrl || '',
          blurDataUrl: category.blurDataUrl || '',
          aiHint: category.aiHint || category.name,
        });
      } else {
        form.reset({ name: '', imageUrl: '', blurDataUrl: '', aiHint: '' });
      }
    }
  }, [category, form, isOpen]);

  useEffect(() => {
    if (categoryName && categoryName !== form.getValues('aiHint')) {
        setValue('aiHint', categoryName);
    }
  }, [categoryName, setValue, form]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      try {
        const { compressedDataUrl, blurDataUrl } = await compressImage(URL.createObjectURL(file));
        const imageUrl = await uploadImageToStorage(compressedDataUrl, `vendor-category-images/${createSlug(file.name)}-${Date.now()}`);
        setValue('imageUrl', imageUrl, { shouldValidate: true });
        setValue('blurDataUrl', blurDataUrl, { shouldValidate: true });
        toast({ title: 'Image Uploaded', description: 'The image has been prepared. Save to confirm.' });
      } catch (err) {
        console.error(err);
        toast({ title: 'Image upload error', description: 'Could not process the uploaded image.', variant: 'destructive'});
      } finally {
        setIsUploading(false);
      }
    }
  };


  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (category) {
      await updateVendorCategory({ ...(category as VendorCategory), ...values });
    } else {
      await addVendorCategory(values);
    }
    onOpenChange(false);
  };
  
  const isProcessingImage = isUploading;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle>{category ? 'Edit' : 'Add'} Vendor Category</SheetTitle>
          <SheetDescription>
            {category ? 'Update the category details.' : 'Add a new category to classify vendors.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Restaurant, Groceries" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                 <FormLabel>Category Image</FormLabel>
                 <div className="flex gap-4 items-end">
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {currentImage ? (
                            <Image src={currentImage} alt="Category image preview" width={100} height={100} className="object-cover h-full w-full" placeholder={currentBlur ? 'blur' : 'empty'} blurDataURL={currentBlur}/>
                        ) : (
                            <span className="text-xs text-muted-foreground text-center">No Image</span>
                        )}
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            className="hidden"
                            accept="image/png, image/jpeg, image/webp"
                        />
                        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full" disabled={isProcessingImage}>
                           {isUploading ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Upload className="mr-2 h-4 w-4"/>}
                           {isUploading ? 'Uploading...' : 'Upload Image'}
                        </Button>
                    </div>
                 </div>
              </div>
            </div>
             <SheetFooter className="p-6 bg-card border-t border-destructive/10 sticky bottom-0">
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button
                  type="submit"
                  className="text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                  disabled={isProcessingImage}
                >
                  {isProcessingImage ? "Processing..." : (category ? 'Save Changes' : 'Add Category')}
                </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

'use client';

import { useEffect, useState, useTransition, useRef, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import type { MenuItem } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Upload, Plus, Trash2, GripVertical, Settings2, HelpCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';
import { useVendor } from '@/context/vendor-context';
import { cn } from '@/lib/utils';

interface MenuItemFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  menuItem: Omit<MenuItem, 'vendorUsername' | 'shopName' | 'isAvailable'> | null;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  description: z.string().optional(),
  price: z.coerce.number().min(0, { message: 'Price must be 0 or greater.' }),
  discountPrice: z.coerce.number().optional(),
  category: z.string().min(1, { message: 'Please select a category.' }),
  image: z.string().nullable(),
  imageDataUrl: z.string().optional(),
  blurDataUrl: z.string().optional(),
  aiHint: z.string().optional(),
  stock: z.coerce.number().optional(),
  customizations: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Group name is required'),
    type: z.enum(['SINGLE', 'MULTI']),
    minSelect: z.number().min(0).max(1),
    options: z.array(z.object({
      id: z.string(),
      name: z.string().min(1, 'Option name is required'),
      price: z.coerce.number().min(0),
      originalPrice: z.coerce.number().optional(),
      isAvailable: z.boolean().default(true),
      stock: z.coerce.number().optional()
    })).min(1, 'At least one option is required')
  })).optional()
}).refine((data) => {
  // If no customizations are present, price must be > 0
  if (!data.customizations || data.customizations.length === 0) {
    return data.price > 0;
  }
  return true;
}, {
  message: 'Price must be greater than 0 for standard items.',
  path: ['price'],
});

const CustomizationGroupFields = ({ control, index, removeGroup, isMandatory, isInventoryEnabled }: { control: any, index: number, removeGroup: () => void, isMandatory: boolean, isInventoryEnabled: boolean }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `customizations.${index}.options`
  });

  return (
    <Card className={`rounded-3xl border-2 transition-colors ${isMandatory ? 'border-primary/50 bg-primary/5' : 'border-muted'}`}>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             <Settings2 className="h-4 w-4 text-muted-foreground" />
             <CardTitle className="text-sm font-bold">Group #{index + 1}</CardTitle>
             {isMandatory && <Badge variant="default" className="text-[10px] h-4">Mandatory</Badge>}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={removeGroup} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0">
             <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
          <div className="md:col-span-4">
             <FormField
               control={control}
               name={`customizations.${index}.name`}
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-xs font-semibold text-slate-600">Group Name</FormLabel>
                   <FormControl>
                     <Input placeholder="e.g., Portion Size" {...field} className="h-9 text-sm border-slate-200 bg-white" />
                   </FormControl>
                   <FormMessage className="text-[10px]" />
                 </FormItem>
               )}
             />
          </div>
          <div className="md:col-span-4">
             <FormField
               control={control}
               name={`customizations.${index}.type`}
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-xs font-semibold text-slate-600">Type</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                     <FormControl>
                       <SelectTrigger className="h-9 text-sm border-slate-200 bg-white">
                         <SelectValue placeholder="Select type" />
                       </SelectTrigger>
                     </FormControl>
                     <SelectContent>
                       <SelectItem value="SINGLE">Single Selection</SelectItem>
                       <SelectItem value="MULTI">Multiple Selection</SelectItem>
                     </SelectContent>
                   </Select>
                   <FormMessage className="text-[10px]" />
                 </FormItem>
               )}
             />
          </div>
          <div className="md:col-span-4">
             <FormField
               control={control}
               name={`customizations.${index}.minSelect`}
               render={({ field }) => (
                 <FormItem>
                   <FormLabel className="text-xs font-semibold text-slate-600">Mandatory</FormLabel>
                   <FormControl>
                     <div className="flex items-center h-9">
                       <Switch
                         checked={field.value === 1}
                         onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                       />
                     </div>
                   </FormControl>
                 </FormItem>
               )}
             />
          </div>
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
               Options
               <HelpCircle className="h-3 w-3" />
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ id: Math.random().toString(36).substr(2, 9), name: '', price: 0, originalPrice: undefined, isAvailable: true })} className="h-7 text-[10px] px-2">
              <Plus className="h-3 w-3 mr-1" /> Add Option
            </Button>
          </div>
          
          <div className="space-y-2 mt-1">
            {/* Optimized Column headers for option fields */}
            <div className="hidden md:grid grid-cols-12 gap-2 px-3 pb-1">
              <div className="col-span-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Option Name</span>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Price</span>
              </div>
              <div className="col-span-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sale</span>
              </div>
              {isInventoryEnabled && (
                <div className="col-span-2">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Stock</span>
                </div>
              )}
              <div className="col-span-2 text-right pr-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status</span>
              </div>
            </div>
            {fields.map((option, optIndex) => (
              <div key={option.id} className="grid grid-cols-1 md:grid-cols-12 gap-1.5 items-center bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm relative group transition-all hover:border-slate-200">
                 <div className="col-span-12 md:col-span-4">
                    <FormField
                      control={control}
                      name={`customizations.${index}.options.${optIndex}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Option Name" {...field} className="h-8 text-[11px] border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors shadow-none rounded-xl" />
                          </FormControl>
                          <FormMessage className="text-[9px]" />
                        </FormItem>
                      )}
                    />
                 </div>
                 <div className="col-span-4 md:col-span-2">
                    <FormField
                      control={control}
                      name={`customizations.${index}.options.${optIndex}.price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" step="1" {...field} className="h-8 text-[11px] px-2 border-primary/20 bg-primary/5 text-primary focus-visible:ring-primary/30 font-bold shadow-none placeholder:text-primary/40 rounded-xl" placeholder="₹ Price" />
                          </FormControl>
                          <FormMessage className="text-[9px]" />
                        </FormItem>
                      )}
                    />
                 </div>
                 <div className="col-span-4 md:col-span-2">
                    <FormField
                      control={control}
                      name={`customizations.${index}.options.${optIndex}.originalPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" step="1" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} className="h-8 text-[11px] px-2 border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors shadow-none placeholder:text-slate-400 rounded-xl" placeholder="₹ Sale" />
                          </FormControl>
                          <FormMessage className="text-[9px]" />
                        </FormItem>
                      )}
                    />
                 </div>
                 {isInventoryEnabled && (
                   <div className="col-span-4 md:col-span-2">
                      <FormField
                        control={control}
                        name={`customizations.${index}.options.${optIndex}.stock`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                value={field.value ?? ''} 
                                onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} 
                                className="h-8 text-[11px] px-2 border-blue-200 bg-blue-50 focus-visible:bg-white transition-colors shadow-none text-blue-700 font-bold rounded-xl" 
                                placeholder="Stock" 
                              />
                            </FormControl>
                            <FormMessage className="text-[9px]" />
                          </FormItem>
                        )}
                      />
                   </div>
                 )}
                 <div className="col-span-12 md:col-span-2 flex items-center justify-end gap-1 px-1">
                    <FormField
                      control={control}
                      name={`customizations.${index}.options.${optIndex}.isAvailable`}
                      render={({ field }) => (
                        <FormItem className="flex items-center space-y-0">
                          <FormControl>
                            <Switch
                              checked={field.value !== false}
                              onCheckedChange={field.onChange}
                              className="scale-75 data-[state=checked]:bg-green-500"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(optIndex)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 h-7 w-7 rounded-full transition-colors" disabled={fields.length <= 1}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function MenuItemForm({ isOpen, onOpenChange, menuItem }: MenuItemFormProps) {
  const { addMenuItem, updateMenuItem, categories } = useMenu();
  const { vendor } = useVendor();
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      discountPrice: undefined,
      category: '',
      image: '',
      imageDataUrl: '',
      blurDataUrl: '',
      aiHint: '',
      stock: undefined,
      customizations: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customizations"
  });

  const currentImage = form.watch('image');
  const currentDataUrl = form.watch('imageDataUrl');
  const currentBlurDataUrl = form.watch('blurDataUrl');
  const watchedName = form.watch('name');
  const watchedDescription = form.watch('description');
  const watchedCustomizations = form.watch('customizations');

  const isMandatoryCustomizationPresent = useMemo(() => {
    return watchedCustomizations?.some(c => c.minSelect === 1) ?? false;
  }, [watchedCustomizations]);

  useEffect(() => {
    if (watchedCustomizations && watchedCustomizations.length > 0) {
      form.setValue('price', 0);
      form.setValue('stock', undefined);
    }
  }, [watchedCustomizations, form]);

  const availableCategories = useMemo(() => {
    if (!vendor) return [];
    
    return categories.filter(cat => {
      // 1. Include the vendor's own custom categories
      if (cat.shopName === vendor.shopName) {
        return true;
      }
      
      // 2. Handle global categories
      if (cat.shopName === 'global') {
        // a. If the global category has no vendorCategory, it's for everyone
        if (!cat.vendorCategory) {
          return true;
        }
        // b. If it has a vendorCategory, it must match the vendor's category
        if (cat.vendorCategory === vendor.category) {
          return true;
        }
      }
      
      return false;
    });
  }, [categories, vendor]);

  useEffect(() => {
    if (isOpen) {
        if (menuItem) {
        // Reverse mapping for the form:
        // If there's an originalPrice, it means the item is on sale.
        // In our form, 'Price' is the regular one and 'Sale Price' is the discounted one.
        const mappedCustomizations = menuItem.customizations?.map(group => ({
            ...group,
            options: group.options.map(opt => {
                if (opt.originalPrice && opt.originalPrice > 0) {
                    // It was on sale: Original (100) -> Price box, Sale (80) -> Sale Price box
                    return { ...opt, price: opt.originalPrice, originalPrice: opt.price };
                }
                // No sale: Price (20) -> Price box, Sale Price box empty
                return { ...opt, price: opt.price, originalPrice: undefined };
            })
        })) || [];

        // Same for simple items
        let formPrice = menuItem.price;
        let formSalePrice = undefined;
        if (menuItem.isDiscountActive && menuItem.discountPrice && menuItem.discountPrice > 0) {
            formPrice = menuItem.discountPrice;
            formSalePrice = menuItem.price;
        }

        form.reset({
          ...menuItem,
          price: formPrice,
          discountPrice: formSalePrice,
          description: menuItem.description || '',
          imageDataUrl: menuItem.imageDataUrl || '',
          blurDataUrl: menuItem.blurDataUrl || '',
          stock: menuItem.stock ?? undefined,
          customizations: mappedCustomizations,
        });
        } else {
        form.reset({
            name: '',
            description: '',
            price: 0,
            discountPrice: undefined,
            category: '',
            image: 'https://placehold.co/400x225/222222/4AF0FF',
            imageDataUrl: '',
            blurDataUrl: '',
            aiHint: '',
            stock: undefined,
            customizations: [],
        });
        }
    }
  }, [menuItem, form, isOpen]);

  useEffect(() => {
    const newHint = watchedDescription || watchedName;
    if (newHint && newHint !== form.getValues('aiHint')) {
        form.setValue('aiHint', newHint, { shouldValidate: form.formState.isSubmitted });
    }
  }, [watchedName, watchedDescription, form]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && vendor) {
      setIsSaving(true);
      try {
        const { compressedDataUrl, blurDataUrl } = await compressImage(URL.createObjectURL(file));
        const imageUrl = await uploadImageToStorage(compressedDataUrl, `menu-images/${vendor.username}/${Date.now()}`);
        form.setValue('image', imageUrl, { shouldValidate: true });
        form.setValue('imageDataUrl', compressedDataUrl, { shouldValidate: true });
        form.setValue('blurDataUrl', blurDataUrl, { shouldValidate: true });
        toast({ title: 'Image Uploaded', description: 'The image has been uploaded and is ready.' });
      } catch (err) {
        console.error(err);
        toast({ title: 'Image upload error', description: 'Could not process the uploaded image.', variant: 'destructive'});
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    
    // Safety: Remove all 'undefined' values from the object before sending to Firestore
    const cleanValues = Object.fromEntries(
      Object.entries(values).filter(([_, v]) => v !== undefined)
    );
    
    const finalValues: any = { ...cleanValues };

    if (typeof finalValues.discountPrice !== 'number' || finalValues.discountPrice <= 0) {
        finalValues.discountPrice = null;
    }

    // If stock is undefined (which happens for non-Bakery or empty input), remove it.
    if (values.stock === undefined) {
        finalValues.stock = null;
    }

    // MAGIC MAPPING: Aligning form inputs with database structure
    // Form Input 1 (Price) is the regular price.
    // Form Input 2 (Sale Price) is the discounted price.
    
    let hasAnyVariationDiscount = false;
    if (finalValues.customizations) {
        finalValues.customizations = finalValues.customizations.map((group: any) => ({
            ...group,
            options: group.options.map((opt: any) => {
                const regularPrice = opt.price;
                const salePrice = opt.originalPrice; // This is bound to our second box

                const cleanedOpt = { ...opt };
                
                if (salePrice && salePrice > 0 && salePrice < regularPrice) {
                    // WE HAVE A DISCOUNT!
                    cleanedOpt.price = salePrice;
                    cleanedOpt.originalPrice = regularPrice;
                    hasAnyVariationDiscount = true;
                } else {
                    // NO DISCOUNT
                    cleanedOpt.price = regularPrice;
                    delete cleanedOpt.originalPrice;
                }

                // Final safety cleanup: Firestore doesn't like 'undefined'
                if (cleanedOpt.stock === undefined) {
                    delete cleanedOpt.stock;
                }

                return cleanedOpt;
            })
        }));
    }

    // Similar mapping for simple items
    if (finalValues.discountPrice && finalValues.discountPrice > 0 && finalValues.discountPrice < finalValues.price) {
        const regularPrice = finalValues.price;
        const salePrice = finalValues.discountPrice;
        finalValues.price = salePrice;
        finalValues.discountPrice = regularPrice;
    } else {
        finalValues.discountPrice = null;
    }

    // If customizations are present, but none have a valid discount, 
    // automatically deactivate the discount for this item.
    if (finalValues.customizations && finalValues.customizations.length > 0 && !hasAnyVariationDiscount) {
        finalValues.isDiscountActive = false;
    }

    try {
        if (menuItem) {
          await updateMenuItem({ ...(menuItem as MenuItem), ...finalValues });
        } else {
          await addMenuItem(finalValues);
        }
        onOpenChange(false);
    } catch(e: any) {
        toast({ title: 'Error saving item', description: e.message, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const imageToDisplay = currentDataUrl || currentImage;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 py-5 border-b border-slate-100 bg-white/80 sticky top-0 z-10 backdrop-blur-md">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {menuItem ? <Settings2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </div>
            {menuItem ? 'Edit Menu Item' : 'Add Menu Item'}
          </SheetTitle>
          <SheetDescription className="ml-12 mt-0">
            {menuItem ? 'Update the details of the menu item.' : 'Add a new item to your menu.'}
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
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Plasma-Charred Burger" {...field} />
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
                      <Textarea placeholder="A delicious description..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                  <FormItem>
                      <FormLabel>Price (₹)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-bold">₹</span>
                           <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.00" 
                            {...field} 
                            className={cn("pl-7", watchedCustomizations && watchedCustomizations.length > 0 && "bg-slate-50 text-slate-400")}
                            disabled={watchedCustomizations && watchedCustomizations.length > 0}
                          />
                        </div>
                      </FormControl>
                      {watchedCustomizations && watchedCustomizations.length > 0 ? (
                        <FormDescription className="text-amber-600 font-medium text-[10px] leading-tight mt-1">
                          Base price is disabled because you have added <strong>Variations</strong>. Pricing is now managed individually for each variation below.
                        </FormDescription>
                      ) : (
                        <FormDescription className="text-muted-foreground text-[10px] leading-tight mt-1">
                            Enter the base selling price for this item.
                        </FormDescription>
                      )}
                      <FormMessage />
                  </FormItem>
                  )}
              />
              
               <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {availableCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {(vendor?.category === 'Bakery' || vendor?.isInventory) && (
                    <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Stock Quantity</FormLabel>
                            <FormControl>
                            <Input 
                                type="number" 
                                placeholder="Leave empty for infinite stock" 
                                {...field} 
                                value={field.value ?? ''}
                                onChange={e => {
                                    const value = e.target.value;
                                    field.onChange(value === '' ? undefined : parseInt(value, 10));
                                }}
                                className={cn(watchedCustomizations && watchedCustomizations.length > 0 && "bg-slate-50 text-slate-400")}
                                disabled={watchedCustomizations && watchedCustomizations.length > 0}
                            />
                            </FormControl>
                            {watchedCustomizations && watchedCustomizations.length > 0 ? (
                                <FormDescription className="text-amber-600 font-medium text-[10px] leading-tight mt-1">
                                    Base stock is disabled because you have added <strong>Variations</strong>. Stock is now managed individually for each variation below.
                                </FormDescription>
                            ) : (
                                <FormDescription className="text-muted-foreground text-[10px] leading-tight mt-1">
                                    Only for inventory-tracked items. Leave blank for unlimited quantity.
                                </FormDescription>
                            )}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )}

                <div className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base font-bold">Customizations</Label>
                      <p className="text-xs text-muted-foreground">Add variations like sizes or optional add-ons.</p>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm" 
                      onClick={() => append({ 
                        id: Math.random().toString(36).substr(2, 9), 
                        name: '', 
                        type: 'SINGLE', 
                        minSelect: 0, 
                        options: [{ id: Math.random().toString(36).substr(2, 9), name: '', price: 0, originalPrice: undefined, isAvailable: true }] 
                      })}
                      className="rounded-full"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Group
                    </Button>
                  </div>

                  <div className="space-y-6">
                    {fields.map((field, index) => (
                      <CustomizationGroupFields 
                        key={field.id} 
                        control={form.control} 
                        index={index} 
                        removeGroup={() => {
                          remove(index);
                          // If this was the last customization group, warn about price
                          if (watchedCustomizations?.length === 1) {
                            const currentPrice = form.getValues('price');
                            if (currentPrice <= 0) {
                              toast({
                                title: "Action Required: Set Price",
                                description: "Since all customizations were removed, please set a valid base price for this item.",
                                variant: "destructive"
                              });
                            }
                          }
                        }} 
                        isMandatory={watchedCustomizations?.[index]?.minSelect === 1}
                        isInventoryEnabled={vendor?.isInventory ?? false}
                      />
                    ))}
                  </div>
                </div>

                <Separator className="my-6 opacity-50" />

                <div className="space-y-4 pb-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-bold">Item Image</Label>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        className="hidden"
                        accept="image/png, image/jpeg, image/webp"
                    />
                    <FormField
                        control={form.control}
                        name="image"
                        render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <div 
                                    onClick={handleUploadClick}
                                    className="w-full aspect-video rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all group relative"
                                >
                                    {imageToDisplay ? (
                                        <>
                                            <Image
                                              src={imageToDisplay}
                                              alt="Menu item image"
                                              width={400}
                                              height={225}
                                              className="object-cover h-full w-full group-hover:scale-105 group-hover:opacity-60 transition-all duration-300"
                                              placeholder={currentBlurDataUrl ? 'blur' : 'empty'}
                                              blurDataURL={currentBlurDataUrl}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-black/80 text-white px-5 py-2.5 rounded-full flex items-center gap-2 font-medium text-sm shadow-xl transform scale-95 group-hover:scale-100 transition-transform">
                                                    <Upload className="h-4 w-4" /> Change Image
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-500">
                                            <div className="w-12 h-12 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center mb-3 group-hover:-translate-y-1 transition-transform">
                                                <Upload className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                                            </div>
                                            <span className="text-sm font-semibold text-slate-700">Click to upload image</span>
                                            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest font-bold">PNG, JPG, WEBP</span>
                                        </div>
                                    )}
                                </div>
                            </FormControl>
                             <FormMessage />
                        </FormItem>
                        )}
                    />
                </div>
            </div>
             <SheetFooter className="p-6 bg-card border-t border-primary/10 sticky bottom-0">
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? <Loader2 className="animate-spin" /> : (menuItem ? 'Save Changes' : 'Add Item')}
                </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

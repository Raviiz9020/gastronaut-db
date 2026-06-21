
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
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
import { useExpense } from '@/context/expense-context';
import type { Expense } from '@/types';
import { CalendarIcon, Upload, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Combobox } from '@/components/ui/combobox';
import { Textarea } from '@/components/ui/textarea';
import { AnimatePresence, motion } from 'framer-motion';
import { useVendor } from '@/context/vendor-context';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface ExpenseFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  expense: Expense | null;
  categories: { name: string }[];
  ingredients: string[];
}

const formSchema = z.object({
  date: z.date({
    required_error: "A date is required.",
  }),
  category: z.string().min(1, { message: 'Please select a category.' }),
  description: z.string().min(2, { message: 'Description must be at least 2 characters.' }),
  amount: z.coerce.number().min(0.01, { message: 'Amount must be greater than 0.' }),
  imageUrl: z.string().url().optional().or(z.literal('')),
});

export default function ExpenseForm({ isOpen, onOpenChange, expense, categories, ingredients }: ExpenseFormProps) {
  const { addExpense, updateExpense } = useExpense();
  const { vendor } = useVendor();
  const { toast } = useToast();
  
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      category: '',
      description: '',
      amount: 0,
      imageUrl: '',
    },
  });
  
  const { watch, setValue } = form;
  const watchedCategory = watch('category');
  const watchedDescription = watch('description');
  const currentImage = watch('imageUrl');
  
  const isGroceriesCategory = useMemo(() => {
    return watchedCategory === 'Groceries' || watchedCategory === 'Ingredients';
  }, [watchedCategory]);

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        form.reset({
          ...expense,
          date: new Date(expense.date),
        });
      } else {
        form.reset({
          date: new Date(),
          category: '',
          description: '',
          amount: 0,
          imageUrl: '',
        });
      }
    }
  }, [expense, form, isOpen]);

  const categoryOptions = useMemo(() => {
    return categories.map(cat => ({ value: cat.name, label: cat.name }));
  }, [categories]);

  const currentTyping = useMemo(() => {
    const parts = watchedDescription.split(',').map(p => p.trim());
    return parts[parts.length - 1] || '';
  }, [watchedDescription]);

  const suggestionOptions = useMemo(() => {
    if (!isGroceriesCategory || !currentTyping) return [];
    
    const lowercasedQuery = currentTyping.toLowerCase();
    
    const existingIngredients = watchedDescription
      .toLowerCase()
      .split(',')
      .map(s => s.trim());

    return ingredients
        .filter(ing => 
            ing.toLowerCase().includes(lowercasedQuery) &&
            !existingIngredients.includes(ing.toLowerCase())
        )
        .slice(0, 5);
  }, [ingredients, isGroceriesCategory, currentTyping, watchedDescription]);

  const handleSuggestionClick = (suggestion: string) => {
    const parts = watchedDescription.split(',').map(p => p.trim());
    parts[parts.length - 1] = suggestion;
    setValue('description', parts.join(', ') + ', ');
    setShowSuggestions(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && vendor) {
        setIsUploading(true);
        try {
            const { compressedDataUrl } = await compressImage(URL.createObjectURL(file));
            const imageUrl = await uploadImageToStorage(compressedDataUrl, `receipt-images/${vendor.username}/${Date.now()}`);
            form.setValue('imageUrl', imageUrl, { shouldValidate: true });
        } catch (e) {
            toast({ title: 'Upload Failed', description: 'Could not upload image.', variant: 'destructive'});
        } finally {
            setIsUploading(false);
        }
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    const dataToSave = {
        ...values,
        date: values.date.toISOString(),
        description: values.description.replace(/,\\s*$/, '').trim(),
    };
    if (expense) {
      await updateExpense({ ...expense, ...dataToSave });
    } else {
      await addExpense(dataToSave as any);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle>{expense ? 'Edit' : 'Add'} Expense</SheetTitle>
          <SheetDescription>
            {expense ? 'Update the details of the expense.' : 'Record a new business expense.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-4">
               <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Expense</FormLabel>
                      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                                if (date) field.onChange(date);
                                setIsCalendarOpen(false);
                            }}
                            disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                    <FormItem className="space-y-2">
                        <FormLabel>Category :</FormLabel>
                        <FormControl className="pl-2">
                          <Combobox
                            options={categoryOptions}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select"
                          />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />

                 <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="e.g. 500.50" 
                            {...field} 
                            onWheel={(e) => (e.target as HTMLElement).blur()}
                            onKeyDown={(e) => ["e", "E", "+", "-"].includes(e.key) && e.preventDefault()}
                          />
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
                        <div className="relative">
                            <FormControl>
                                <Textarea
                                placeholder={isGroceriesCategory ? "e.g., Tomatoes, Onions, 5kg Rice" : "e.g., Shop Rent for July"}
                                {...field}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                                />
                            </FormControl>
                            <AnimatePresence>
                            {showSuggestions && suggestionOptions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="absolute z-10 w-full mt-1 bg-card border rounded-md shadow-lg"
                                >
                                    <ul className="py-1">
                                        {suggestionOptions.map(suggestion => (
                                            <li
                                                key={suggestion}
                                                className="px-3 py-1.5 text-sm cursor-pointer hover:bg-muted"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    handleSuggestionClick(suggestion);
                                                }}
                                            >
                                                {suggestion}
                                            </li>
                                        ))}
                                    </ul>
                                </motion.div>
                            )}
                            </AnimatePresence>
                        </div>
                        <FormMessage />
                    </FormItem>
                    )}
                />
                 <FormItem>
                    <FormLabel>Receipt (Optional)</FormLabel>
                    <div className="flex items-center gap-4">
                        <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center overflow-hidden">
                            {currentImage ? (
                                <Image src={currentImage} alt="Receipt image" width={100} height={100} className="object-cover h-full w-full"/>
                            ) : (
                                <span className="text-xs text-muted-foreground">No Image</span>
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
                 </FormItem>
            </div>
             <SheetFooter className="p-6 bg-card border-t border-primary/10 sticky bottom-0">
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button type="submit">{expense ? 'Save Changes' : 'Add Expense'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}



'use client';

import { useEffect, useState, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useSpecialMenu } from '@/context/special-menu-context';
import type { SpecialMenu, SpecialMenuType, MenuItem } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SpecialMenuFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  specialMenu: SpecialMenu | null;
  vendorMenuItems: MenuItem[];
  defaultMenuType: SpecialMenuType;
}

const formSchema = z.object({
  title: z.string().optional(),
  type: z.enum(['Breakfast', 'Lunch', 'Dinner', 'Evening Snacks']),
  itemIds: z.array(z.string()).min(1, 'Please select at least one item.'),
  isActive: z.boolean(),
});

export default function SpecialMenuForm({ isOpen, onOpenChange, specialMenu, vendorMenuItems, defaultMenuType }: SpecialMenuFormProps) {
  const { saveSpecialMenu } = useSpecialMenu();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      type: defaultMenuType,
      itemIds: [],
      isActive: false,
    },
  });

  const categories = useMemo(() => {
    const uniqueCategories = new Set(vendorMenuItems.map(item => item.category));
    return ['All', ...Array.from(uniqueCategories)];
  }, [vendorMenuItems]);
  
  const filteredMenuItems = useMemo(() => {
    if (selectedCategory === 'All') {
      return vendorMenuItems;
    }
    return vendorMenuItems.filter(item => item.category === selectedCategory);
  }, [vendorMenuItems, selectedCategory]);


  useEffect(() => {
    if (isOpen) {
      if (specialMenu) {
        form.reset({
          title: specialMenu.title,
          type: specialMenu.type,
          itemIds: specialMenu.itemIds,
          isActive: specialMenu.isActive,
        });
      } else {
        form.reset({
          title: '',
          type: defaultMenuType,
          itemIds: [],
          isActive: false,
        });
      }
      setSelectedCategory('All'); // Reset filter when sheet opens
    }
  }, [specialMenu, defaultMenuType, isOpen, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
        const dataToSave = { ...values, title: values.type };
        await saveSpecialMenu({
            id: specialMenu?.id,
            ...dataToSave,
        }, vendorMenuItems);
        toast({ title: 'Success!', description: `Special menu has been ${specialMenu ? 'updated' : 'created'}.`});
        onOpenChange(false);
    } catch(e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive'});
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle>{specialMenu ? 'Edit' : 'Create'} Special Menu</SheetTitle>
          <SheetDescription>Group items together for a special offering like Breakfast, Lunch, or Dinner.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a menu type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Breakfast">Breakfast</SelectItem>
                          <SelectItem value="Lunch">Lunch</SelectItem>
                          <SelectItem value="Dinner">Dinner</SelectItem>
                          <SelectItem value="Evening Snacks">Evening Snacks</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-2xl border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>Make this special visible to customers.</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="itemIds"
                    render={() => (
                        <FormItem>
                             <div className="mb-2">
                                <FormLabel className="text-base">Menu Items</FormLabel>
                                <FormDescription>Select the items to include in this special menu.</FormDescription>
                             </div>
                             <div className="mb-4">
                                <div className="flex flex-wrap gap-2">
                                    {categories.map(category => (
                                        <Button 
                                            key={category} 
                                            type="button" 
                                            size="sm"
                                            variant={selectedCategory === category ? 'default' : 'outline'}
                                            onClick={() => setSelectedCategory(category)}
                                            className="text-xs h-7"
                                        >
                                            {category}
                                        </Button>
                                    ))}
                                </div>
                             </div>
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                             {filteredMenuItems.map((item) => (
                                <FormField
                                    key={item.id}
                                    control={form.control}
                                    name="itemIds"
                                    render={({ field }) => {
                                        return (
                                            <FormItem
                                                key={item.id}
                                                className="flex flex-row items-start space-x-3 space-y-0"
                                            >
                                                <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(item.id)}
                                                    onCheckedChange={(checked) => {
                                                    return checked
                                                        ? field.onChange([...(field.value || []), item.id])
                                                        : field.onChange(
                                                            field.value?.filter(
                                                                (value) => value !== item.id
                                                            )
                                                            )
                                                    }}
                                                />
                                                </FormControl>
                                                <FormLabel className="font-normal text-sm">
                                                    {item.name}
                                                </FormLabel>
                                            </FormItem>
                                        )
                                    }}
                                />
                             ))}
                             </div>
                             <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
            </ScrollArea>
            <SheetFooter className="p-6 bg-card border-t border-primary/10 sticky bottom-0">
              <SheetClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </SheetClose>
              <Button type="submit">{specialMenu ? 'Save Changes' : 'Create Special'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

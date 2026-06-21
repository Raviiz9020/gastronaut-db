
'use client';

import { useEffect } from 'react';
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
import { useExpenseCategory } from '@/context/expense-category-context';
import type { ExpenseCategory } from '@/types';

interface ExpenseCategoryFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  category: ExpenseCategory | null;
}

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
});

export default function ExpenseCategoryForm({ isOpen, onOpenChange, category }: ExpenseCategoryFormProps) {
  const { addExpenseCategory, updateExpenseCategory } = useExpenseCategory();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (category) {
      form.reset(category);
    } else {
      form.reset({ name: '' });
    }
  }, [category, form, isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (category) {
      await updateExpenseCategory({ ...category, ...values });
    } else {
      await addExpenseCategory(values);
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle>{category ? 'Edit' : 'Add'} Expense Category</SheetTitle>
          <SheetDescription>
            {category ? 'Update the category name.' : 'Add a new category for vendors to use.'}
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
                      <Input placeholder="e.g. Ingredients, Rent, Utilities" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <SheetFooter className="p-6 bg-card border-t border-destructive/10 sticky bottom-0">
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button
                  type="submit"
                  className="text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                >
                  {category ? 'Save Changes' : 'Add Category'}
                </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

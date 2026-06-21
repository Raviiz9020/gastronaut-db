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
import { useVendor } from '@/context/vendor-context';
import type { Vendor } from '@/types';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useVendorCategory } from '@/context/vendor-category-context';
import { Textarea } from '@/components/ui/textarea';

interface VendorFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  vendor: Vendor | null;
}

const formSchema = z.object({
  username: z.string().min(2, { message: 'Username must be at least 2 characters.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }).optional().or(z.literal('')),
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  shopName: z.string().optional(),
  contact: z.string().optional(),
  address: z.string().optional(),
  googleMapsUrl: z.string().optional(),
  minOrderAmount: z.coerce.number().min(0).optional(),
  category: z.string().nullable().optional(),
  about: z.string().optional(),
  workingHours: z.string().optional(),
});

export default function VendorForm({ isOpen, onOpenChange, vendor }: VendorFormProps) {
  const { signup, updateVendorBySuperAdmin } = useVendor();
  const { vendorCategories } = useVendorCategory();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: '', password: '', name: '', shopName: '', contact: '', address: '', googleMapsUrl: '', minOrderAmount: 0, category: null, about: '', workingHours: '' },
  });

  useEffect(() => {
    if (vendor) {
      form.reset({ 
        ...vendor, 
        password: '',
        shopName: vendor.shopName || '',
        contact: vendor.contact || '',
        address: vendor.address || '',
        googleMapsUrl: vendor.googleMapsUrl || '',
        minOrderAmount: vendor.minOrderAmount || 0,
        category: vendor.category || null,
        about: vendor.about || '',
        workingHours: vendor.workingHours || '',
       });
    } else {
      form.reset({ username: '', password: '', name: '', shopName: '', contact: '', address: '', googleMapsUrl: '', minOrderAmount: 0, category: null, about: '', workingHours: '' });
    }
  }, [vendor, form, isOpen]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (vendor) {
          const { password, ...updateData } = values;
          const dataToUpdate: Partial<Omit<Vendor, 'isApproved'>> & { username: string } = {
              username: vendor.username,
              name: updateData.name,
              shopName: updateData.shopName,
              contact: updateData.contact,
              address: updateData.address,
              googleMapsUrl: updateData.googleMapsUrl,
              minOrderAmount: updateData.minOrderAmount,
              category: updateData.category,
              about: updateData.about,
              workingHours: updateData.workingHours,
          }
          if (password) {
              (dataToUpdate as Partial<Vendor>).password = password;
          }
        await updateVendorBySuperAdmin(dataToUpdate);
        toast({ title: 'Vendor Updated!', description: 'The vendor details have been saved.' });
      } else {
        if (!values.password) {
            form.setError('password', { message: 'Password is required for new vendors.' });
            return;
        }
        // When super admin creates a user, we pass all details
        await signup(values.username, values.password, values);
        toast({ title: 'Vendor Added!', description: `${values.username} has been created.` });
      }
      onOpenChange(false);
    } catch (e: any) {
        toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="p-6">
          <SheetTitle>{vendor ? 'Edit' : 'Add'} Vendor</SheetTitle>
          <SheetDescription>
            {vendor ? 'Update the vendor details.' : 'Create a new vendor account.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. future_eats" {...field} disabled={!!vendor} />
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
                      <Input type="password" placeholder={vendor ? "Leave blank to keep unchanged" : "••••••••"} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendor/Owner Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="shopName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shop Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., The Future Eatery" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Vendor Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {vendorCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
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
                      <Input placeholder="+91 12345 67890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123, Cybernetic City, Neo-Delhi" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="googleMapsUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://maps.app.goo.gl/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="minOrderAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum Order Amount (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="about"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Tell customers about the shop..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workingHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Working Hours</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 9 AM - 10 PM" {...field} />
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
                <Button type="submit" variant="destructive">{vendor ? 'Save Changes' : 'Add Vendor'}</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

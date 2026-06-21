'use client';

import { useState } from 'react';
import { useVendorCategory } from '@/context/vendor-category-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import type { VendorCategory } from '@/types';
import VendorCategoryForm from './vendor-category-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import Image from 'next/image';

export default function SuperAdminVendorCategoryPage() {
  const { vendorCategories, removeVendorCategory } = useVendorCategory();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<VendorCategory | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const handleAddNew = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: VendorCategory) => {
    setSelectedCategory(item);
    setIsFormOpen(true);
  };
  
  const handleDeleteConfirm = async (itemId: string) => {
    await removeVendorCategory(itemId);
    setItemToDelete(null);
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manage Vendor Categories</h2>
       </div>

      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vendor Categories</CardTitle>
          <Button
            onClick={handleAddNew}
            size="sm"
            className="rounded-full text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
          >
            <PlusCircle className="mr-2 h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorCategories.length > 0 ? (
                vendorCategories.map(item => (
                  <TableRow key={item.id}>
                     <TableCell>
                      <div className="w-10 h-10 rounded-full overflow-hidden relative">
                        {item.imageUrl ? (
                          <Image src={item.imageUrl} alt={item.name} layout="fill" className="object-cover"/>
                        ) : (
                          <div className="w-full h-full bg-muted"/>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          className="text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                          onClick={() => setItemToDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    No vendor categories yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <VendorCategoryForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={selectedCategory}
      />

      <ConfirmationDialog
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleDeleteConfirm(itemToDelete)}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete the vendor category. Existing vendors in this category will not be affected."
      />
    </div>
  );
}

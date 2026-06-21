'use client';

import { useState, useMemo } from 'react';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
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
import { PlusCircle, Edit, Trash2, Globe } from 'lucide-react';
import type { Category } from '@/types';
import CategoryForm from './category-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import Image from 'next/image';

export default function SuperAdminCategoryPage() {
  const { globalCategories, removeCategory } = useMenu();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const handleAddNew = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Category) => {
    setSelectedCategory(item);
    setIsFormOpen(true);
  };
  
  const handleDeleteConfirm = async (itemId: string) => {
    await removeCategory(itemId, true); // true for global
    setItemToDelete(null);
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manage Global Categories</h2>
       </div>

      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Global Menu Categories</CardTitle>
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
                <TableHead>Menu Category</TableHead>
                <TableHead>Vendor Category</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {globalCategories.length > 0 ? (
                globalCategories.map(item => (
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
                    <TableCell>{item.vendorCategory || 'All'}</TableCell>
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
                  <TableCell colSpan={4} className="h-24 text-center">
                    No global categories yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <CategoryForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={selectedCategory}
      />

      <ConfirmationDialog
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
        onConfirm={() => itemToDelete && handleDeleteConfirm(itemToDelete)}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete the category for all vendors."
      />
    </div>
  );
}

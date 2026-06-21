
'use client';

import { useState, useMemo } from 'react';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Globe, Info } from 'lucide-react';
import type { Category } from '@/types';
import CategoryForm from './category-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function AdminCategoryPage() {
  const { categories, removeCategory } = useMenu();
  const { vendor } = useVendor();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const isMenuEditDisabled = !!vendor?.isMenuEditDisabled;

  const vendorCategories = useMemo(() => {
    if (!vendor) return [];
    return categories.filter(cat => cat.shopName === vendor.shopName || cat.shopName === 'global');
  }, [categories, vendor]);

  const handleAddNew = () => {
    setSelectedCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: Category) => {
    // Vendors cannot edit global categories
    if (item.shopName === 'global' || isMenuEditDisabled) return;
    setSelectedCategory(item);
    setIsFormOpen(true);
  };
  
  const handleDeleteConfirm = (itemId: string) => {
    removeCategory(itemId);
    setItemToDelete(null);
  };

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manage Categories</h2>
       </div>

       {isMenuEditDisabled && (
            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">View Only Mode</AlertTitle>
                <AlertDescription className="text-blue-600">
                    Category management is currently restricted for this demo account to maintain platform integrity.
                </AlertDescription>
            </Alert>
       )}

      <Card className="rounded-3xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Menu Categories</CardTitle>
          {!isMenuEditDisabled && (
            <Button onClick={handleAddNew}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
            </Button>
          )}
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendorCategories.length > 0 ? (
                vendorCategories.map(item => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.shopName === 'global' ? (
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="h-4 w-4" /> Global
                        </span>
                      ) : (
                        'Vendor Specific'
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          onClick={() => handleEdit(item)}
                          disabled={item.shopName === 'global' || isMenuEditDisabled}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          onClick={() => setItemToDelete(item.id)}
                          disabled={item.shopName === 'global' || isMenuEditDisabled}
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
                    No categories yet.
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
        description="This action cannot be undone. This will permanently delete the category."
      />
    </div>
  );
}

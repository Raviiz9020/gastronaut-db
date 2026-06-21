'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
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
import { PlusCircle, Edit, Trash2, Utensils, Loader2, Info } from 'lucide-react';
import type { MenuItem as MenuItemType, Category } from '@/types';
import MenuItemForm from '../menu-item-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import DiscountDialog from '../discount-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminMenuPage() {
  const { menuItems: allMenuItems, removeMenuItem, toggleMenuItemDiscount, toggleMenuItemAvailability, toggleMenuItemVegStatus, setAllItemsVegStatusInCategory, updateMenuItem } = useMenu();
  const { vendor } = useVendor();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemType | null>(null);
  const [itemToDiscount, setItemToDiscount] = useState<MenuItemType | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('All');
  const { toast } = useToast();

  const isMenuEditDisabled = !!vendor?.isMenuEditDisabled;

  const vendorMenuItems = useMemo(() => {
    if (!vendor) return [];
    return allMenuItems.filter(item => item.vendorUsername === vendor.username);
  }, [allMenuItems, vendor]);

  const vendorCategories = useMemo(() => {
    if (!vendorMenuItems) return [];
    return ['All', ...Array.from(new Set(vendorMenuItems.map(item => item.category)))];
  }, [vendorMenuItems]);

  const filteredMenuItems = useMemo(() => {
    if (activeTab === 'All') {
      return vendorMenuItems;
    }
    return vendorMenuItems.filter(item => item.category === activeTab);
  }, [vendorMenuItems, activeTab]);

  const categoryVegStatus = useMemo(() => {
    if (filteredMenuItems.length === 0) return 'none';
    const allVeg = filteredMenuItems.every(item => item.isVeg);
    if (allVeg) return 'all';
    const noneVeg = filteredMenuItems.every(item => !item.isVeg);
    if (noneVeg) return 'none';
    return 'indeterminate';
  }, [filteredMenuItems]);

  const handleBulkToggleVeg = () => {
    if (isMenuEditDisabled) return;
    const newStatus = categoryVegStatus !== 'all';
    setAllItemsVegStatusInCategory(activeTab, newStatus);
  };

  const handleAddNew = () => {
    setSelectedMenuItem(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item: MenuItemType) => {
    setSelectedMenuItem(item);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
        await removeMenuItem(itemToDelete);
        setItemToDelete(null);
    }
  };
  
  const handleDiscountToggle = (item: MenuItemType) => {
    if (isMenuEditDisabled) return;
    // If the discount is currently active, turning the switch off will just deactivate it.
    if (item.isDiscountActive) {
      toggleMenuItemDiscount(item.id);
    } else {
      // For customized items: open the Edit form so vendor can set per-variation originalPrice.
      // The discount toggle auto-enables on save when originalPrices are configured.
      if (item.customizations && item.customizations.length > 0) {
        // Check if at least one variation has an originalPrice > price
        const hasSetOriginalPrice = item.customizations.some(group => 
          group.options?.some(opt => opt.originalPrice && opt.originalPrice > opt.price && opt.price > 0)
        );

        if (hasSetOriginalPrice) {
          toggleMenuItemDiscount(item.id);
        } else {
          toast({
            title: 'Set Original Prices First',
            description: 'Please set the "Original Price" for your variations in the edit form before enabling the discount.',
          });
          handleEdit(item);
        }
      } else {
        // For simple items: open dialog to set the discount price.
        setItemToDiscount(item);
        setIsDiscountDialogOpen(true);
      }
    }
  };

  const isAddDisabled = !vendor?.isApproved || isMenuEditDisabled;
  
  const getTooltipContent = () => {
    if (isMenuEditDisabled) return "Menu editing is disabled for this account.";
    if (!vendor?.isApproved) {
        return "Your account needs admin approval to add items.";
    }
    return "";
  }

  const AddButton = () => (
    <Button onClick={handleAddNew} size="sm" className="rounded-full" disabled={isAddDisabled}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add Item
    </Button>
  );

  const StockInput = ({ item }: { item: MenuItemType }) => {
    const [localStock, setLocalStock] = useState<string | number>(item.stock ?? '');
    const [isUpdating, startUpdate] = useTransition();

    useEffect(() => {
        setLocalStock(item.stock ?? '');
    }, [item.stock]);

    const handleStockUpdate = () => {
        if (isMenuEditDisabled) return;
        const newStock = Number(localStock);
        if (isNaN(newStock) || newStock === item.stock) {
            setLocalStock(item.stock ?? '');
            return;
        }

        startUpdate(async () => {
            await updateMenuItem({ ...item, stock: newStock });
            toast({ title: "Stock updated!", description: `${item.name} now has ${newStock} items.` });
        });
    };

    return (
        <div className="flex items-center gap-2">
            <Input
                type="number"
                value={localStock}
                onChange={(e) => setLocalStock(e.target.value)}
                onBlur={handleStockUpdate}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                className="w-20 h-8 text-center"
                placeholder="N/A"
                disabled={isMenuEditDisabled}
            />
            {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
        </div>
    );
  };


  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Manage Menu</h2>
            {!isMenuEditDisabled && (
                <TooltipProvider>
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <div className="inline-block"> 
                                <AddButton />
                            </div>
                        </TooltipTrigger>
                        {isAddDisabled && (
                            <TooltipContent>
                                {getTooltipContent()}
                            </TooltipContent>
                        )}
                    </Tooltip>
                </TooltipProvider>
            )}
       </div>

       {isMenuEditDisabled && (
            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">View Only Mode</AlertTitle>
                <AlertDescription className="text-blue-600">
                    Menu management is currently restricted for this demo account to maintain platform integrity.
                </AlertDescription>
            </Alert>
       )}

        {vendorMenuItems.length === 0 ? (
             <div className="text-center py-16 flex flex-col items-center gap-4 border-dashed border-2 rounded-2xl">
                <Utensils className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-xl font-semibold">No Menu Items Found</h3>
                <p className="text-muted-foreground">Click "Add Item" to build your menu.</p>
            </div>
        ) : (
             <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0">
                {vendorCategories.map(cat => (
                  <TabsTrigger key={cat} value={cat} className="m-1 rounded-full data-[state=active]:shadow-sm h-10 w-auto px-4">
                    {cat}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Card className="rounded-3xl mt-4">
                <CardContent className="pt-6">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>
                                  <div className="flex items-center gap-2">
                                      <Switch
                                          checked={categoryVegStatus === 'all'}
                                          onCheckedChange={handleBulkToggleVeg}
                                          aria-label="Toggle all items veg status"
                                          className={cn(
                                            categoryVegStatus === 'all' && "data-[state=checked]:bg-green-500",
                                            categoryVegStatus === 'indeterminate' && "data-[state=unchecked]:bg-orange-500",
                                            categoryVegStatus === 'none' && "data-[state=unchecked]:bg-red-500"
                                          )}
                                          disabled={isMenuEditDisabled}
                                      />
                                      <span>Veg</span>
                                  </div>
                                </TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Discount</TableHead>
                                <TableHead className="w-[100px]">Available</TableHead>
                                {vendor?.category === 'Bakery' && <TableHead>Stock</TableHead>}
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredMenuItems.map(item => (
                            <TableRow key={item.id} className={!item.isAvailable ? 'bg-muted/30' : ''}>
                                <TableCell className="font-medium">{item.name}</TableCell>
                                <TableCell>
                                    <Switch
                                        checked={item.isVeg}
                                        onCheckedChange={() => toggleMenuItemVegStatus(item.id)}
                                        aria-label="Toggle item veg status"
                                        disabled={isMenuEditDisabled}
                                    />
                                </TableCell>
                                 <TableCell>
                                    {item.customizations && item.customizations.length > 0 ? (
                                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Varies</Badge>
                                    ) : (
                                        `₹${item.price.toFixed(2)}`
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        {item.customizations && item.customizations.length > 0 ? (
                                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Varies</Badge>
                                        ) : (
                                            item.discountPrice && item.discountPrice > 0 ? (
                                                <span>₹{item.discountPrice.toFixed(2)}</span>
                                            ) : 'N/A'
                                        )}
                                        <Switch
                                            id={`discount-switch-${item.id}`}
                                            checked={item.isDiscountActive ?? false}
                                            onCheckedChange={() => handleDiscountToggle(item)}
                                            aria-label="Toggle discount"
                                            disabled={isMenuEditDisabled}
                                        />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {item.customizations && item.customizations.length > 0 ? (
                                        <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">In Edit</Badge>
                                    ) : (
                                        <Switch
                                            id={`availability-switch-${item.id}`}
                                            checked={item.isAvailable}
                                            onCheckedChange={(checked) => toggleMenuItemAvailability(item.id, checked)}
                                            aria-label="Toggle item availability"
                                            disabled={isMenuEditDisabled}
                                        />
                                    )}
                                </TableCell>
                                {vendor?.category === 'Bakery' && (
                                    <TableCell>
                                        {item.customizations && item.customizations.length > 0 ? (
                                            <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200">Varies</Badge>
                                        ) : (
                                            <StockInput item={item} />
                                        )}
                                    </TableCell>
                                )}
                                <TableCell>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => handleEdit(item)} disabled={isMenuEditDisabled}>
                                        <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="destructive" size="icon" onClick={() => setItemToDelete(item.id)} disabled={isMenuEditDisabled}>
                                        <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </CardContent>
              </Card>
            </Tabs>
        )}

      <MenuItemForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        menuItem={selectedMenuItem}
      />

      <DiscountDialog
        isOpen={isDiscountDialogOpen}
        onOpenChange={setIsDiscountDialogOpen}
        menuItem={itemToDiscount}
      />

      <ConfirmationDialog
        isOpen={!!itemToDelete}
        onOpenChange={(isOpen) => !isOpen && setItemToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete the menu item and its image from storage."
      />
    </div>
  );
}

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
import { 
  PlusCircle, 
  Edit, 
  Trash2, 
  Utensils, 
  Loader2, 
  Info, 
  Search, 
  X, 
  LayoutGrid, 
  LayoutList, 
  Tag, 
  Layers, 
  CheckCircle2, 
  XCircle,
  IndianRupee,
  Sparkles
} from 'lucide-react';
import type { MenuItem as MenuItemType, Category } from '@/types';
import MenuItemForm from '../menu-item-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import DiscountDialog from '../discount-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';

export default function AdminMenuPage() {
  const { 
    menuItems: allMenuItems, 
    removeMenuItem, 
    toggleMenuItemDiscount, 
    toggleMenuItemAvailability, 
    toggleMenuItemVegStatus, 
    setAllItemsVegStatusInCategory, 
    updateMenuItem,
    fetchAllItems
  } = useMenu();
  const { vendor } = useVendor();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItemType | null>(null);
  const [itemToDiscount, setItemToDiscount] = useState<MenuItemType | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const { toast } = useToast();

  const isMenuEditDisabled = !!vendor?.isMenuEditDisabled;

  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  const vendorMenuItems = useMemo(() => {
    if (!vendor) return [];
    const vUsername = vendor.username?.toLowerCase();
    const vShop = vendor.shopName?.toLowerCase();

    return allMenuItems.filter((item) => {
      const itemVendor = item.vendorUsername?.toLowerCase();
      const itemShop = item.shopName?.toLowerCase();
      return (vUsername && itemVendor === vUsername) || (vShop && itemShop === vShop);
    });
  }, [allMenuItems, vendor]);

  const vendorCategories = useMemo(() => {
    if (!vendorMenuItems) return ['All'];
    return ['All', ...Array.from(new Set(vendorMenuItems.map((item) => item.category).filter(Boolean)))];
  }, [vendorMenuItems]);

  // Overall menu summary stats
  const menuStats = useMemo(() => {
    const total = vendorMenuItems.length;
    const inStock = vendorMenuItems.filter((i) => i.isAvailable).length;
    const onSale = vendorMenuItems.filter((i) => i.isDiscountActive).length;
    const customizable = vendorMenuItems.filter((i) => i.customizations && i.customizations.length > 0).length;
    return { total, inStock, onSale, customizable };
  }, [vendorMenuItems]);

  const filteredMenuItems = useMemo(() => {
    return vendorMenuItems.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customizations?.some((c) =>
          c.options?.some((opt) => opt.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      return matchesCategory && matchesSearch;
    });
  }, [vendorMenuItems, activeCategory, searchQuery]);

  const categoryVegStatus = useMemo(() => {
    if (filteredMenuItems.length === 0) return 'none';
    const allVeg = filteredMenuItems.every((item) => item.isVeg);
    if (allVeg) return 'all';
    const noneVeg = filteredMenuItems.every((item) => !item.isVeg);
    if (noneVeg) return 'none';
    return 'indeterminate';
  }, [filteredMenuItems]);

  const handleBulkToggleVeg = () => {
    if (isMenuEditDisabled) return;
    const newStatus = categoryVegStatus !== 'all';
    setAllItemsVegStatusInCategory(activeCategory, newStatus);
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
    if (item.isDiscountActive) {
      toggleMenuItemDiscount(item.id);
    } else {
      if (item.customizations && item.customizations.length > 0) {
        const hasSetOriginalPrice = item.customizations.some((group) =>
          group.options?.some((opt) => opt.originalPrice && opt.originalPrice > opt.price && opt.price > 0)
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
        setItemToDiscount(item);
        setIsDiscountDialogOpen(true);
      }
    }
  };

  const isAddDisabled = !vendor?.isApproved || isMenuEditDisabled;

  const getTooltipContent = () => {
    if (isMenuEditDisabled) return 'Menu editing is disabled for this account.';
    if (!vendor?.isApproved) {
      return 'Your account needs admin approval to add items.';
    }
    return '';
  };

  const AddButton = () => (
    <Button onClick={handleAddNew} size="sm" className="rounded-full font-bold shadow-xs gap-1.5" disabled={isAddDisabled}>
      <PlusCircle className="h-4 w-4" /> Add New Item
    </Button>
  );

  // Helper for starting price rendering
  const getItemDisplayPrice = (item: MenuItemType): { price: string; isFrom: boolean } => {
    if (item.price > 0) return { price: `₹${item.price.toFixed(0)}`, isFrom: false };
    if (item.customizations && item.customizations.length > 0) {
      const validPrices = item.customizations
        .flatMap((g) => g.options)
        .map((o) => o.price)
        .filter((p) => typeof p === 'number' && p > 0);
      if (validPrices.length > 0) {
        return { price: `₹${Math.min(...validPrices).toFixed(0)}`, isFrom: true };
      }
    }
    return { price: '₹0', isFrom: false };
  };

  const StockInput = ({ item }: { item: MenuItemType }) => {
    const [localStock, setLocalStock] = useState<string | number>(item.stock ?? '');
    const [isUpdating, startUpdate] = useTransition();

    useEffect(() => {
      setLocalStock(item.stock ?? '');
    }, [item.stock]);

    const handleStockUpdate = () => {
      if (isMenuEditDisabled) return;
      const trimmed = String(localStock).trim();
      const newStock = trimmed === '' ? null : Number(trimmed);
      if (newStock !== null && isNaN(newStock)) {
        setLocalStock(item.stock ?? '');
        return;
      }
      if (newStock === (item.stock ?? null)) {
        return;
      }

      startUpdate(async () => {
        await updateMenuItem({ ...item, stock: newStock === null ? undefined : newStock });
        toast({
          title: 'Stock updated!',
          description: newStock === null ? `${item.name} now has unlimited stock.` : `${item.name} now has ${newStock} items.`,
        });
      });
    };

    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={localStock}
          onChange={(e) => setLocalStock(e.target.value)}
          onBlur={handleStockUpdate}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          className="w-16 h-7 text-xs text-center rounded-xl font-bold"
          placeholder="∞"
          disabled={isMenuEditDisabled}
        />
        {isUpdating && <Loader2 className="h-3 w-3 animate-spin" />}
      </div>
    );
  };

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-headline tracking-tight text-foreground flex items-center gap-2">
            <Utensils className="h-7 w-7 text-primary" />
            Menu Management
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Organize dishes, custom portion sizes, active discounts, and kitchen inventory.
          </p>
        </div>

        {!isMenuEditDisabled && (
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div className="inline-block shrink-0">
                  <AddButton />
                </div>
              </TooltipTrigger>
              {isAddDisabled && <TooltipContent>{getTooltipContent()}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {isMenuEditDisabled && (
        <Alert className="bg-blue-500/10 border-blue-500/30 rounded-2xl text-xs">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-700 dark:text-blue-400 font-bold">View Only Mode</AlertTitle>
          <AlertDescription className="text-blue-600 dark:text-blue-300">
            Menu editing is currently restricted for this demo account to maintain platform integrity.
          </AlertDescription>
        </Alert>
      )}

      {/* Hero Menu Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="rounded-3xl border border-border/70 bg-card/85 p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 text-primary flex items-center justify-center font-bold shrink-0">
            <Utensils className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground">Total Catalog</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground">{menuStats.total} Dishes</div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card/85 p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground">In Stock</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground">{menuStats.inStock} Live</div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card/85 p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <Tag className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground">Active Deals</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground">{menuStats.onSale} Offers</div>
          </div>
        </Card>

        <Card className="rounded-3xl border border-border/70 bg-card/85 p-3.5 sm:p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold shrink-0">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-muted-foreground">Customizable</span>
            <div className="text-lg sm:text-xl font-extrabold text-foreground">{menuStats.customizable} Variations</div>
          </div>
        </Card>
      </div>

      {/* Main Menu Management Shelf */}
      {vendorMenuItems.length === 0 ? (
        <div className="text-center py-16 flex flex-col items-center gap-4 border-dashed border-2 rounded-3xl p-8 bg-muted/10">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Utensils className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold font-headline text-foreground">No Menu Items Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Get started by adding your first dish with customizable sizes, addons, and prices.
          </p>
          {!isMenuEditDisabled && <AddButton />}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Controls: Search, Category Pills & View Switcher */}
          <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border/70 shadow-xs space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Live Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by dish name, category, or variation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 text-xs rounded-xl h-9"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* View Switcher: Cards vs Table */}
              <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-full shrink-0 border border-border/60 shadow-xs">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
                    viewMode === 'cards'
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Card Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer",
                    viewMode === 'table'
                      ? "bg-primary text-primary-foreground shadow-xs scale-105"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutList className="h-3.5 w-3.5" />
                  Table View
                </button>
              </div>
            </div>

            {/* Pill Category Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {vendorCategories.map((cat) => {
                const count =
                  cat === 'All'
                    ? vendorMenuItems.length
                    : vendorMenuItems.filter((i) => i.category === cat).length;

                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={cn(
                      "px-3 py-1 text-xs font-bold rounded-full transition-all cursor-pointer shrink-0",
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground shadow-xs scale-105"
                        : "bg-muted/70 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {cat} <span className="opacity-75 font-normal ml-0.5">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* VIEW 1: Modern Visual Card Grid */}
          {viewMode === 'cards' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
              {filteredMenuItems.length > 0 ? (
                filteredMenuItems.map((item) => {
                  const priceInfo = getItemDisplayPrice(item);
                  const hasCustomizations = item.customizations && item.customizations.length > 0;
                  const totalOptions = hasCustomizations
                    ? item.customizations!.reduce((acc, g) => acc + g.options.length, 0)
                    : 0;

                  return (
                    <Card
                      key={item.id}
                      className={cn(
                        "rounded-3xl border transition-all duration-200 p-3.5 sm:p-4 flex flex-col justify-between gap-3 group",
                        !item.isAvailable
                          ? "bg-red-500/5 dark:bg-red-950/20 border-red-500/30 opacity-85"
                          : "bg-card hover:bg-card/95 border-border/70 shadow-xs hover:shadow-md hover:border-primary/40"
                      )}
                    >
                      {/* Top: Compact Thumbnail & Dish Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Compact Food Thumbnail (w-14 h-14 / w-16 h-16) */}
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-muted/60 overflow-hidden shrink-0 border border-border/50 shadow-2xs">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                              sizes="64px"
                            />
                          ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                              <Utensils className="h-5 w-5 opacity-30" />
                            </div>
                          )}

                          {/* Dietary Indicator Badge overlay on bottom-right of thumbnail */}
                          <span
                            className={cn(
                              "absolute bottom-1 right-1 w-3.5 h-3.5 rounded-sm border flex items-center justify-center bg-background/95 backdrop-blur-xs shadow-xs",
                              item.isVeg ? "border-emerald-600" : "border-red-600"
                            )}
                            title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                item.isVeg ? "bg-emerald-600" : "bg-red-600"
                              )}
                            />
                          </span>
                        </div>

                        {/* Dish Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-1">
                            <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1 leading-tight">
                              {item.name}
                            </h4>
                            {item.isDiscountActive && (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-500 text-white shrink-0 shadow-2xs">
                                Sale
                              </span>
                            )}
                          </div>

                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {item.category}
                          </p>

                          {/* Price & Variations Display */}
                          <div className="flex items-baseline gap-1.5 mt-1.5 flex-wrap">
                            {priceInfo.isFrom && (
                              <span className="text-[10px] text-muted-foreground font-semibold">From</span>
                            )}
                            <span className="text-sm sm:text-base font-extrabold text-foreground">
                              {priceInfo.price}
                            </span>
                            {item.discountPrice && item.discountPrice > 0 && !hasCustomizations && (
                              <span className="text-[11px] text-muted-foreground line-through">
                                ₹{item.price.toFixed(0)}
                              </span>
                            )}
                            {hasCustomizations && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-muted border border-border/50 text-muted-foreground">
                                {totalOptions} Var.
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Quick Toggles & Edit Actions */}
                      <div className="pt-2.5 border-t border-border/50 flex items-center justify-between gap-2">
                        {/* Availability Quick Switch */}
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={item.isAvailable}
                            onCheckedChange={(checked) => toggleMenuItemAvailability(item.id, checked)}
                            disabled={isMenuEditDisabled}
                            className="scale-85"
                            aria-label={`Toggle ${item.name} availability`}
                          />
                          <span
                            className={cn(
                              "text-[10px] font-bold",
                              item.isAvailable
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-500 font-extrabold"
                            )}
                          >
                            {item.isAvailable ? 'In Stock' : 'Sold Out'}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDiscountToggle(item)}
                            disabled={isMenuEditDisabled}
                            className={cn(
                              "h-7 w-7 p-0 rounded-full",
                              item.isDiscountActive
                                ? "text-amber-500 bg-amber-500/10"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                            title="Toggle Discount"
                          >
                            <Tag className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                            disabled={isMenuEditDisabled}
                            className="h-7 px-2.5 rounded-full text-xs font-bold gap-1"
                          >
                            <Edit className="h-3 w-3" /> Edit
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setItemToDelete(item.id)}
                            disabled={isMenuEditDisabled}
                            className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete Item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center text-muted-foreground">
                  <Utensils className="h-8 w-8 opacity-30 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-foreground">No dishes matched your filter</p>
                  <p className="text-xs mt-0.5">Try searching with a different term or category</p>
                </div>
              )}
            </div>
          ) : (
            /* VIEW 2: Modern Table View */
            <Card className="rounded-3xl border border-border/70 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="text-xs font-bold">Dish & Category</TableHead>
                      <TableHead className="text-xs font-bold">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={categoryVegStatus === 'all'}
                            onCheckedChange={handleBulkToggleVeg}
                            aria-label="Toggle all items veg status"
                            className={cn(
                              categoryVegStatus === 'all' && 'data-[state=checked]:bg-emerald-500',
                              categoryVegStatus === 'indeterminate' && 'data-[state=unchecked]:bg-amber-500',
                              categoryVegStatus === 'none' && 'data-[state=unchecked]:bg-red-500'
                            )}
                            disabled={isMenuEditDisabled}
                          />
                          <span>Veg</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-xs font-bold">Price</TableHead>
                      <TableHead className="text-xs font-bold">Discount</TableHead>
                      <TableHead className="text-xs font-bold w-[120px]">Available</TableHead>
                      {vendor?.category === 'Bakery' && <TableHead className="text-xs font-bold">Stock</TableHead>}
                      <TableHead className="text-xs font-bold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMenuItems.map((item) => {
                      const priceInfo = getItemDisplayPrice(item);
                      const hasCustomizations = item.customizations && item.customizations.length > 0;

                      return (
                        <TableRow key={item.id} className={!item.isAvailable ? 'bg-red-500/5' : ''}>
                          {/* Dish Name & Thumbnail */}
                          <TableCell className="font-medium text-xs">
                            <div className="flex items-center gap-3">
                              <div className="relative w-9 h-9 rounded-xl bg-muted overflow-hidden shrink-0">
                                {item.image ? (
                                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                                ) : (
                                  <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <Utensils className="h-4 w-4 opacity-30" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground truncate">{item.name}</p>
                                <span className="text-[10px] text-muted-foreground">{item.category}</span>
                              </div>
                            </div>
                          </TableCell>

                          {/* Veg Toggle */}
                          <TableCell>
                            <Switch
                              checked={item.isVeg}
                              onCheckedChange={() => toggleMenuItemVegStatus(item.id)}
                              aria-label="Toggle item veg status"
                              disabled={isMenuEditDisabled}
                            />
                          </TableCell>

                          {/* Price */}
                          <TableCell className="text-xs font-extrabold text-foreground">
                            {priceInfo.isFrom ? `From ${priceInfo.price}` : priceInfo.price}
                            {hasCustomizations && (
                              <span className="block text-[10px] font-normal text-muted-foreground">
                                ({item.customizations!.reduce((acc, g) => acc + g.options.length, 0)} var.)
                              </span>
                            )}
                          </TableCell>

                          {/* Discount */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {hasCustomizations ? (
                                <Badge variant="outline" className="text-[10px] rounded-full">In Var.</Badge>
                              ) : item.discountPrice && item.discountPrice > 0 ? (
                                <span className="text-xs font-bold text-emerald-600">₹{item.discountPrice.toFixed(0)}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">--</span>
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

                          {/* Availability Toggle */}
                          <TableCell>
                            <Switch
                              id={`availability-switch-${item.id}`}
                              checked={item.isAvailable}
                              onCheckedChange={(checked) => toggleMenuItemAvailability(item.id, checked)}
                              aria-label="Toggle item availability"
                              disabled={isMenuEditDisabled}
                            />
                          </TableCell>

                          {/* Stock Input (Bakery) */}
                          {vendor?.category === 'Bakery' && (
                            <TableCell>
                              {hasCustomizations ? (
                                <Badge variant="outline" className="text-[10px] rounded-full">In Var.</Badge>
                              ) : (
                                <StockInput item={item} />
                              )}
                            </TableCell>
                          )}

                          {/* Action Buttons */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(item)}
                                disabled={isMenuEditDisabled}
                                className="h-7 px-2 text-xs rounded-full"
                              >
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setItemToDelete(item.id)}
                                disabled={isMenuEditDisabled}
                                className="h-7 w-7 p-0 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Forms & Dialogs */}
      <MenuItemForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} menuItem={selectedMenuItem} />
      <DiscountDialog isOpen={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen} menuItem={itemToDiscount} />
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

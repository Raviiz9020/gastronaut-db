'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  Zap, 
  Search, 
  Utensils, 
  X, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Layers,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import type { MenuItem, Customization, CustomizationOption } from '@/types';

interface VendorQuickStockDrawerProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function VendorQuickStockDrawer({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: VendorQuickStockDrawerProps) {
  const { 
    menuItems, 
    toggleMenuItemAvailability, 
    setAllItemsAvailabilityInCategory,
    fetchAllItems, 
    updateMenuItem 
  } = useMenu();
  const { vendor } = useVendor();
  const { toast } = useToast();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen;
  const setIsOpen = setControlledOpen !== undefined ? setControlledOpen : setUncontrolledOpen;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlySoldOut, setOnlySoldOut] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  // Ensure menu items are always fully fetched and synced
  useEffect(() => {
    fetchAllItems();
  }, [fetchAllItems]);

  // Robust vendor menu item matching (case-insensitive username and fallback shopName)
  const vendorItems = useMemo(() => {
    if (!vendor) return [];
    const vUsername = vendor.username?.toLowerCase();
    const vShop = vendor.shopName?.toLowerCase();

    return menuItems.filter((item) => {
      const itemVendor = item.vendorUsername?.toLowerCase();
      const itemShop = item.shopName?.toLowerCase();
      return (vUsername && itemVendor === vUsername) || (vShop && itemShop === vShop);
    });
  }, [menuItems, vendor]);

  // Count items sold out (parent dish sold out or all variants sold out)
  const soldOutItems = useMemo(() => {
    return vendorItems.filter((item) => {
      if (!item.isAvailable) return true;
      if (item.customizations && item.customizations.length > 0) {
        const hasAnyOption = item.customizations.some((g) => g.options.length > 0);
        const allOptionsSoldOut = item.customizations.every((g) =>
          g.options.every((opt) => opt.isAvailable === false)
        );
        if (hasAnyOption && allOptionsSoldOut) return true;
      }
      return false;
    });
  }, [vendorItems]);

  const categories = useMemo(() => {
    const set = new Set(vendorItems.map((i) => i.category).filter(Boolean));
    return Array.from(set);
  }, [vendorItems]);

  const filteredItems = useMemo(() => {
    return vendorItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customizations?.some((c) =>
          c.options?.some((opt) => opt.name.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const isItemSoldOut =
        !item.isAvailable ||
        item.customizations?.some((c) => c.options?.some((opt) => opt.isAvailable === false));
      const matchesSoldOutFilter = !onlySoldOut || isItemSoldOut;
      return matchesSearch && matchesCategory && matchesSoldOutFilter;
    });
  }, [vendorItems, searchQuery, selectedCategory, onlySoldOut]);

  // Helper to get formatted display price (e.g. From ₹250 for variation-priced items)
  const getItemDisplayPrice = (item: MenuItem): string => {
    if (item.price > 0) return `₹${item.price}`;
    if (item.customizations && item.customizations.length > 0) {
      const validPrices = item.customizations
        .flatMap((g) => g.options)
        .map((o) => o.price)
        .filter((p) => typeof p === 'number' && p > 0);
      if (validPrices.length > 0) {
        return `From ₹${Math.min(...validPrices)}`;
      }
    }
    return '₹0';
  };

  // Toggle parent dish availability
  const handleToggleItem = (item: MenuItem) => {
    const newStatus = !item.isAvailable;
    toggleMenuItemAvailability(item.id, newStatus);
    toast({
      title: newStatus ? `${item.name} is In Stock 🟢` : `${item.name} marked Sold Out 🔴`,
      description: newStatus
        ? 'Customers can now order this item.'
        : 'Item hidden from active ordering on customer menus.',
    });
  };

  // Toggle individual customization option availability
  const handleToggleCustomizationOption = async (
    item: MenuItem,
    groupId: string,
    optionId: string
  ) => {
    if (!item.customizations) return;

    let changedOptionName = '';
    let newOptionStatus = true;

    const updatedCustomizations = item.customizations.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        options: group.options.map((opt) => {
          if (opt.id !== optionId) return opt;
          const currentAvailable = opt.isAvailable !== false;
          newOptionStatus = !currentAvailable;
          changedOptionName = opt.name;
          return {
            ...opt,
            isAvailable: newOptionStatus,
          };
        }),
      };
    });

    const updatedItem: MenuItem = {
      ...item,
      customizations: updatedCustomizations,
    };

    await updateMenuItem(updatedItem);

    toast({
      title: newOptionStatus ? `${changedOptionName} In Stock 🟢` : `${changedOptionName} Sold Out 🔴`,
      description: `Updated variation for ${item.name}.`,
    });
  };

  // Bulk restore all dishes and options in stock
  const handleRestoreAll = async () => {
    for (const item of vendorItems) {
      if (!item.isAvailable) {
        toggleMenuItemAvailability(item.id, true);
      }
      if (item.customizations && item.customizations.length > 0) {
        const hasSoldOutOption = item.customizations.some((g) =>
          g.options.some((o) => o.isAvailable === false)
        );
        if (hasSoldOutOption) {
          const restoredCustomizations = item.customizations.map((g) => ({
            ...g,
            options: g.options.map((o) => ({ ...o, isAvailable: true })),
          }));
          await updateMenuItem({ ...item, isAvailable: true, customizations: restoredCustomizations });
        }
      }
    }
    toast({
      title: 'All Items & Variations Restored 🟢',
      description: 'All menu items and options are now marked In Stock.',
    });
  };

  // Bulk toggle for current selected category
  const handleBulkCategoryToggle = async (status: boolean) => {
    if (selectedCategory === 'all') return;
    await setAllItemsAvailabilityInCategory(selectedCategory, status);
    toast({
      title: `${selectedCategory} ${status ? 'In Stock 🟢' : 'Sold Out 🔴'}`,
      description: `All items in ${selectedCategory} updated.`,
    });
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "h-8 px-2.5 rounded-full text-xs font-bold gap-1.5 transition-all cursor-pointer",
              soldOutItems.length > 0
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/25"
                : "hover:bg-muted"
            )}
          >
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Quick Stock</span>
            {soldOutItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-500 text-white">
                {soldOutItems.length} Sold Out
              </span>
            )}
          </Button>
        </SheetTrigger>
      )}

      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col h-full">
        {/* Drawer Header */}
        <SheetHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold shadow-xs">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold font-headline text-foreground">
                  Quick 86 / Stock Switcher
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  Instant stock toggles for dishes, custom sizes, and variations
                </SheetDescription>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center justify-between pt-3 text-xs">
            <div className="flex items-center gap-2 font-semibold">
              <span className="text-emerald-600 dark:text-emerald-400">
                🟢 {vendorItems.length - soldOutItems.length} In Stock
              </span>
              <span>•</span>
              <span className={cn(soldOutItems.length > 0 ? "text-red-500 font-bold" : "text-muted-foreground")}>
                🔴 {soldOutItems.length} Sold Out
              </span>
            </div>

            {soldOutItems.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestoreAll}
                className="h-7 px-2.5 text-xs text-primary hover:text-primary/80 font-bold gap-1 rounded-full bg-primary/10 hover:bg-primary/20"
              >
                <RotateCcw className="h-3 w-3" /> Restore All
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Search & Filter Controls */}
        <div className="p-4 space-y-3 border-b border-border/60 bg-card">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search all dishes, categories, or variations..."
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

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer",
                selectedCategory === 'all'
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground"
              )}
            >
              All ({vendorItems.length})
            </button>

            {/* Quick toggle for sold out only */}
            <button
              type="button"
              onClick={() => setOnlySoldOut(!onlySoldOut)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition-all border cursor-pointer",
                onlySoldOut
                  ? "bg-red-500 text-white border-red-500 shadow-xs"
                  : "bg-muted/30 text-muted-foreground border-border/60 hover:text-foreground"
              )}
            >
              Sold Out ({soldOutItems.length})
            </button>

            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-bold shrink-0 transition-all cursor-pointer",
                  selectedCategory === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Category Bulk Actions (when a specific category is selected) */}
          {selectedCategory !== 'all' && (
            <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground">
              <span>Category: <strong className="text-foreground">{selectedCategory}</strong></span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkCategoryToggle(true)}
                  className="h-6 px-2 text-[10px] rounded-full text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  All In Stock
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkCategoryToggle(false)}
                  className="h-6 px-2 text-[10px] rounded-full text-red-600 dark:text-red-400 border-red-500/30 hover:bg-red-500/10"
                >
                  All Sold Out
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Dishes List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isAvailable = item.isAvailable;
              const hasCustomizations = item.customizations && item.customizations.length > 0;
              const isExpanded = expandedItems[item.id] ?? false;

              // Calculate total and sold-out variation options
              const totalOptionsCount = hasCustomizations
                ? item.customizations!.reduce((acc, g) => acc + g.options.length, 0)
                : 0;
              const soldOutOptionsCount = hasCustomizations
                ? item.customizations!.reduce(
                    (acc, g) => acc + g.options.filter((o) => o.isAvailable === false).length,
                    0
                  )
                : 0;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "rounded-2xl border transition-all select-none overflow-hidden",
                    !isAvailable
                      ? "bg-red-500/5 dark:bg-red-950/20 border-red-500/30"
                      : "bg-card hover:bg-card/90 border-border/60 shadow-xs"
                  )}
                >
                  {/* Master Dish Row */}
                  <div className="flex items-center justify-between p-3.5">
                    {/* Left: Dish Info */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <span
                        className={cn(
                          "w-2.5 h-2.5 rounded-full shrink-0",
                          item.isVeg ? "bg-emerald-500" : "bg-red-500"
                        )}
                        title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"}
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p
                            className={cn(
                              "text-xs font-bold truncate leading-tight",
                              isAvailable ? "text-foreground" : "text-muted-foreground line-through"
                            )}
                          >
                            {item.name}
                          </p>
                          {hasCustomizations && (
                            <span className={cn(
                              "text-[9px] font-semibold px-1.5 py-0.2 rounded-full border",
                              soldOutOptionsCount > 0
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-bold"
                                : "bg-muted text-muted-foreground border-border/50"
                            )}>
                              {soldOutOptionsCount > 0 ? `${soldOutOptionsCount} Var. Out` : `${totalOptionsCount} Variations`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-extrabold text-foreground">
                            {getItemDisplayPrice(item)}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Master Stock Toggle & Expand Button */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2 py-0.5 rounded-full transition-all",
                          isAvailable
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : "bg-red-500/15 text-red-600 dark:text-red-400 font-extrabold"
                        )}
                      >
                        {isAvailable ? 'In Stock' : 'Sold Out'}
                      </span>
                      <Switch
                        checked={isAvailable}
                        onCheckedChange={() => handleToggleItem(item)}
                        aria-label={`Toggle availability for ${item.name}`}
                      />

                      {/* Expand Button for Customized Menus */}
                      {hasCustomizations && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.id)}
                          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                          title="Manage individual option stock"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Customization Options Sub-Shelf */}
                  {hasCustomizations && isExpanded && (
                    <div className="p-3 bg-muted/30 border-t border-border/50 space-y-3">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Layers className="h-3 w-3 text-primary" />
                        Customization Variations & Add-ons
                      </p>

                      {item.customizations!.map((group) => (
                        <div key={group.id} className="space-y-1.5">
                          <span className="text-[10px] font-semibold text-foreground">
                            {group.name} ({group.type})
                          </span>

                          <div className="space-y-1 pl-1.5">
                            {group.options.map((opt) => {
                              const isOptAvailable = opt.isAvailable !== false;

                              return (
                                <div
                                  key={opt.id}
                                  className={cn(
                                    "flex items-center justify-between p-2 rounded-xl border text-xs transition-all",
                                    isOptAvailable
                                      ? "bg-card border-border/50"
                                      : "bg-red-500/10 border-red-500/25 text-muted-foreground"
                                  )}
                                >
                                  <div className="flex items-center gap-2 min-w-0 pr-2">
                                    <span
                                      className={cn(
                                        "font-medium truncate text-xs",
                                        !isOptAvailable && "line-through text-muted-foreground"
                                      )}
                                    >
                                      {opt.name}
                                    </span>
                                    {opt.price > 0 && (
                                      <span className="text-[10px] font-bold text-muted-foreground">
                                        +₹{opt.price}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={cn(
                                        "text-[9px] font-bold px-1.5 py-0.2 rounded-full",
                                        isOptAvailable
                                          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                          : "text-red-600 dark:text-red-400 bg-red-500/15"
                                      )}
                                    >
                                      {isOptAvailable ? 'Available' : 'Sold Out'}
                                    </span>
                                    <Switch
                                      checked={isOptAvailable}
                                      onCheckedChange={() =>
                                        handleToggleCustomizationOption(item, group.id, opt.id)
                                      }
                                      disabled={!isAvailable}
                                      className="scale-75"
                                      aria-label={`Toggle availability for ${opt.name}`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-muted-foreground">
              <Utensils className="h-8 w-8 opacity-30 mb-2" />
              <p className="text-xs font-semibold text-foreground">No dishes found</p>
              <p className="text-[11px] mt-0.5">Try searching with a different keyword</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

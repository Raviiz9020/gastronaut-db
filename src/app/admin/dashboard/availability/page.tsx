
'use client';

import { useMemo, useState } from 'react';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import type { MenuItem, Category, Vendor } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Utensils, Share2, Copy, Star, Search, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import copy from 'copy-to-clipboard';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


type CategoryStatus = 'ALL_ON' | 'ALL_OFF' | 'MIXED';

const CategoryToggle = ({ status, onClick, disabled }: { status: CategoryStatus, onClick: () => void, disabled?: boolean }) => {
    const getStatusProps = () => {
        switch(status) {
            case 'ALL_ON':
                return { text: 'All', className: 'bg-green-500/80 text-white hover:bg-green-500/70 border-green-600' };
            case 'ALL_OFF':
                return { text: 'All', className: 'bg-red-500/80 text-white hover:bg-red-500/70 border-red-600' };
            case 'MIXED':
            default:
                return { text: 'Few', className: 'bg-yellow-500/80 text-black hover:bg-yellow-500/70 border-yellow-600' };
        }
    }
    const { text, className } = getStatusProps();
    
    return (
        <Badge
            variant="outline"
            className={cn("transition-all text-sm border py-1.5 px-3", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer", className)}
            onClick={() => !disabled && onClick()}
        >
            {text}
        </Badge>
    );
};


const AvailabilityCard = ({ items, category, vendor, onToggleItem, onToggleCategory, onTogglePopular, disabled }: {
    items: MenuItem[];
    category: Category;
    vendor: Vendor | null;
    onToggleItem: (itemId: string, newStatus: boolean) => void;
    onToggleCategory: (categoryId: string, currentStatus: CategoryStatus) => void;
    onTogglePopular: (itemId: string) => void;
    disabled?: boolean;
}) => {
    const { toast } = useToast();
    
    const categoryStatus: CategoryStatus = useMemo(() => {
        if (items.length === 0) return 'ALL_OFF';
        const allOn = items.every(item => item.isAvailable);
        if (allOn) return 'ALL_ON';
        const allOff = items.every(item => !item.isAvailable);
        if (allOff) return 'ALL_OFF';
        return 'MIXED';
    }, [items]);
    
    const handleCategoryClick = () => {
        onToggleCategory(category.id, categoryStatus);
    }
    
    const handleCopyLink = (type: 'item' | 'category', value: string, itemIdentifier?: string) => {
        if (!vendor) return;
        
        let url = '';

        if (type === 'category') {
            const vendorIdentifier = vendor.slug || vendor.username;
            url = `${window.location.origin}/menu?vendor=${vendorIdentifier}&category=${encodeURIComponent(value)}`;
        } else if (itemIdentifier) {
            // Use the item's document ID for a direct link
            url = `${window.location.origin}/menu?item=${itemIdentifier}`;
        } else {
             toast({
                title: "Error",
                description: "Could not generate a link for this item.",
                variant: 'destructive'
            });
            return;
        }

        copy(url);
        toast({
            title: "Link Copied!",
            description: `The shareable link for this ${type} has been copied.`
        });
    }

    return (
        <Card className="rounded-2xl flex flex-col">
            <CardHeader className="p-4 border-b">
                <div className="flex justify-between items-center">
                     <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-semibold">{category.name}</CardTitle>
                        <TooltipProvider>
                            <Tooltip delayDuration={0}>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCopyLink('category', category.name)}>
                                        <Copy className="h-4 w-4 text-muted-foreground"/>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Copy link for all items in this category</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                        <CategoryToggle status={categoryStatus} onClick={handleCategoryClick} disabled={disabled}/>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <ul className="space-y-4">
                    {items.map(item => (
                        <li key={item.id} className="flex items-center justify-between gap-2 text-sm">
                           <div className="flex items-center gap-3">
                               <Checkbox
                                    id={`popular-${item.id}`}
                                    checked={item.isPopular}
                                    onCheckedChange={() => !disabled && onTogglePopular(item.id)}
                                    className="rounded-full h-5 w-5"
                                    disabled={disabled}
                                />
                               <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                                   <Image src={item.image || 'https://placehold.co/100x100.png'} alt={item.name} fill className="object-cover" />
                               </div>
                               <span className="font-medium">{item.name}</span>
                               <TooltipProvider>
                                    <Tooltip delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyLink('item', item.name, item.id)}>
                                                <Share2 className="h-3 w-3 text-muted-foreground"/>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Copy link to this item</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                           </div>
                           <Switch 
                                checked={item.isAvailable} 
                                onCheckedChange={(checked) => !disabled && onToggleItem(item.id, checked)}
                                disabled={disabled}
                           />
                        </li>
                    ))}
                </ul>
                {items.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground">No items match your search.</p>
                )}
            </CardContent>
        </Card>
    );
};

export default function AvailabilityPage() {
    const { menuItems, categories, setAllItemsAvailabilityInCategory, toggleMenuItemAvailability, toggleMenuItemPopularity } = useMenu();
    const { vendor } = useVendor();

    const [activeTab, setActiveTab] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    const isMenuEditDisabled = !!vendor?.isMenuEditDisabled;

    const vendorMenuItems = useMemo(() => {
        if (!vendor) return [];
        return menuItems.filter(item => item.vendorUsername === vendor.username);
    }, [menuItems, vendor]);
    
    const filteredMenuItems = useMemo(() => {
        if (!searchQuery) return vendorMenuItems;
        const lowercasedQuery = searchQuery.toLowerCase();
        return vendorMenuItems.filter(item => item.name.toLowerCase().includes(lowercasedQuery));
    }, [vendorMenuItems, searchQuery]);

    const vendorCategories = useMemo(() => {
        if (!vendor) return [];
        const itemCategoryNames = new Set(vendorMenuItems.map(item => item.category));
        const relevantCategories = categories.filter(cat => 
            (cat.shopName === 'global' || cat.shopName === vendor.shopName) &&
            itemCategoryNames.has(cat.name)
        );
        if (relevantCategories.length > 0 && !activeTab) {
            setActiveTab(relevantCategories[0].id);
        }
        return relevantCategories;
    }, [vendor, vendorMenuItems, categories, activeTab]);

    const itemsByCategory = (categoryId: string) => {
        const category = vendorCategories.find(c => c.id === categoryId);
        if (!category) return [];
        return filteredMenuItems.filter(item => item.category === category.name);
    }
    
    const handleToggleCategory = (categoryId: string, currentStatus: CategoryStatus) => {
        if (isMenuEditDisabled) return;
        const category = vendorCategories.find(c => c.id === categoryId);
        if(!category) return;
        
        // If it's all on, the next state is all off. Otherwise, the next state is all on.
        const newStatus = currentStatus === 'ALL_ON' ? false : true;
        setAllItemsAvailabilityInCategory(category.name, newStatus);
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Menu Availability</h2>
            </div>
            
            {isMenuEditDisabled ? (
                <Alert className="bg-blue-50 border-blue-200">
                    <Info className="h-4 w-4 text-blue-500" />
                    <AlertTitle className="text-blue-700">View Only Mode</AlertTitle>
                    <AlertDescription className="text-blue-600">
                        Menu management is currently restricted for this demo account to maintain platform integrity.
                    </AlertDescription>
                </Alert>
            ) : (
                <p className="text-muted-foreground">
                    Quickly toggle availability for entire categories or individual items. Use the checkbox to mark an item as a "Popular Pick".
                </p>
            )}

            <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search your menu..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>


            {vendorCategories.length > 0 ? (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                     <div className="pb-2 mb-4">
                        <TabsList className="h-auto flex-wrap justify-start bg-transparent p-0">
                            {vendorCategories.map(cat => (
                                <TabsTrigger key={cat.id} value={cat.id} className="m-1 rounded-full data-[state=active]:shadow-sm h-10 w-auto px-4">
                                    {cat.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>

                    <div className="mt-4">
                        {vendorCategories.map(cat => (
                            <TabsContent key={cat.id} value={cat.id} className="mt-0">
                                <AvailabilityCard 
                                    items={itemsByCategory(cat.id)}
                                    category={cat}
                                    vendor={vendor}
                                    onToggleItem={toggleMenuItemAvailability}
                                    onToggleCategory={handleToggleCategory}
                                    onTogglePopular={toggleMenuItemPopularity}
                                    disabled={isMenuEditDisabled}
                                />
                            </TabsContent>
                        ))}
                    </div>
                </Tabs>
            ) : (
                <div className="text-center py-16 flex flex-col items-center gap-4 border-dashed border-2 rounded-2xl">
                    <Utensils className="h-12 w-12 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">No Menu Items Found</h3>
                    <p className="text-muted-foreground">Add items to your menu to manage their availability here.</p>
                </div>
            )}
        </div>
    );
}

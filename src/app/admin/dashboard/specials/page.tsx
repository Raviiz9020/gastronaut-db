
'use client';

import { useState, useMemo } from 'react';
import { useSpecialMenu } from '@/context/special-menu-context';
import { useMenu } from '@/context/menu-context';
import { useVendor } from '@/context/vendor-context';
import type { SpecialMenu, SpecialMenuType, MenuItem, Vendor } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Utensils, Sparkles, Copy, Share2, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SpecialMenuForm from './special-menu-form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import ConfirmationDialog from '@/components/confirmation-dialog';
import Image from 'next/image';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import copy from 'copy-to-clipboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const menuTypes: SpecialMenuType[] = ['Breakfast', 'Lunch', 'Dinner', 'Evening Snacks'];

const SpecialMenuCard = ({ special, menuItems, vendor, onEdit, onToggle, onDelete, disabled }: { 
  special: SpecialMenu;
  menuItems: MenuItem[];
  vendor?: Vendor | null;
  onEdit: (special: SpecialMenu) => void;
  onToggle: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  disabled?: boolean;
}) => {
  const { toast } = useToast();
  const itemsInSpecial = useMemo(() => {
    return special.itemIds.map(id => menuItems.find(item => item.id === id)).filter(Boolean) as MenuItem[];
  }, [special.itemIds, menuItems]);

  const allItemsUnavailable = useMemo(() => {
    if (itemsInSpecial.length === 0) return true; // No items, can't be active
    return itemsInSpecial.every(item => !item.isAvailable);
  }, [itemsInSpecial]);

  const handleCopyLink = () => {
    if (!vendor) return;
    const identifier = vendor.slug || vendor.username;
    const url = `${window.location.origin}/specials?vendor=${identifier}&type=${special.type}`;
    copy(url);
    toast({
        title: "Link Copied!",
        description: "The shareable link for this special has been copied to your clipboard."
    });
  }

  return (
    <Card className="rounded-2xl flex flex-col">
      <CardHeader>
        <CardTitle className="text-xl">
            {special.title}
        </CardTitle>
        {vendor?.shopName && <p className="text-sm text-muted-foreground -mt-1">by {vendor.shopName}</p>}
        <div className="flex items-center gap-2 pt-2">
            <Switch
                id={`switch-${special.id}`}
                checked={special.isActive}
                onCheckedChange={() => onToggle(special.id, special.isActive)}
                disabled={allItemsUnavailable || disabled}
            />
            <Label htmlFor={`switch-${special.id}`}>{special.isActive ? 'Active' : 'Inactive'}</Label>
            {allItemsUnavailable && <p className="text-xs text-destructive">(All items unavailable)</p>}
        </div>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        <p className="font-semibold text-sm">Items in this special:</p>
        <ul className="space-y-2">
            {itemsInSpecial.map(item => (
                <li key={item.id} className="flex items-center gap-2 text-xs">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden">
                       <Image src={item.image || 'https://placehold.co/100x100.png'} alt={item.name} fill className="object-cover" />
                    </div>
                    <span>{item.name}</span>
                </li>
            ))}
        </ul>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
         <Button variant="secondary" size="icon" onClick={handleCopyLink} title="Copy shareable link">
            <Copy className="h-4 w-4"/>
         </Button>
         <Button variant="outline" size="icon" onClick={() => onEdit(special)} disabled={disabled}>
             <Edit className="h-4 w-4"/>
         </Button>
         <Button variant="destructive" size="icon" onClick={() => onDelete(special.id)} disabled={disabled}>
             <Trash2 className="h-4 w-4"/>
         </Button>
      </CardFooter>
    </Card>
  )
}

export default function AdminSpecialsPage() {
  const { specialMenus, toggleSpecialMenuStatus, removeSpecialMenu } = useSpecialMenu();
  const { menuItems } = useMenu();
  const { vendor } = useVendor();
  const { toast } = useToast();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSpecial, setSelectedSpecial] = useState<SpecialMenu | null>(null);
  const [specialToDelete, setSpecialToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SpecialMenuType>('Breakfast');

  const isMenuEditDisabled = !!vendor?.isMenuEditDisabled;

  const vendorMenuItems = useMemo(() => {
    if (!vendor) return [];
    return menuItems.filter(item => item.vendorUsername === vendor.username);
  }, [menuItems, vendor]);

  const vendorSpecials = useMemo(() => {
    if (!vendor) return [];
    return specialMenus.filter(special => special.vendorUsername === vendor.username);
  }, [specialMenus, vendor]);

  const specialsByType = (type: SpecialMenuType) => {
    return vendorSpecials.filter(s => s.type === type);
  }

  const handleAddNew = () => {
    setSelectedSpecial(null);
    setIsFormOpen(true);
  }

  const handleEdit = (special: SpecialMenu) => {
    setSelectedSpecial(special);
    setIsFormOpen(true);
  }

  const handleDeleteConfirm = async () => {
    if (specialToDelete) {
        await removeSpecialMenu(specialToDelete);
        setSpecialToDelete(null);
    }
  }

  const handleCopyFullMenuLink = () => {
    if (!vendor) return;
    const identifier = vendor.slug || vendor.username;
    const url = `${window.location.origin}/vendor/${identifier}`;
    copy(url);
    toast({
        title: "Menu Link Copied!",
        description: "The shareable link for your full menu has been copied."
    });
  }

  const isAddDisabled = !vendor?.isApproved || isMenuEditDisabled;

  const getTooltipContent = () => {
    if (isMenuEditDisabled) return "Menu editing is disabled for this account.";
    if (!vendor?.isApproved) {
        return "Your account needs admin approval to add specials.";
    }
    return "";
  }

  const AddButton = () => (
    <Button onClick={handleAddNew} size="sm" className="rounded-full" disabled={isAddDisabled}>
        <PlusCircle className="mr-2 h-4 w-4" /> Add
    </Button>
  );


  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manage Specials</h2>
       </div>

       {isMenuEditDisabled && (
            <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertTitle className="text-blue-700">View Only Mode</AlertTitle>
                <AlertDescription className="text-blue-600">
                    Specials management is currently restricted for this demo account to maintain platform integrity.
                </AlertDescription>
            </Alert>
       )}

        <div className="flex items-center gap-2">
            <Button onClick={handleCopyFullMenuLink} variant="outline" size="sm" className="rounded-full">
                <Share2 className="mr-2 h-4 w-4"/>
                All Menu
            </Button>
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

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SpecialMenuType)} className="w-full">
            <TabsList className="h-auto flex-wrap justify-center bg-transparent p-0">
                {menuTypes.map(type => (
                    <TabsTrigger key={type} value={type} className="m-1 rounded-full data-[state=active]:shadow-sm h-auto px-4 py-2 text-sm sm:text-base">
                        {type}
                    </TabsTrigger>
                ))}
            </TabsList>

            {menuTypes.map(type => (
                <TabsContent key={type} value={type}>
                    <Card className="rounded-3xl mt-4">
                        <CardHeader>
                             <CardDescription>Curated list of items for {type.toLowerCase()}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {specialsByType(type).length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {specialsByType(type).map(special => (
                                    <SpecialMenuCard 
                                      key={special.id}
                                      special={special}
                                      menuItems={vendorMenuItems}
                                      vendor={vendor}
                                      onEdit={handleEdit}
                                      onToggle={toggleSpecialMenuStatus}
                                      onDelete={setSpecialToDelete}
                                      disabled={isMenuEditDisabled}
                                    />
                                  ))}
                                </div>
                            ) : (
                                <div className="text-center py-16 flex flex-col items-center gap-4 border-dashed border-2 rounded-2xl">
                                    <Sparkles className="h-12 w-12 text-muted-foreground" />
                                    <h3 className="text-xl font-semibold">No {type} Specials Yet</h3>
                                    <p className="text-muted-foreground">Click "Add New Special" to create one.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            ))}
        </Tabs>
      
      <SpecialMenuForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        specialMenu={selectedSpecial}
        vendorMenuItems={vendorMenuItems}
        defaultMenuType={activeTab}
      />

       <ConfirmationDialog
        isOpen={!!specialToDelete}
        onOpenChange={(isOpen) => !isOpen && setSpecialToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete this special menu."
      />
    </div>
  )
}

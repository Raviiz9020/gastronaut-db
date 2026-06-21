'use client';

import { useState, useEffect, useMemo, useTransition } from 'react';
import { useVendor } from '@/context/vendor-context';
import { useOrder } from '@/context/order-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Edit, Trash2, Building, Package, Calendar, CheckCircle, XCircle, FileSpreadsheet, Gift, Utensils, Mail, TrendingUp, Sparkles, KeyRound, Award, Upload, BarChart2, Download, ShieldCheck } from 'lucide-react';
import type { Vendor, Order, CartItem, MenuItem } from '@/types';
import VendorForm from './vendor-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import RewardsConfigDialog from './rewards-config-dialog';
import BulkUploadDialog from './bulk-upload-dialog';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
import { useMenu } from '@/context/menu-context';


interface VendorStats {
    orderCount: number;
    topItems: { name: string; quantity: number }[];
}

const VendorCard = ({ 
    vendor, 
    stats,
    menuItems,
    onFetchDetails,
    isFetchingDetails,
    onEdit, 
    onDelete, 
    onToggleApproval, 
    onToggleGbp, 
    onToggleExpenseTracking, 
    onToggleOfferCreation, 
    onToggleDineIn, 
    onToggleAiAssistant, 
    onToggleAccountLinking, 
    onToggleRewards, 
    onBulkUpload,
    onToggleDemo,
    onToggleMenuRestriction,
    onToggleInventory
}: { 
    vendor: Vendor, 
    stats: VendorStats | null,
    menuItems: MenuItem[],
    onFetchDetails: (username: string) => void,
    isFetchingDetails: boolean,
    onEdit: (v: Vendor) => void,
    onDelete: (username: string) => void,
    onToggleApproval: (username: string) => void,
    onToggleGbp: (username: string, currentStatus: boolean) => void,
    onToggleExpenseTracking: (username: string, currentStatus: boolean) => void,
    onToggleOfferCreation: (username: string, currentStatus: boolean) => void,
    onToggleDineIn: (username: string, currentStatus: boolean) => void,
    onToggleAiAssistant: (username: string, currentStatus: boolean) => void
    onToggleAccountLinking: (username: string, currentStatus: boolean) => void
    onToggleRewards: (vendor: Vendor) => void;
    onBulkUpload: (vendor: Vendor) => void;
    onToggleDemo: (username: string, currentStatus: boolean) => void;
    onToggleMenuRestriction: (username: string, currentStatus: boolean) => void;
    onToggleInventory: (username: string, currentStatus: boolean) => void;
}) => {
    
  const getDaysSinceOnboarded = (createdAt: string | undefined) => {
    if (!createdAt) return 'N/A';
    const onboardDate = new Date(createdAt);
    const days = differenceInDays(new Date(), onboardDate);
    if (days < 0) return 'Future Date';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days ago`;
  };

  const handleDownloadMenu = () => {
    const vendorItems = menuItems.filter(item => item.vendorUsername === vendor.username);
    if (vendorItems.length === 0) {
        alert("This vendor has no menu items to download.");
        return;
    }

    const headers = [
        "id", "name", "description", "price", "discountPrice", "isDiscountActive",
        "category", "isVeg", "isAvailable", "isPopular", "image", "imageDataUrl",
        "blurDataUrl", "aiHint", "slug", "customizations", "totalRatingSum", "ratingCount"
    ];
    
    const csvRows = [headers.join(",")];

    const escapeCsvField = (field: any): string => {
        if (field === null || field === undefined) {
            return "";
        }
        const stringField = String(field);
        // If the field contains a comma, double quote, or newline, wrap it in double quotes.
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            // Also, escape any existing double quotes by doubling them up.
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    vendorItems.forEach(item => {
        const row = headers.map(header => {
            let value;
            if (header === 'customizations') {
                // Serialize the customizations array to a JSON string
                value = item.customizations ? JSON.stringify(item.customizations) : "";
            } else {
                value = (item as any)[header];
            }
            return escapeCsvField(value);
        });
        csvRows.push(row.join(','));
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `menu_export_${vendor.username}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="rounded-3xl flex flex-col">
        <CardHeader>
            <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Building className="h-5 w-5 text-destructive" />
                    {vendor.shopName || vendor.name}
                </CardTitle>
                 <div className="flex gap-2">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleDownloadMenu}>
                        <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onBulkUpload(vendor)}>
                        <Upload className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onEdit(vendor)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        className="h-8 w-8 text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                        onClick={() => onDelete(vendor.username)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <CardDescription className="text-xs">{vendor.name}</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 space-y-4 text-sm">
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Onboarded</span>
                </div>
                <span className="font-bold">{getDaysSinceOnboarded(vendor.createdAt)}</span>
            </div>
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>Campaigns</span>
                </div>
                {vendor.emailPreferences?.campaigns ?? true ? (
                    <CheckCircle className="h-5 w-5 text-green-500" title="Subscribed"/>
                ) : (
                    <XCircle className="h-5 w-5 text-destructive" title="Unsubscribed"/>
                )}
            </div>
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.isApproved ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span>Approved</span>
                </div>
                <Switch
                    id={`approval-switch-${vendor.username}`}
                    checked={vendor.isApproved}
                    onCheckedChange={() => onToggleApproval(vendor.username)}
                />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.isAccountLinkingEnabled ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span className="text-xs">Account Linking</span>
                </div>
                <Switch
                    id={`accountlink-switch-${vendor.username}`}
                    checked={vendor.isAccountLinkingEnabled ?? false}
                    onCheckedChange={() => onToggleAccountLinking(vendor.username, vendor.isAccountLinkingEnabled ?? false)}
                />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.isInventory ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span className="text-xs">Inventory</span>
                </div>
                <Switch
                    id={`inventory-switch-${vendor.username}`}
                    checked={vendor.isInventory ?? false}
                    onCheckedChange={() => onToggleInventory(vendor.username, vendor.isInventory ?? false)}
                />
            </div>
             <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.isGbpEnabled ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span>GBP Enabled</span>
                </div>
                <Switch
                    id={`gbp-switch-${vendor.username}`}
                    checked={vendor.isGbpEnabled ?? false}
                    onCheckedChange={() => onToggleGbp(vendor.username, vendor.isGbpEnabled ?? false)}
                />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.isAiAssistantEnabled ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span>AI Assistant</span>
                </div>
                <Switch
                    id={`ai-switch-${vendor.username}`}
                    checked={vendor.isAiAssistantEnabled ?? false}
                    onCheckedChange={() => onToggleAiAssistant(vendor.username, vendor.isAiAssistantEnabled ?? false)}
                />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.isExpenseTrackingEnabled ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span>Expenses</span>
                </div>
                <Switch
                    id={`expense-switch-${vendor.username}`}
                    checked={vendor.isExpenseTrackingEnabled ?? false}
                    onCheckedChange={() => onToggleExpenseTracking(vendor.username, vendor.isExpenseTrackingEnabled ?? false)}
                />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.isOfferCreationEnabled ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span>Offers</span>
                </div>
                <Switch
                    id={`offer-switch-${vendor.username}`}
                    checked={vendor.isOfferCreationEnabled ?? false}
                    onCheckedChange={() => onToggleOfferCreation(vendor.username, vendor.isOfferCreationEnabled ?? false)}
                />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.canAcceptDineIn ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span>Dine-In</span>
                </div>
                <Switch
                    id={`dinein-switch-${vendor.username}`}
                    checked={vendor.canAcceptDineIn ?? true}
                    onCheckedChange={() => onToggleDineIn(vendor.username, vendor.canAcceptDineIn ?? true)}
                />
            </div>
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                    {vendor.isRewardsEnabled ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-destructive"/>}
                    <span>Rewards</span>
                     {vendor.isRewardsEnabled && vendor.rewardsConfig && (
                        <span className="text-xs font-mono bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">
                            ₹{vendor.rewardsConfig.spend} → {vendor.rewardsConfig.points} HP
                        </span>
                    )}
                </div>
                <Switch
                    id={`rewards-switch-${vendor.username}`}
                    checked={vendor.isRewardsEnabled ?? false}
                    onCheckedChange={() => onToggleRewards(vendor)}
                />
            </div>

            <Separator className="my-2"/>
            <div className="bg-muted/30 p-3 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        {vendor.isDemoAccount ? <CheckCircle className="h-4 w-4 text-green-500"/> : <XCircle className="h-4 w-4 text-muted-foreground"/>}
                        <span className="text-xs font-semibold">Mark as Demo</span>
                    </div>
                    <Switch
                        id={`demo-switch-${vendor.username}`}
                        checked={vendor.isDemoAccount ?? false}
                        onCheckedChange={() => onToggleDemo(vendor.username, vendor.isDemoAccount ?? false)}
                    />
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        {vendor.isMenuEditDisabled ? <ShieldCheck className="h-4 w-4 text-destructive"/> : <Utensils className="h-4 w-4 text-green-500"/>}
                        <span className="text-xs font-semibold">Restrict Menu</span>
                    </div>
                    <Switch
                        id={`menurestrict-switch-${vendor.username}`}
                        checked={vendor.isMenuEditDisabled ?? false}
                        onCheckedChange={() => onToggleMenuRestriction(vendor.username, vendor.isMenuEditDisabled ?? false)}
                    />
                </div>
            </div>
            
            <Separator className="my-4"/>

            <div className="space-y-2">
                {!stats ? (
                    <Button onClick={() => onFetchDetails(vendor.username)} disabled={isFetchingDetails} className="w-full" variant="secondary">
                        {isFetchingDetails ? <Loader2 className="h-4 w-4 animate-spin"/> : <BarChart2 className="h-4 w-4 mr-2"/>}
                        {isFetchingDetails ? 'Loading...' : 'Fetch Details'}
                    </Button>
                ) : (
                    <>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Package className="h-4 w-4" />
                        <span className="flex-1">Total Orders</span>
                        <span className="font-bold text-foreground">{stats.orderCount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-semibold flex-1">Top 5 Selling Items</span>
                    </div>
                    {stats.topItems.length > 0 ? (
                        <ul className="space-y-1 text-xs">
                            {stats.topItems.map(item => (
                                <li key={item.name} className="flex justify-between">
                                    <span className="truncate pr-2">{item.name}</span>
                                    <span className="font-bold shrink-0">{item.quantity}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-xs text-center text-muted-foreground">No completed orders yet.</p>
                    )}
                    </>
                )}
            </div>
        </CardContent>
    </Card>
  )
}


export default function SuperAdminDashboardPage() {
  const { 
    allVendors, 
    fetchAllVendors,
    removeVendor, 
    toggleVendorApproval, 
    toggleVendorGbpStatus, 
    toggleVendorExpenseTracking, 
    toggleVendorOfferCreation, 
    toggleDineInStatus, 
    toggleAiAssistantStatus, 
    toggleAccountLinkingStatus, 
    toggleVendorRewards,
    toggleVendorDemoStatus,
    toggleMenuEditRestriction,
    toggleInventoryStatus
  } = useVendor();
  const { menuItems, fetchAllItems } = useMenu();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
  const [isRewardsConfigOpen, setIsRewardsConfigOpen] = useState(false);
  const [rewardsVendor, setRewardsVendor] = useState<Vendor | null>(null);
  const [vendorStats, setVendorStats] = useState<Record<string, VendorStats>>({});
  const [fetchingDetailsFor, setFetchingDetailsFor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
        setIsLoading(true);
        await Promise.all([
            fetchAllVendors(),
            fetchAllItems()
        ]);
        setIsLoading(false);
    }
    loadInitialData();
  }, [fetchAllVendors, fetchAllItems]);
  
  const handleFetchDetails = async (vendorUsername: string) => {
    setFetchingDetailsFor(vendorUsername);
    try {
        const ordersQuery = query(collection(db, 'orders'), where('vendorUsername', '==', vendorUsername));
        const ordersSnapshot = await getDocs(ordersQuery);
        const vendorOrders = ordersSnapshot.docs.map(doc => doc.data() as Order);

        const completedOrders = vendorOrders.filter(order => order.status === 'Delivered' || order.status === 'Picked Up');
        
        const itemCounts: Record<string, number> = {};
        completedOrders.forEach(order => {
            order.items.forEach(item => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
            });
        });

        const topItems = Object.entries(itemCounts)
            .map(([name, quantity]) => ({ name, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
        
        setVendorStats(prev => ({
            ...prev,
            [vendorUsername]: {
                orderCount: vendorOrders.length,
                topItems,
            }
        }));

    } catch (e) {
        console.error("Error fetching vendor details:", e);
        toast({ title: 'Error', description: "Could not fetch vendor's order data." });
    } finally {
        setFetchingDetailsFor(null);
    }
  };

  const handleAddNew = () => {
    setSelectedVendor(null);
    setIsFormOpen(true);
  };

  const handleEdit = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsFormOpen(true);
  };

  const handleBulkUpload = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsBulkUploadOpen(true);
  };
  
  const handleDeleteConfirm = async (username: string) => {
    await removeVendor(username);
    setVendorToDelete(null);
  };

  const handleApprovalToggle = async (username: string) => {
    await toggleVendorApproval(username);
  }
  
  const handleGbpToggle = async (username: string, currentStatus: boolean) => {
    await toggleVendorGbpStatus(username, currentStatus);
  }

  const handleExpenseTrackingToggle = async (username: string, currentStatus: boolean) => {
    await toggleVendorExpenseTracking(username, currentStatus);
  }
  
  const handleOfferCreationToggle = async (username: string, currentStatus: boolean) => {
    await toggleVendorOfferCreation(username, currentStatus);
  }

  const handleDineInToggle = async (username: string, currentStatus: boolean) => {
      await toggleDineInStatus(username, currentStatus);
  }
  
  const handleAiAssistantToggle = async (username: string, currentStatus: boolean) => {
    await toggleAiAssistantStatus(username, currentStatus);
  };

  const handleAccountLinkingToggle = async (username: string, currentStatus: boolean) => {
      await toggleAccountLinkingStatus(username, currentStatus);
  }

  const handleRewardsToggle = (vendor: Vendor) => {
    if (!vendor.isRewardsEnabled) {
      setRewardsVendor(vendor);
      setIsRewardsConfigOpen(true);
    } else {
      toggleVendorRewards(vendor.username, false);
    }
  };
  
  const handleRewardsConfigSave = async (config: { spend: number, points: number}) => {
    if (rewardsVendor) {
      await toggleVendorRewards(rewardsVendor.username, true, config);
    }
    setIsRewardsConfigOpen(false);
    setRewardsVendor(null);
  };


  const onFormClose = (isOpen: boolean) => {
    setIsFormOpen(isOpen);
  }
  

  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manage Vendors</h2>
          <Button
            onClick={handleAddNew}
            size="sm"
            className="rounded-full text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
          >
            <PlusCircle className="mr-2 h-4 w-4"/>
            Add
          </Button>
       </div>
       
        {isLoading ? (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin"/>
            </div>
        ) : allVendors.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {allVendors.map(vendor => (
                  <VendorCard 
                    key={vendor.username} 
                    vendor={vendor} 
                    stats={vendorStats[vendor.username] || null}
                    menuItems={menuItems}
                    onFetchDetails={handleFetchDetails}
                    isFetchingDetails={fetchingDetailsFor === vendor.username}
                    onEdit={handleEdit}
                    onDelete={setVendorToDelete}
                    onToggleApproval={handleApprovalToggle}
                    onToggleGbp={handleGbpToggle}
                    onToggleExpenseTracking={handleExpenseTrackingToggle}
                    onToggleOfferCreation={handleOfferCreationToggle}
                    onToggleDineIn={handleDineInToggle}
                    onToggleAiAssistant={handleAiAssistantToggle}
                    onToggleAccountLinking={handleAccountLinkingToggle}
                    onToggleRewards={handleRewardsToggle}
                    onBulkUpload={handleBulkUpload}
                    onToggleDemo={toggleVendorDemoStatus}
                    onToggleMenuRestriction={toggleMenuEditRestriction}
                    onToggleInventory={toggleInventoryStatus}
                  />
              ))}
            </div>
        ) : (
            <div className="text-center py-16 text-muted-foreground">
                <p>No vendors found.</p>
            </div>
        )}

      <VendorForm
        isOpen={isFormOpen}
        onOpenChange={onFormClose}
        vendor={selectedVendor}
      />
      
      <BulkUploadDialog
        isOpen={isBulkUploadOpen}
        onOpenChange={setIsBulkUploadOpen}
        vendor={selectedVendor}
      />

      <RewardsConfigDialog
        isOpen={isRewardsConfigOpen}
        onOpenChange={setIsRewardsConfigOpen}
        onSave={handleRewardsConfigSave}
        vendor={rewardsVendor}
      />

      <ConfirmationDialog
        isOpen={!!vendorToDelete}
        onOpenChange={(isOpen) => !isOpen && setVendorToDelete(null)}
        onConfirm={() => vendorToDelete && handleDeleteConfirm(vendorToDelete)}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete the vendor and all their associated data."
      />
    </div>
  );
}

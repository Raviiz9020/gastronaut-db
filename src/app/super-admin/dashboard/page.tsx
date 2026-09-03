'use client';

import { useState, useEffect, useMemo } from 'react';
import { useVendor } from '@/context/vendor-context';
import { useOrder } from '@/context/order-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  PlusCircle,
  Edit,
  Trash2,
  Building,
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  FileSpreadsheet,
  Gift,
  Utensils,
  Mail,
  TrendingUp,
  Sparkles,
  Award,
  Upload,
  BarChart2,
  Download,
  ShieldCheck,
  BadgePercent,
  Search,
  Check,
  X,
  Store,
  Layers,
  Activity,
  SlidersHorizontal,
  ChevronDown,
  User,
  Zap,
  ShieldAlert,
  Percent,
  IndianRupee,
  Flame,
  CheckCircle2,
  Clock,
  Loader2,
  Settings2,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import type { Vendor, Order, CartItem, MenuItem } from '@/types';
import VendorForm from './vendor-form';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInDays } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import RewardsConfigDialog from './rewards-config-dialog';
import CommissionConfigDialog from './commission-config-dialog';
import BulkUploadDialog from './bulk-upload-dialog';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useMenu } from '@/context/menu-context';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';

interface VendorStats {
  orderCount: number;
  topItems: { name: string; quantity: number }[];
}

// Vendor Feature Management Modal
const VendorFeaturesDialog = ({
  vendor,
  open,
  onOpenChange,
  onToggleApproval,
  onToggleGbp,
  onToggleExpenseTracking,
  onToggleOfferCreation,
  onToggleDineIn,
  onToggleAiAssistant,
  onToggleAccountLinking,
  onToggleRewards,
  onToggleCommission,
  onToggleDemo,
  onToggleMenuRestriction,
  onToggleInventory
}: {
  vendor: Vendor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleApproval: (username: string) => void;
  onToggleGbp: (username: string, currentStatus: boolean) => void;
  onToggleExpenseTracking: (username: string, currentStatus: boolean) => void;
  onToggleOfferCreation: (username: string, currentStatus: boolean) => void;
  onToggleDineIn: (username: string, currentStatus: boolean) => void;
  onToggleAiAssistant: (username: string, currentStatus: boolean) => void;
  onToggleAccountLinking: (username: string, currentStatus: boolean) => void;
  onToggleRewards: (vendor: Vendor) => void;
  onToggleCommission: (vendor: Vendor) => void;
  onToggleDemo: (username: string, currentStatus: boolean) => void;
  onToggleMenuRestriction: (username: string, currentStatus: boolean) => void;
  onToggleInventory: (username: string, currentStatus: boolean) => void;
}) => {
  if (!vendor) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto rounded-3xl p-6 border border-border/80 bg-card">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Building className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-headline break-words">
                {vendor.shopName || vendor.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {vendor.shopName && vendor.name && vendor.shopName.trim().toLowerCase() !== vendor.name.trim().toLowerCase() ? `Owner: ${vendor.name} • ` : ''}
                Manage capabilities, permissions, and feature flags
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Group 1: Core Operations */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" />
              <span>Core Operations</span>
            </h4>
            <div className="space-y-1.5 bg-muted/30 p-3 rounded-2xl border border-border/50">
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Store Live & Approved</span>
                  <span className="text-[11px] text-muted-foreground">Allows store to accept customer orders</span>
                </div>
                <Switch
                  checked={vendor.isApproved}
                  onCheckedChange={() => onToggleApproval(vendor.username)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Dine-In Tables & Floor POS</span>
                  <span className="text-[11px] text-muted-foreground">Enables table occupancy & counter ordering</span>
                </div>
                <Switch
                  checked={vendor.canAcceptDineIn ?? true}
                  onCheckedChange={() => onToggleDineIn(vendor.username, vendor.canAcceptDineIn ?? true)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Stock Inventory Tracking</span>
                  <span className="text-[11px] text-muted-foreground">Track available portions and out-of-stock</span>
                </div>
                <Switch
                  checked={vendor.isInventory ?? false}
                  onCheckedChange={() => onToggleInventory(vendor.username, vendor.isInventory ?? false)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Account Linking</span>
                  <span className="text-[11px] text-muted-foreground">Allow linking multiple staff logins</span>
                </div>
                <Switch
                  checked={vendor.isAccountLinkingEnabled ?? false}
                  onCheckedChange={() => onToggleAccountLinking(vendor.username, vendor.isAccountLinkingEnabled ?? false)}
                />
              </div>
            </div>
          </div>

          {/* Group 2: Growth & Monetization */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BadgePercent className="h-3.5 w-3.5 text-emerald-500" />
              <span>Growth & Revenue</span>
            </h4>
            <div className="space-y-1.5 bg-muted/30 p-3 rounded-2xl border border-border/50">
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Take Share (Commission)</span>
                  <span className="text-[11px] text-muted-foreground">
                    {vendor.isCommissionOn ? `Active at ${vendor.commissionPercentage || 0}% platform cut` : 'Disabled'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {vendor.isCommissionOn && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-full px-2.5"
                      onClick={() => onToggleCommission(vendor)}
                    >
                      {vendor.commissionPercentage}% ✎
                    </Button>
                  )}
                  <Switch
                    checked={vendor.isCommissionOn ?? false}
                    onCheckedChange={() => onToggleCommission(vendor)}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">HyperPoints Loyalty Rewards</span>
                  <span className="text-[11px] text-muted-foreground">
                    {vendor.isRewardsEnabled && vendor.rewardsConfig ? `₹${vendor.rewardsConfig.spend} spend → ${vendor.rewardsConfig.points} HP` : 'Customer cashback points'}
                  </span>
                </div>
                <Switch
                  checked={vendor.isRewardsEnabled ?? false}
                  onCheckedChange={() => onToggleRewards(vendor)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">AI Kitchen Copilot</span>
                  <span className="text-[11px] text-muted-foreground">AI dish descriptions & inventory forecast</span>
                </div>
                <Switch
                  checked={vendor.isAiAssistantEnabled ?? false}
                  onCheckedChange={() => onToggleAiAssistant(vendor.username, vendor.isAiAssistantEnabled ?? false)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Vendor Discount Offers</span>
                  <span className="text-[11px] text-muted-foreground">Allow vendor to publish storewide coupon specials</span>
                </div>
                <Switch
                  checked={vendor.isOfferCreationEnabled ?? false}
                  onCheckedChange={() => onToggleOfferCreation(vendor.username, vendor.isOfferCreationEnabled ?? false)}
                />
              </div>
            </div>
          </div>

          {/* Group 3: Admin Guards & Extras */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Admin Safeguards & Tools</span>
            </h4>
            <div className="space-y-1.5 bg-muted/30 p-3 rounded-2xl border border-border/50">
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Mark as Demo Shop</span>
                  <span className="text-[11px] text-muted-foreground">Excluded from production customer metrics</span>
                </div>
                <Switch
                  checked={vendor.isDemoAccount ?? false}
                  onCheckedChange={() => onToggleDemo(vendor.username, vendor.isDemoAccount ?? false)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Lock Menu Editing</span>
                  <span className="text-[11px] text-muted-foreground">Prevent vendor from altering dish prices/names</span>
                </div>
                <Switch
                  checked={vendor.isMenuEditDisabled ?? false}
                  onCheckedChange={() => onToggleMenuRestriction(vendor.username, vendor.isMenuEditDisabled ?? false)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Vendor Expense Tracking</span>
                  <span className="text-[11px] text-muted-foreground">Enable vendor bookkeeping & ledger entries</span>
                </div>
                <Switch
                  checked={vendor.isExpenseTrackingEnabled ?? false}
                  onCheckedChange={() => onToggleExpenseTracking(vendor.username, vendor.isExpenseTrackingEnabled ?? false)}
                />
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/60 transition-colors">
                <div>
                  <span className="font-semibold text-xs text-foreground block">Google Business Profile Sync</span>
                  <span className="text-[11px] text-muted-foreground">GBP review import & sync</span>
                </div>
                <Switch
                  checked={vendor.isGbpEnabled ?? false}
                  onCheckedChange={() => onToggleGbp(vendor.username, vendor.isGbpEnabled ?? false)}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-border/60">
          <Button onClick={() => onOpenChange(false)} className="rounded-full text-xs font-bold w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Compact, Elegant Vendor Bento Card
const CompactVendorCard = ({
  vendor,
  stats,
  menuItems,
  onFetchDetails,
  isFetchingDetails,
  onEdit,
  onDelete,
  onManageFeatures,
  onBulkUpload,
  onToggleApproval
}: {
  vendor: Vendor;
  stats: VendorStats | null;
  menuItems: MenuItem[];
  onFetchDetails: (username: string) => void;
  isFetchingDetails: boolean;
  onEdit: (v: Vendor) => void;
  onDelete: (username: string) => void;
  onManageFeatures: (v: Vendor) => void;
  onBulkUpload: (vendor: Vendor) => void;
  onToggleApproval: (username: string) => void;
}) => {
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const getDaysSinceOnboarded = (createdAt: string | undefined) => {
    if (!createdAt) return 'N/A';
    const onboardDate = new Date(createdAt);
    const days = differenceInDays(new Date(), onboardDate);
    if (days < 0) return 'Future Date';
    if (days === 0) return 'Today';
    if (days === 1) return '1d';
    return `${days}d ago`;
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
      if (field === null || field === undefined) return "";
      const stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
    };

    vendorItems.forEach(item => {
      const row = headers.map(header => {
        let value;
        if (header === 'customizations') {
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
    <Card className="rounded-3xl border border-border/70 bg-card hover:border-foreground/20 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden shadow-2xs">
      {/* Card Header */}
      <div className="p-4 sm:p-5 pb-3.5 border-b border-border/50 bg-muted/15 space-y-3">
        {/* Top Row: ONLY Quick Action Buttons (Center Aligned) */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1.5 bg-background/90 p-1 rounded-full border border-border/60 shadow-2xs">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-all"
              onClick={handleDownloadMenu}
              title="Download Menu CSV"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/30 transition-all"
              onClick={() => onBulkUpload(vendor)}
              title="Upload Menu Items"
            >
              <Upload className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-500/30 transition-all"
              onClick={() => onEdit(vendor)}
              title="Edit Store Profile"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all"
              onClick={() => onDelete(vendor.username)}
              title="Delete Store"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Shop Name & Owner */}
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Building className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm sm:text-base font-bold font-headline text-foreground leading-snug break-words">
              {vendor.shopName || vendor.name}
            </h3>
            {vendor.shopName && vendor.name && vendor.shopName.trim().toLowerCase() !== vendor.name.trim().toLowerCase() ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                Owner: {vendor.name}
              </p>
            ) : vendor.category ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                {vendor.category}
              </p>
            ) : null}
          </div>
        </div>

        {/* Below Owner: Status Badges (Live/Suspended + Days) + Live Switch */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold",
              vendor.isApproved
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-destructive/15 text-destructive border border-destructive/30"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", vendor.isApproved ? "bg-emerald-500" : "bg-destructive")} />
              {vendor.isApproved ? "Live Store" : "Suspended"}
            </span>

            <span className="text-[10px] text-muted-foreground font-semibold px-2 py-0.5 rounded-full bg-muted border border-border/50">
              {getDaysSinceOnboarded(vendor.createdAt)}
            </span>
          </div>

          <Switch
            checked={vendor.isApproved}
            onCheckedChange={() => onToggleApproval(vendor.username)}
            className="scale-80 shrink-0"
            title="Toggle Live Store Status"
          />
        </div>
      </div>

      {/* Active Capabilities Pills Matrix */}
      <CardContent className="p-4 flex-1 space-y-3">
        <div className="space-y-1.5">
          <span className="text-[10px] font-extrabold uppercase text-muted-foreground tracking-wider block">
            Active Capabilities
          </span>
          <div className="flex flex-wrap gap-1.5 min-h-[50px] content-start">
            {vendor.canAcceptDineIn && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Utensils className="h-2.5 w-2.5" /> Dine-In
              </span>
            )}

            {vendor.isInventory && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Package className="h-2.5 w-2.5" /> Inventory
              </span>
            )}

            {vendor.isCommissionOn && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Percent className="h-2.5 w-2.5" /> {vendor.commissionPercentage}% Share
              </span>
            )}

            {vendor.isRewardsEnabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Gift className="h-2.5 w-2.5" /> Rewards
              </span>
            )}

            {vendor.isAiAssistantEnabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-2.5 w-2.5" /> AI Copilot
              </span>
            )}

            {vendor.isOfferCreationEnabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground border border-border/60">
                Offers
              </span>
            )}

            {vendor.isDemoAccount && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                Demo
              </span>
            )}

            {vendor.isMenuEditDisabled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-600 border border-rose-500/30">
                Menu Locked
              </span>
            )}

            {!vendor.canAcceptDineIn && !vendor.isInventory && !vendor.isCommissionOn && !vendor.isRewardsEnabled && !vendor.isAiAssistantEnabled && !vendor.isDemoAccount && (
              <span className="text-[10px] text-muted-foreground italic py-0.5">Standard store configuration</span>
            )}
          </div>
        </div>

        {/* Live Orders Snippet (if fetched) */}
        {stats && (
          <div className="p-2.5 rounded-2xl bg-muted/30 border border-border/50 text-xs space-y-1">
            <div className="flex justify-between font-bold">
              <span className="text-muted-foreground">Lifetime Orders:</span>
              <span className="text-foreground">{stats.orderCount}</span>
            </div>
            {stats.topItems.length > 0 && (
              <p className="text-[10px] text-muted-foreground truncate">
                Top: <span className="font-semibold text-foreground">{stats.topItems[0].name} ({stats.topItems[0].quantity})</span>
              </p>
            )}
          </div>
        )}
      </CardContent>

      {/* Card Footer Actions */}
      <CardFooter className="p-3 pt-0 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 rounded-full text-xs font-bold h-8 border-border/70 hover:border-primary/50 text-foreground"
          onClick={() => onManageFeatures(vendor)}
        >
          <Settings2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
          Manage Permissions
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2.5 rounded-full text-xs font-bold text-muted-foreground hover:text-foreground shrink-0"
          onClick={() => onFetchDetails(vendor.username)}
          disabled={isFetchingDetails}
          title="Fetch Live Performance"
        >
          {isFetchingDetails ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BarChart2 className="h-3.5 w-3.5" />}
        </Button>
      </CardFooter>
    </Card>
  );
};

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
    toggleInventoryStatus,
    toggleVendorCommission
  } = useVendor();
  const { menuItems, fetchAllItems } = useMenu();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [vendorToDelete, setVendorToDelete] = useState<string | null>(null);
  const [isRewardsConfigOpen, setIsRewardsConfigOpen] = useState(false);
  const [rewardsVendor, setRewardsVendor] = useState<Vendor | null>(null);
  const [isCommissionConfigOpen, setIsCommissionConfigOpen] = useState(false);
  const [commissionVendor, setCommissionVendor] = useState<Vendor | null>(null);
  const [vendorStats, setVendorStats] = useState<Record<string, VendorStats>>({});
  const [fetchingDetailsFor, setFetchingDetailsFor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Features Dialog
  const [featuresVendor, setFeaturesVendor] = useState<Vendor | null>(null);
  const [isFeaturesDialogOpen, setIsFeaturesDialogOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'approved' | 'pending' | 'demo' | 'dineIn' | 'commission'>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const { toast } = useToast();

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchAllVendors(),
        fetchAllItems()
      ]);
      setIsLoading(false);
    };
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
      toast({ title: 'Error', description: "Could not fetch vendor's order data.", variant: 'destructive' });
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
    toast({ title: "Vendor Deleted", description: `Removed @${username} from the platform.` });
  };

  const handleApprovalToggle = async (username: string) => {
    await toggleVendorApproval(username);
  };

  const handleGbpToggle = async (username: string, currentStatus: boolean) => {
    await toggleVendorGbpStatus(username, currentStatus);
  };

  const handleExpenseTrackingToggle = async (username: string, currentStatus: boolean) => {
    await toggleVendorExpenseTracking(username, currentStatus);
  };

  const handleOfferCreationToggle = async (username: string, currentStatus: boolean) => {
    await toggleVendorOfferCreation(username, currentStatus);
  };

  const handleDineInToggle = async (username: string, currentStatus: boolean) => {
    await toggleDineInStatus(username, currentStatus);
  };

  const handleAiAssistantToggle = async (username: string, currentStatus: boolean) => {
    await toggleAiAssistantStatus(username, currentStatus);
  };

  const handleAccountLinkingToggle = async (username: string, currentStatus: boolean) => {
    await toggleAccountLinkingStatus(username, currentStatus);
  };

  const handleRewardsToggle = (vendor: Vendor) => {
    if (!vendor.isRewardsEnabled) {
      setRewardsVendor(vendor);
      setIsRewardsConfigOpen(true);
    } else {
      toggleVendorRewards(vendor.username, false);
    }
  };

  const handleRewardsConfigSave = async (config: { spend: number, points: number }) => {
    if (rewardsVendor) {
      await toggleVendorRewards(rewardsVendor.username, true, config);
    }
    setIsRewardsConfigOpen(false);
    setRewardsVendor(null);
  };

  const handleCommissionToggle = (vendor: Vendor) => {
    if (!vendor.isCommissionOn) {
      setCommissionVendor(vendor);
      setIsCommissionConfigOpen(true);
    } else {
      toggleVendorCommission(vendor.username, false, 0);
    }
  };

  const handleCommissionConfigSave = async (percentage: number) => {
    if (commissionVendor) {
      await toggleVendorCommission(commissionVendor.username, true, percentage);
    }
    setIsCommissionConfigOpen(false);
    setCommissionVendor(null);
  };

  const handleOpenFeaturesDialog = (vendor: Vendor) => {
    setFeaturesVendor(vendor);
    setIsFeaturesDialogOpen(true);
  };

  const onFormClose = (isOpen: boolean) => {
    setIsFormOpen(isOpen);
  };

  // KPI Metrics calculation
  const totalStores = allVendors.length;
  const approvedStores = allVendors.filter(v => v.isApproved).length;
  const pendingStores = allVendors.filter(v => !v.isApproved).length;
  const demoStores = allVendors.filter(v => v.isDemoAccount).length;
  const dineInStores = allVendors.filter(v => v.canAcceptDineIn).length;
  const commissionStores = allVendors.filter(v => v.isCommissionOn).length;

  // Filtered vendors list
  const filteredVendors = useMemo(() => {
    let list = allVendors;

    // Status filter
    if (filterMode === 'approved') {
      list = list.filter(v => v.isApproved);
    } else if (filterMode === 'pending') {
      list = list.filter(v => !v.isApproved);
    } else if (filterMode === 'demo') {
      list = list.filter(v => v.isDemoAccount);
    } else if (filterMode === 'dineIn') {
      list = list.filter(v => v.canAcceptDineIn);
    } else if (filterMode === 'commission') {
      list = list.filter(v => v.isCommissionOn);
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v =>
        (v.shopName && v.shopName.toLowerCase().includes(q)) ||
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.username && v.username.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allVendors, filterMode, searchQuery]);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/80 backdrop-blur-md p-5 rounded-3xl border border-border/70 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold font-headline text-foreground flex items-center gap-2">
            <Building className="h-6 w-6 text-primary" />
            <span>Super Admin Command Center</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Store governance, monetization rules, permissions, and operations
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Switcher Toggle */}
          <div className="flex items-center bg-muted/80 p-0.5 rounded-full border border-border/60">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={cn(
                "p-1.5 rounded-full transition-colors cursor-pointer",
                viewMode === 'cards' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                "p-1.5 rounded-full transition-colors cursor-pointer",
                viewMode === 'table' ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
              )}
              title="Table Matrix View"
            >
              <TableIcon className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={handleAddNew}
            size="sm"
            className="rounded-full text-xs font-extrabold h-9 px-5 bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" />
            Add New Store
          </Button>
        </div>
      </div>

      {/* Executive 4-KPI Bento Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Stores</span>
            <Store className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{totalStores}</p>
          <p className="text-[10px] text-muted-foreground font-medium">On platform</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Live & Active</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{approvedStores}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{pendingStores} pending approval</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Take Share Active</span>
            <BadgePercent className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-foreground">{commissionStores}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Commission enabled</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Demo Sandbox</span>
            <Sparkles className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">{demoStores}</p>
          <p className="text-[10px] text-muted-foreground font-medium">{dineInStores} Dine-In enabled</p>
        </div>
      </div>

      {/* Search & Quick Filter Pills Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border/70 shadow-2xs">
        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by store name, owner, or @username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs rounded-full border-border/70 bg-background"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterMode === 'all'
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            All Stores ({totalStores})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('approved')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterMode === 'approved'
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🟢 Live ({approvedStores})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterMode === 'pending'
                ? "bg-destructive text-white border-destructive shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            ⏳ Pending ({pendingStores})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('dineIn')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterMode === 'dineIn'
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🍽 Dine-In ({dineInStores})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('commission')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterMode === 'commission'
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            💰 Take Share ({commissionStores})
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('demo')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterMode === 'demo'
                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🧪 Demo ({demoStores})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64 space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Loading vendor command center...</p>
        </div>
      ) : filteredVendors.length > 0 ? (
        viewMode === 'cards' ? (
          /* Cards Bento Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVendors.map(vendor => (
              <CompactVendorCard
                key={vendor.username}
                vendor={vendor}
                stats={vendorStats[vendor.username] || null}
                menuItems={menuItems}
                onFetchDetails={handleFetchDetails}
                isFetchingDetails={fetchingDetailsFor === vendor.username}
                onEdit={handleEdit}
                onDelete={setVendorToDelete}
                onManageFeatures={handleOpenFeaturesDialog}
                onBulkUpload={handleBulkUpload}
                onToggleApproval={handleApprovalToggle}
              />
            ))}
          </div>
        ) : (
          /* Master Table View */
          <div className="rounded-3xl border border-border/70 bg-card overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-bold text-xs">Store & Owner</TableHead>
                  <TableHead className="font-bold text-xs">Status</TableHead>
                  <TableHead className="font-bold text-xs">Active Features</TableHead>
                  <TableHead className="font-bold text-xs">Commission</TableHead>
                  <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.username} className="hover:bg-muted/30">
                    <TableCell className="py-3">
                      <div className="font-bold text-sm text-foreground break-words">{vendor.shopName || vendor.name}</div>
                      {vendor.shopName && vendor.name && vendor.shopName.trim().toLowerCase() !== vendor.name.trim().toLowerCase() && (
                        <div className="text-xs text-muted-foreground">Owner: {vendor.name}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={vendor.isApproved}
                          onCheckedChange={() => handleApprovalToggle(vendor.username)}
                          className="scale-80"
                        />
                        <span className={cn(
                          "text-xs font-bold",
                          vendor.isApproved ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                        )}>
                          {vendor.isApproved ? "Live" : "Suspended"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vendor.canAcceptDineIn && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-bold">Dine-In</span>}
                        {vendor.isInventory && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Inventory</span>}
                        {vendor.isRewardsEnabled && <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold">Rewards</span>}
                        {vendor.isAiAssistantEnabled && <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">AI</span>}
                        {vendor.isDemoAccount && <span className="text-[10px] bg-amber-500/20 text-amber-700 px-2 py-0.5 rounded-full font-bold">Demo</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendor.isCommissionOn ? (
                        <button
                          type="button"
                          onClick={() => handleCommissionToggle(vendor)}
                          className="text-xs font-bold text-primary hover:underline cursor-pointer"
                        >
                          {vendor.commissionPercentage}% Cut
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">0% (Off)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs rounded-full gap-1"
                          onClick={() => handleOpenFeaturesDialog(vendor)}
                        >
                          <Settings2 className="h-3.5 w-3.5 text-primary" />
                          Permissions
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-500/30 transition-all"
                          onClick={() => handleEdit(vendor)}
                          title="Edit Store Profile"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all"
                          onClick={() => setVendorToDelete(vendor.username)}
                          title="Delete Store"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border/80 space-y-3">
          <Building className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm font-bold text-foreground">No matching stores found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search terms or filter chips.</p>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full text-xs"
            onClick={() => { setSearchQuery(''); setFilterMode('all'); }}
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Feature Permissions Management Dialog */}
      <VendorFeaturesDialog
        vendor={featuresVendor}
        open={isFeaturesDialogOpen}
        onOpenChange={setIsFeaturesDialogOpen}
        onToggleApproval={handleApprovalToggle}
        onToggleGbp={handleGbpToggle}
        onToggleExpenseTracking={handleExpenseTrackingToggle}
        onToggleOfferCreation={handleOfferCreationToggle}
        onToggleDineIn={handleDineInToggle}
        onToggleAiAssistant={handleAiAssistantToggle}
        onToggleAccountLinking={handleAccountLinkingToggle}
        onToggleRewards={handleRewardsToggle}
        onToggleCommission={handleCommissionToggle}
        onToggleDemo={toggleVendorDemoStatus}
        onToggleMenuRestriction={toggleMenuEditRestriction}
        onToggleInventory={toggleInventoryStatus}
      />

      {/* Dialogs */}
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

      <CommissionConfigDialog
        isOpen={isCommissionConfigOpen}
        onOpenChange={setIsCommissionConfigOpen}
        onSave={handleCommissionConfigSave}
        vendor={commissionVendor}
      />

      <ConfirmationDialog
        isOpen={!!vendorToDelete}
        onOpenChange={(isOpen) => !isOpen && setVendorToDelete(null)}
        onConfirm={() => vendorToDelete && handleDeleteConfirm(vendorToDelete)}
        title="Delete Vendor Account?"
        description="This action cannot be undone. This will permanently delete the vendor and all their associated store data."
      />
    </div>
  );
}

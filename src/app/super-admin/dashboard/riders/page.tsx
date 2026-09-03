'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRiderManagement } from '@/context/rider-management-context';
import {
  Loader2,
  Bike,
  Search,
  Users,
  ShieldCheck,
  Clock,
  LayoutGrid,
  List,
  Phone,
  CreditCard,
  FileText,
  ExternalLink,
  Trash2,
  X,
  ShieldAlert,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import RiderCard from './rider-card';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminRidersPage() {
  const { riders, fetchAllRiders, toggleRiderApproval, updateVerificationStatus, deleteRider } = useRiderManagement();
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'online' | 'approved' | 'pendingKYC' | 'suspended'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [riderToDelete, setRiderToDelete] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchAllRiders();
      setIsLoading(false);
    };
    loadData();
  }, [fetchAllRiders]);

  const stats = useMemo(() => {
    const total = riders.length;
    const online = riders.filter(r => r.status === 'Online').length;
    const approved = riders.filter(r => r.isApproved).length;
    const pendingKYC = riders.filter(r => r.verificationStatus === 'pending').length;
    const suspended = riders.filter(r => !r.isApproved).length;
    return { total, online, approved, pendingKYC, suspended };
  }, [riders]);

  const filteredRiders = useMemo(() => {
    let list = riders;

    if (filterTab === 'online') {
      list = list.filter(r => r.status === 'Online');
    } else if (filterTab === 'approved') {
      list = list.filter(r => r.isApproved);
    } else if (filterTab === 'pendingKYC') {
      list = list.filter(r => r.verificationStatus === 'pending');
    } else if (filterTab === 'suspended') {
      list = list.filter(r => !r.isApproved);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.contact.includes(q) ||
        (r.vehicleNumber && r.vehicleNumber.toLowerCase().includes(q)) ||
        (r.upiId && r.upiId.toLowerCase().includes(q)) ||
        (r.address && r.address.toLowerCase().includes(q))
      );
    }

    return list;
  }, [riders, filterTab, searchTerm]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card to-primary/[0.05] p-5 sm:p-6 border border-border/80 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 shadow-2xs">
                <Bike className="h-3 w-3" />
                FLEET GOVERNANCE
              </span>
              <span className="text-muted-foreground text-xs font-semibold">
                {stats.total} Registered Riders
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-headline text-foreground tracking-tight flex items-center gap-2.5">
              <span>Delivery Fleet Console</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-extrabold">
                SUPER ADMIN
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              Manage partner verification, onboardings, live status, and payouts
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="bg-muted p-1 rounded-2xl border border-border/70 flex items-center gap-1 shadow-2xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold transition-all",
                  viewMode === 'grid'
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
                Cards
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('table')}
                className={cn(
                  "h-8 px-3 rounded-xl text-xs font-bold transition-all",
                  viewMode === 'table'
                    ? "bg-background text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <List className="h-3.5 w-3.5 mr-1.5" />
                Table
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4-KPI Bento Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Fleet</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Registered delivery partners</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Online Now</span>
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.online}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Ready for order assignment</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Approved</span>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.approved}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Permitted for delivery runs</p>
        </div>

        <div className={cn(
          "bg-card p-4 rounded-2xl border shadow-2xs space-y-1 transition-all",
          stats.pendingKYC > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border/70"
        )}>
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">KYC Pending</span>
            <Clock className={cn("h-4 w-4", stats.pendingKYC > 0 ? "text-amber-600 animate-pulse" : "text-muted-foreground")} />
          </div>
          <p className={cn("text-2xl font-black", stats.pendingKYC > 0 ? "text-amber-600" : "text-foreground")}>
            {stats.pendingKYC}
          </p>
          <p className="text-[10px] text-muted-foreground font-medium">Requires document audit</p>
        </div>
      </div>

      {/* 3. Search & Filter Tabs Ribbon */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border/70 shadow-2xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, vehicle number, UPI..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-8 h-9 text-xs rounded-full border-border/70 bg-background"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>

        {/* 1-Tap Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'all'
                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            All Riders ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('online')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'online'
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🟢 Online ({stats.online})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('approved')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'approved'
                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🛡 Approved ({stats.approved})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('pendingKYC')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'pendingKYC'
                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            ⏳ KYC Pending ({stats.pendingKYC})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('suspended')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'suspended'
                ? "bg-rose-600 text-white border-rose-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🚫 Suspended ({stats.suspended})
          </button>
        </div>
      </div>

      {/* 4. Riders Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Loading delivery partner fleet...</p>
        </div>
      ) : filteredRiders.length > 0 ? (
        viewMode === 'grid' ? (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {filteredRiders.map((rider, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                  key={rider.id}
                >
                  <RiderCard
                    rider={rider}
                    onToggleApproval={toggleRiderApproval}
                    onUpdateVerification={updateVerificationStatus}
                    onDelete={setRiderToDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          /* Master Fleet Table View */
          <div className="bg-card rounded-3xl border border-border/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 text-[10px] uppercase font-extrabold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Rider Details</th>
                    <th className="py-3 px-4">Contact & Location</th>
                    <th className="py-3 px-4">Vehicle & UPI</th>
                    <th className="py-3 px-4">KYC Documents</th>
                    <th className="py-3 px-4 text-center">Allow Runs</th>
                    <th className="py-3 px-4">KYC Review</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredRiders.map((rider) => {
                    const isOnline = rider.status === 'Online';
                    return (
                      <tr key={rider.id} className="hover:bg-muted/30 transition-colors">
                        {/* Rider Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="relative">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                                {rider.name ? rider.name.charAt(0).toUpperCase() : 'R'}
                              </div>
                              <span
                                className={cn(
                                  "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-background",
                                  isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                                )}
                              />
                            </div>
                            <div>
                              <p className="font-bold text-foreground leading-tight">{rider.name}</p>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5",
                                  isOnline
                                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                                    : "text-muted-foreground bg-muted border border-border/60"
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500" : "bg-muted-foreground")} />
                                {isOnline ? "Online" : "Offline"}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <a href={`tel:${rider.contact}`} className="font-bold text-foreground hover:underline block">
                              {rider.contact}
                            </a>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {rider.address || rider.email || '—'}
                            </p>
                          </div>
                        </td>

                        {/* Vehicle & UPI */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-foreground flex items-center gap-1">
                              <Bike className="h-3 w-3 text-primary" />
                              <span>{rider.vehicleNumber || 'No vehicle'}</span>
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[130px]">
                              {rider.upiId || 'No UPI'}
                            </p>
                          </div>
                        </td>

                        {/* KYC Docs (Pill Shaped) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {rider.aadhaarImageUrl ? (
                              <a
                                href={rider.aadhaarImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/70 bg-background text-[10px] font-bold hover:bg-muted shadow-2xs transition-colors"
                              >
                                <span>Aadhaar</span>
                                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-muted-foreground bg-muted/50 italic border border-border/40">
                                No Aadhaar
                              </span>
                            )}

                            {rider.drivingLicenseImageUrl ? (
                              <a
                                href={rider.drivingLicenseImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-border/70 bg-background text-[10px] font-bold hover:bg-muted shadow-2xs transition-colors"
                              >
                                <span>License</span>
                                <ExternalLink className="h-2.5 w-2.5 text-muted-foreground" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] text-muted-foreground bg-muted/50 italic border border-border/40">
                                No DL
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Allow Deliveries */}
                        <td className="py-3 px-4 text-center">
                          <Switch
                            checked={rider.isApproved}
                            onCheckedChange={() => toggleRiderApproval(rider.id, rider.isApproved)}
                            className="scale-85"
                          />
                        </td>

                        {/* KYC Review (Pill Shaped Trigger) */}
                        <td className="py-3 px-4">
                          <Select
                            value={rider.verificationStatus || 'pending'}
                            onValueChange={(val) => updateVerificationStatus(rider.id, val as any)}
                          >
                            <SelectTrigger className="h-7.5 w-32 rounded-full border-border/70 bg-background text-[11px] font-bold px-3 shadow-2xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="pending">🟡 Pending</SelectItem>
                              <SelectItem value="approved">🟢 Approved</SelectItem>
                              <SelectItem value="rejected">🔴 Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all"
                            onClick={() => setRiderToDelete(rider.id)}
                            title="Delete Rider"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 bg-card rounded-3xl border border-dashed border-border/80">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Bike className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">No delivery riders found</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search query or filter chip selection.</p>
          </div>
          {filterTab !== 'all' && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs font-bold"
              onClick={() => { setFilterTab('all'); setSearchTerm(''); }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={!!riderToDelete}
        onOpenChange={(isOpen) => !isOpen && setRiderToDelete(null)}
        onConfirm={() => {
          if (riderToDelete) {
            deleteRider(riderToDelete);
            setRiderToDelete(null);
          }
        }}
        title="Delete Rider Record?"
        description="This action cannot be undone. This will permanently remove the rider partner from the Hyperdelivery system."
      />
    </div>
  );
}

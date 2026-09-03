'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCustomer } from '@/context/customer-context';
import { Card, CardContent } from '@/components/ui/card';
import type { Customer } from '@/types';
import {
  Loader2,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Mail,
  Award,
  BarChart2,
  Users,
  Search,
  LayoutGrid,
  List,
  Phone,
  MapPin,
  X,
  Sparkles,
  ShoppingBag,
  ShieldCheck,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmationDialog from '@/components/confirmation-dialog';
import CustomerForm from './customer-form';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomerStats {
  orderCount: number;
  totalHyperPoints: number;
}

export default function SuperAdminCustomersPage() {
  const { fetchAllCustomers, removeCustomer } = useCustomer();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [customerStats, setCustomerStats] = useState<Record<string, CustomerStats>>({});
  const [fetchingFor, setFetchingFor] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'verified' | 'unverified' | 'marketing' | 'rewards'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    const fetchedCustomers = await fetchAllCustomers();
    setCustomers(fetchedCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFetchDetails = async (username: string) => {
    setFetchingFor(username);
    try {
      const customer = customers.find(c => c.username === username);
      if (!customer) {
        throw new Error("Customer not found");
      }

      const ordersQuery = query(collection(db, 'orders'), where('customerUsername', '==', username));
      const orderSnapshot = await getCountFromServer(ordersQuery);
      const orderCount = orderSnapshot.data().count;

      const totalHyperPoints = customer.hyperPoints
        ? Object.values(customer.hyperPoints).reduce((sum, points) => sum + points, 0)
        : 0;

      setCustomerStats(prev => ({
        ...prev,
        [username]: {
          orderCount,
          totalHyperPoints,
        }
      }));
    } catch (e) {
      console.error("Error fetching customer details:", e);
      toast({ title: 'Error', description: "Could not fetch customer details." });
    } finally {
      setFetchingFor(null);
    }
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsFormOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (customerToDelete) {
      await removeCustomer(customerToDelete);
      setCustomerToDelete(null);
      loadData();
    }
  };

  const onFormClose = (isOpen: boolean) => {
    setIsFormOpen(isOpen);
    if (!isOpen) {
      loadData();
    }
  };

  const stats = useMemo(() => {
    const total = customers.length;
    const verified = customers.filter(c => c.phoneVerified).length;
    const unverified = total - verified;
    const marketing = customers.filter(c => c.emailPreferences?.campaigns ?? true).length;
    const rewards = customers.filter(c => c.hyperPoints && Object.values(c.hyperPoints).some(p => p > 0)).length;
    return { total, verified, unverified, marketing, rewards };
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (filterTab === 'verified') {
      list = list.filter(c => c.phoneVerified);
    } else if (filterTab === 'unverified') {
      list = list.filter(c => !c.phoneVerified);
    } else if (filterTab === 'marketing') {
      list = list.filter(c => c.emailPreferences?.campaigns ?? true);
    } else if (filterTab === 'rewards') {
      list = list.filter(c => c.hyperPoints && Object.values(c.hyperPoints).some(p => p > 0));
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.contact && c.contact.includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
      );
    }

    return list;
  }, [customers, filterTab, searchTerm]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* 1. Top Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-card via-card to-primary/[0.05] p-5 sm:p-6 border border-border/80 shadow-xs">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 shadow-2xs">
                <Users className="h-3 w-3" />
                CUSTOMER DIRECTORY
              </span>
              <span className="text-muted-foreground text-xs font-semibold">
                {stats.total} Registered Accounts
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black font-headline text-foreground tracking-tight flex items-center gap-2.5">
              <span>Customer Accounts Console</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25 font-extrabold">
                SUPER ADMIN
              </span>
            </h1>
            <p className="text-xs text-muted-foreground font-medium">
              View customer profiles, rewards point balances, verification status, and contact records
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="bg-muted p-1 rounded-2xl border border-border/70 flex items-center gap-1 shadow-2xs">
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
            </div>
          </div>
        </div>
      </div>

      {/* 2. 4-KPI Bento Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Customers</span>
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Active customer database</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Phone Verified</span>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.verified}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Ready for instant delivery</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Marketing Opt-In</span>
            <Mail className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.marketing}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Subscribed to campaigns</p>
        </div>

        <div className="bg-card p-4 rounded-2xl border border-border/70 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Rewards Active</span>
            <Award className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.rewards}</p>
          <p className="text-[10px] text-muted-foreground font-medium">Hold HyperPoints balance</p>
        </div>
      </div>

      {/* 3. Search & Filter Tabs Ribbon */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-2xl border border-border/70 shadow-2xs">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, username, phone, address..."
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
            All Customers ({stats.total})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('verified')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'verified'
                ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            📱 Verified ({stats.verified})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('unverified')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'unverified'
                ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            ⚠️ Unverified ({stats.unverified})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('marketing')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'marketing'
                ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            📧 Marketing ({stats.marketing})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('rewards')}
            className={cn(
              "px-3 py-1 text-xs font-bold rounded-full transition-all shrink-0 cursor-pointer border",
              filterTab === 'rewards'
                ? "bg-purple-600 text-white border-purple-600 shadow-2xs"
                : "bg-muted text-muted-foreground border-border/50 hover:text-foreground"
            )}
          >
            🎁 Rewards ({stats.rewards})
          </button>
        </div>
      </div>

      {/* 4. Customer Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground font-semibold">Loading registered customers...</p>
        </div>
      ) : filteredCustomers.length > 0 ? (
        viewMode === 'table' ? (
          /* Master Table View */
          <div className="bg-card rounded-3xl border border-border/70 overflow-hidden shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 text-muted-foreground border-b border-border/60 text-[10px] uppercase font-extrabold tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Customer Details</th>
                    <th className="py-3 px-4">Contact & Location</th>
                    <th className="py-3 px-4 text-center">Phone Status</th>
                    <th className="py-3 px-4 text-center">Campaigns</th>
                    <th className="py-3 px-4">Orders & Points</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredCustomers.map((customer) => {
                    const cStats = customerStats[customer.username];
                    const isVerified = customer.phoneVerified;
                    const isMarketing = customer.emailPreferences?.campaigns ?? true;

                    return (
                      <tr key={customer.username} className="hover:bg-muted/30 transition-colors">
                        {/* Customer Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-xs shrink-0">
                              {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div>
                              <p className="font-bold text-foreground leading-tight">{customer.name || 'Unnamed'}</p>
                              <span className="text-[10px] text-muted-foreground font-mono block">
                                @{customer.username}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact & Address */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-foreground">
                              {customer.contact || 'No phone'}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate max-w-[200px]" title={customer.address || ''}>
                              {customer.address || 'No address on file'}
                            </p>
                          </div>
                        </td>

                        {/* Phone Status */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs",
                              isVerified
                                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                                : "text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", isVerified ? "bg-emerald-500" : "bg-amber-500")} />
                            {isVerified ? "Verified" : "Unverified"}
                          </span>
                        </td>

                        {/* Campaigns */}
                        <td className="py-3 px-4 text-center">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-2xs",
                              isMarketing
                                ? "text-blue-700 dark:text-blue-400 bg-blue-500/15 border border-blue-500/30"
                                : "text-muted-foreground bg-muted border border-border/60"
                            )}
                          >
                            <Mail className="h-2.5 w-2.5" />
                            {isMarketing ? "Subscribed" : "Opted Out"}
                          </span>
                        </td>

                        {/* Orders & HyperPoints */}
                        <td className="py-3 px-4">
                          {cStats ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-muted border border-border/60 text-foreground">
                                <ShoppingBag className="h-2.5 w-2.5 text-primary" />
                                {cStats.orderCount} Orders
                              </span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                                <Award className="h-2.5 w-2.5" />
                                {Math.floor(cStats.totalHyperPoints)} pts
                              </span>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2.5 rounded-full text-[10px] font-bold text-primary hover:bg-primary/10 border border-primary/20"
                              onClick={() => handleFetchDetails(customer.username)}
                              disabled={fetchingFor === customer.username}
                            >
                              {fetchingFor === customer.username ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <BarChart2 className="h-3 w-3 mr-1" />
                              )}
                              Fetch Stats
                            </Button>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Refresh Stats button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition-all"
                              onClick={() => handleFetchDetails(customer.username)}
                              disabled={fetchingFor === customer.username}
                              title="Fetch Orders & Rewards"
                            >
                              {fetchingFor === customer.username ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <BarChart2 className="h-3.5 w-3.5" />
                              )}
                            </Button>

                            {/* Edit button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-500/30 transition-all"
                              onClick={() => handleEdit(customer)}
                              title="Edit Customer"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            {/* Delete button */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all"
                              onClick={() => setCustomerToDelete(customer.username)}
                              title="Delete Customer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.map((customer, index) => {
                const cStats = customerStats[customer.username];
                const isVerified = customer.phoneVerified;
                const isMarketing = customer.emailPreferences?.campaigns ?? true;

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2, delay: index * 0.02 }}
                    key={customer.username}
                  >
                    <Card className="rounded-3xl overflow-hidden border border-border/70 bg-card hover:border-foreground/20 hover:shadow-md transition-all shadow-2xs flex flex-col justify-between h-full">
                      {/* Card Header */}
                      <div className="p-4 sm:p-5 pb-3 border-b border-border/50 bg-muted/15">
                        {/* Top Tier: Action Buttons Centered */}
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white border-blue-500/30 transition-all shadow-2xs"
                            onClick={() => handleFetchDetails(customer.username)}
                            disabled={fetchingFor === customer.username}
                          >
                            {fetchingFor === customer.username ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : (
                              <BarChart2 className="h-3 w-3 mr-1" />
                            )}
                            Stats
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 hover:bg-amber-600 hover:text-white border-amber-500/30 transition-all shadow-2xs"
                            onClick={() => handleEdit(customer)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-3 rounded-full text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border-rose-500/30 transition-all shadow-2xs"
                            onClick={() => setCustomerToDelete(customer.username)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>

                        {/* Customer Identity */}
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm shrink-0">
                            {customer.name ? customer.name.charAt(0).toUpperCase() : 'C'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-bold font-headline text-foreground leading-snug break-words">
                              {customer.name || 'Unnamed'}
                            </h3>
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              @{customer.username}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Content */}
                      <CardContent className="p-4 sm:p-5 flex-1 space-y-3 text-xs">
                        {/* Status Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs",
                              isVerified
                                ? "text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30"
                                : "text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", isVerified ? "bg-emerald-500" : "bg-amber-500")} />
                            {isVerified ? "Phone Verified" : "Unverified"}
                          </span>

                          <span
                            className={cn(
                              "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs",
                              isMarketing
                                ? "text-blue-700 dark:text-blue-400 bg-blue-500/15 border border-blue-500/30"
                                : "text-muted-foreground bg-muted border border-border/60"
                            )}
                          >
                            <Mail className="h-2.5 w-2.5" />
                            {isMarketing ? "Campaigns ON" : "Campaigns OFF"}
                          </span>
                        </div>

                        {/* Contact & Address */}
                        <div className="space-y-1.5 text-muted-foreground bg-muted/20 p-2.5 rounded-2xl border border-border/40">
                          <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="font-semibold text-foreground truncate">{customer.contact || 'No phone'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-[11px] line-clamp-2">{customer.address || 'No address'}</span>
                          </div>
                        </div>

                        {/* Orders & Points */}
                        {cStats ? (
                          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-[11px]">
                            <span className="font-bold text-foreground flex items-center gap-1">
                              <ShoppingBag className="h-3 w-3 text-primary" />
                              {cStats.orderCount} Orders
                            </span>
                            <span className="font-black text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <Award className="h-3 w-3" />
                              {Math.floor(cStats.totalHyperPoints)} Points
                            </span>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full rounded-full text-xs font-bold h-8 border-border/70 hover:bg-primary/10 hover:text-primary"
                            onClick={() => handleFetchDetails(customer.username)}
                            disabled={fetchingFor === customer.username}
                          >
                            {fetchingFor === customer.username ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            ) : (
                              <BarChart2 className="h-3.5 w-3.5 mr-1.5" />
                            )}
                            Fetch Orders & Points
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3 bg-card rounded-3xl border border-dashed border-border/80">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">No customers found</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your search query or filter selection.</p>
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

      {/* Customer Form Modal */}
      <CustomerForm
        isOpen={isFormOpen}
        onOpenChange={onFormClose}
        customer={selectedCustomer}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationDialog
        isOpen={!!customerToDelete}
        onOpenChange={(isOpen) => !isOpen && setCustomerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Customer Account?"
        description="This action cannot be undone. This will permanently remove the customer account from Hyperdelivery."
      />
    </div>
  );
}

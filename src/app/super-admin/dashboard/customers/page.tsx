'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCustomer } from '@/context/customer-context';
import { useOrder } from '@/context/order-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Customer, Order } from '@/types';
import { Loader2, Edit, Trash2, CheckCircle, XCircle, Mail, Award, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ConfirmationDialog from '@/components/confirmation-dialog';
import CustomerForm from './customer-form';
import { db } from '@/lib/firebase';
import { collection, query, where, getCountFromServer } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

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
    } catch(e) {
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
      loadData(); // Refresh list
    }
  };

  const onFormClose = (isOpen: boolean) => {
    setIsFormOpen(isOpen);
    if (!isOpen) {
        loadData(); // Refresh when form closes
    }
  }


  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Manage Customers</h2>
       </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Registered Customers</CardTitle>
        </CardHeader>
        <CardContent>
           {isLoading ? (
             <div className="flex justify-center items-center h-48">
               <Loader2 className="h-8 w-8 animate-spin" />
             </div>
           ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Total Orders</TableHead>
                  <TableHead className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Rewards
                  </TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Campaigns</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length > 0 ? (
                  customers.map(customer => {
                      const stats = customerStats[customer.username];
                      return (
                      <TableRow key={customer.username}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{stats?.orderCount ?? '-'}</TableCell>
                        <TableCell className="font-semibold text-amber-600">{stats ? (Math.floor(stats.totalHyperPoints) || 0) : '-'}</TableCell>
                        <TableCell>
                          {customer.phoneVerified ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : (
                            <XCircle className="h-5 w-5 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell>
                           {customer.emailPreferences?.campaigns ?? true ? (
                             <CheckCircle className="h-5 w-5 text-green-500" title="Subscribed"/>
                           ) : (
                             <XCircle className="h-5 w-5 text-destructive" title="Unsubscribed"/>
                           )}
                        </TableCell>
                        <TableCell>{customer.address || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                             <Button variant="outline" size="icon" onClick={() => handleFetchDetails(customer.username)} disabled={fetchingFor === customer.username}>
                                {fetchingFor === customer.username ? <Loader2 className="h-4 w-4 animate-spin"/> : <BarChart2 className="h-4 w-4" />}
                            </Button>
                            <Button variant="outline" size="icon" onClick={() => handleEdit(customer)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              className="text-white bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 bg-[length:200%_auto] animate-gradient-move"
                              onClick={() => setCustomerToDelete(customer.username)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      )
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No customers found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
           )}
        </CardContent>
      </Card>

      <CustomerForm
        isOpen={isFormOpen}
        onOpenChange={onFormClose}
        customer={selectedCustomer}
      />
      
      <ConfirmationDialog
        isOpen={!!customerToDelete}
        onOpenChange={(isOpen) => !isOpen && setCustomerToDelete(null)}
        onConfirm={handleDeleteConfirm}
        title="Are you sure?"
        description="This action cannot be undone. This will permanently delete the customer account and all their associated data."
      />
    </div>
  );
}

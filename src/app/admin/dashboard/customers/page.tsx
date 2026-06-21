'use client';

import { useMemo, useState, useEffect } from 'react';
import { useOrder } from '@/context/order-context';
import { useVendor } from '@/context/vendor-context';
import { useCustomer } from '@/context/customer-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Order, Customer } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Award } from 'lucide-react';

interface CustomerPurchaseInfo {
  customerName: string;
  customerContact: string;
  rewardPoints: number;
  items: { itemName: string; purchaseCount: number }[];
  totalPurchaseCount: number;
}

type FilterOption = 'Customers' | 'Dine-In';

const maskContact = (contact: string) => {
    if (!contact || contact.length <= 4) {
        return contact;
    }
    const lastFour = contact.slice(-4);
    return 'xxxxxx' + lastFour;
};

export default function AdminCustomersPage() {
  const { orders } = useOrder();
  const { vendor } = useVendor();
  const { fetchAllCustomers } = useCustomer();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterOption, setFilterOption] = useState<FilterOption>('Customers');

  useEffect(() => {
    fetchAllCustomers().then(setCustomers);
  }, [fetchAllCustomers]);

  const customerPurchaseData = useMemo(() => {
    if (!vendor || customers.length === 0) return [];
    
    const deliveredOrders = orders.filter(order => 
        order.vendorUsername === vendor.username && 
        (order.status === 'Delivered' || order.status === 'Picked Up')
    );

    const purchaseMap = new Map<string, CustomerPurchaseInfo>();

    deliveredOrders.forEach(order => {
        const isDineIn = order.deliveryOption === 'Dine-In';
        
        if (filterOption === 'Dine-In' && !isDineIn) return;
        if (filterOption === 'Customers' && isDineIn) return;
        
        // Use a constant key for all dine-in orders, otherwise use the customer's name
        const customerKey = isDineIn ? 'dine-in-summary' : (order.customer.name || 'Unknown');
        
        let customerEntry = purchaseMap.get(customerKey);
        if (!customerEntry) {
            const fullCustomer = customers.find(c => c.username === order.customerUsername);
            const rewardPoints = fullCustomer?.hyperPoints?.[vendor.username] || 0;
            const lockedPoints = fullCustomer?.lockedPoints?.[vendor.username] || 0;
            const availablePoints = rewardPoints - lockedPoints;

            customerEntry = {
                customerName: isDineIn ? 'Dine In' : order.customer.name,
                customerContact: isDineIn ? 'N/A' : order.customer.contact,
                rewardPoints: availablePoints,
                items: [],
                totalPurchaseCount: 0
            };
            purchaseMap.set(customerKey, customerEntry);
        }

        order.items.forEach(item => {
            customerEntry!.totalPurchaseCount += item.quantity;
            const existingItem = customerEntry!.items.find(i => i.itemName === item.name);
            if (existingItem) {
                existingItem.purchaseCount += item.quantity;
            } else {
                customerEntry!.items.push({
                    itemName: item.name,
                    purchaseCount: item.quantity
                });
            }
        });
    });

    const allData = Array.from(purchaseMap.values());
    allData.forEach(customer => {
        customer.items.sort((a, b) => b.purchaseCount - a.purchaseCount);
    });
    
    return allData.sort((a,b) => b.totalPurchaseCount - a.totalPurchaseCount);
  }, [orders, vendor, filterOption, customers]);


  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Customer Insights</h2>
       </div>

      <Card className="rounded-3xl">
        <CardHeader>
          <CardTitle>Customer Purchase History</CardTitle>
          <CardDescription>
            A list of items purchased by your customers.
          </CardDescription>
           <div className="pt-4">
              <RadioGroup value={filterOption} onValueChange={(value) => setFilterOption(value as FilterOption)} className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Customers" id="r3" />
                      <Label htmlFor="r3">Customers</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Dine-In" id="r2" />
                      <Label htmlFor="r2">Dine-In</Label>
                  </div>
              </RadioGroup>
            </div>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer Details</TableHead>
                <TableHead>Items Purchased</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customerPurchaseData.length > 0 ? (
                customerPurchaseData.map((data, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium align-top w-1/3">
                        <p className="font-semibold">{data.customerName}</p>
                        <p className="text-sm text-muted-foreground">{data.customerName === 'Dine In' ? 'N/A' : maskContact(data.customerContact)}</p>
                        {data.rewardPoints > 0 && data.customerName !== 'Dine In' && !data.customerName.startsWith('Take Away') && (
                            <p className="text-xs mt-1 flex items-center gap-1 font-semibold text-amber-600">
                                <Award className="h-4 w-4" />
                                <span>{data.rewardPoints} Points</span>
                            </p>
                        )}
                    </TableCell>
                    <TableCell>
                        <ul className="space-y-1">
                            {data.items.map((item, itemIndex) => (
                                <li key={itemIndex} className="flex justify-between items-center text-sm border-b last:border-b-0 py-1.5 border-dashed">
                                    <span>{item.itemName}</span>
                                    <span className="font-mono bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">{item.purchaseCount}</span>
                                </li>
                            ))}
                        </ul>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center">
                    No purchase data available for the selected filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

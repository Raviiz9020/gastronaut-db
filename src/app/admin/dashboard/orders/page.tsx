
'use client';

import { useOrder } from '@/context/order-context';
import { useDelivery } from '@/context/delivery-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Order, OrderStatus, CartItem, PaymentMethod, DeliveryOption, DeliveryBoy } from '@/types';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useMemo, useEffect, useRef, memo } from 'react';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, Star, Store, Wallet, Bike, CreditCard, Home, QrCode, ClipboardCheck, Utensils, Laptop, Edit, MessageSquare } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import ConfirmationDialog from '@/components/confirmation-dialog';
import CancellationReasonDialog from '@/components/cancellation-reason-dialog';
import { useVendor } from '@/context/vendor-context';
import { Switch } from '@/components/ui/switch';
import QrCodeDialog from '@/components/qr-code-dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


const statusColors: Record<OrderStatus, string> = {
  'Order Placed': 'bg-blue-500',
  'Accepted': 'bg-cyan-500',
  'Processing': 'bg-yellow-500',
  'Out for Delivery': 'bg-orange-500',
  'Delivered': 'bg-green-500',
  'Cancelled': 'bg-red-500',
  'Order Ready': 'bg-teal-500',
  'Picked Up': 'bg-green-500',
};

const activeStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Processing', 'Out for Delivery', 'Order Ready'];
const completedStatuses: OrderStatus[] = ['Delivered', 'Cancelled', 'Picked Up'];
const ORDERS_PER_PAGE = 10;

const homeDeliveryStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];
const selfPickupStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Order Ready', 'Picked Up', 'Cancelled'];
const dineInStatuses: OrderStatus[] = ['Processing', 'Delivered', 'Cancelled'];


const VendorResponseForm = ({ orderId, item }: { orderId: string; item: CartItem }) => {
    const { addResponseToOrderItem } = useOrder();
    const { toast } = useToast();
    const [response, setResponse] = useState(item.vendorResponse || '');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleSubmit = async () => {
        if (!response) return;
        await addResponseToOrderItem(orderId, item.cartItemId, response, item.name);
        toast({ title: "Response submitted!" });
    }

    const hasSubmittedResponse = !!item.vendorResponse;

    return (
        <>
        <div className="mt-2 space-y-2">
            <Label htmlFor={`response-${item.cartItemId}`} className="text-xs">Your Response:</Label>
            {hasSubmittedResponse ? (
                <p className="text-sm text-muted-foreground italic">"{item.vendorResponse}"</p>
            ) : (
                <>
                <Textarea 
                    id={`response-${item.cartItemId}`}
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Type your public response here..."
                    className="text-xs"
                    rows={2}
                />
                <Button size="sm" onClick={() => setIsConfirmOpen(true)} disabled={!response}>Submit</Button>
                </>
            )}
        </div>
         <ConfirmationDialog
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            onConfirm={() => {
                handleSubmit();
                setIsConfirmOpen(false);
            }}
            title="Confirm Response Submission"
            description={`Are you sure you want to submit the following response? "${response}"`}
        />
        </>
    )
}

const OrderTable = memo(({ ordersToShow, isCompletedTab = false, onStatusChange, onAssignDeliveryBoy, onShowQrCode, onEditOrder }: { 
    ordersToShow: Order[], 
    isCompletedTab?: boolean,
    onStatusChange: (order: Order, newStatus: OrderStatus) => void;
    onAssignDeliveryBoy: (orderId: string, deliveryBoyId: string) => void;
    onShowQrCode: (order: Order) => void;
    onEditOrder: (order: Order) => void;
}) => {
    const { deliveryTeam } = useDelivery();
    const { vendor } = useVendor();

    const formatAndMaskContact = (contact: string) => {
        if (!contact) return '';
        const cleaned = contact.replace('+91', '');
        if (cleaned.length <= 4) return cleaned;
        const lastFour = cleaned.slice(-4);
        return `xxxxxx${lastFour}`;
    };

    const getStatusOptions = (deliveryOption: DeliveryOption): OrderStatus[] => {
        switch (deliveryOption) {
            case 'Self Pickup': return selfPickupStatuses;
            case 'Dine-In': return dineInStatuses;
            case 'Home Delivery':
            default:
                return homeDeliveryStatuses;
        }
    }

    const DeliveryInfo = ({ order }: { order: Order }) => {
        const { deliveryOption } = order;
        const isDineIn = deliveryOption === 'Dine-In';

        return (
            <div className="space-y-1 text-xs text-muted-foreground mt-2">
                {deliveryOption && (
                    <div className="flex items-center gap-2">
                        {deliveryOption === 'Home Delivery' && <Bike className="h-4 w-4 text-orange-500"/>}
                        {deliveryOption === 'Self Pickup' && <Home className="h-4 w-4 text-purple-500"/>}
                        {isDineIn && <Utensils className="h-4 w-4 text-blue-500"/>}
                        <span>{deliveryOption}{isDineIn && order.customer.name.startsWith("Table") ? ` (${order.customer.name})` : ''}</span>
                    </div>
                )}
            </div>
        );
    };
    
    return (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Order ID</TableHead>
              <TableHead className="text-xs">Time</TableHead>
              <TableHead className="text-xs">Customer</TableHead>
              <TableHead className="text-xs">Items</TableHead>
              <TableHead className="text-xs">Total Price</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Delivery Agent</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordersToShow.length > 0 ? (
              ordersToShow.map(order => {
                const canShowPayButton = vendor?.upiId && !isCompletedTab && (
                    order.status === 'Accepted' || 
                    (order.deliveryOption === 'Dine-In' && order.status === 'Processing')
                );
                const canEditOrder = !isCompletedTab && activeStatuses.includes(order.status);


                return (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium text-xs">
                      {order.displayId || order.orderId}
                      <DeliveryInfo order={order}/>
                      <div className="flex items-center gap-1 mt-2">
                        {canShowPayButton && (
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onShowQrCode(order)}>
                                <QrCode className="h-3 w-3 mr-1"/> Pay
                            </Button>
                        )}
                        {canEditOrder && (
                            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => onEditOrder(order)}>
                                <Edit className="h-3 w-3 mr-1"/> Edit
                            </Button>
                        )}
                      </div>
                  </TableCell>
                  <TableCell className="text-xs">
                    {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yy HH:mm') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-xs">
                      <div>{order.customer.name}</div>
                      {order.deliveryOption !== 'Dine-In' && (
                        <>
                          <div className="text-muted-foreground">{order.customer.address}</div>
                          <a href={`tel:${order.customer.contact}`} className="text-muted-foreground hover:underline">
                              {formatAndMaskContact(order.customer.contact)}
                          </a>
                        </>
                      )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {order.customNotes && (
                        <div className="mb-2 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-500/30 dark:text-yellow-300 text-xs flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0"/>
                            <p className="italic">"{order.customNotes}"</p>
                        </div>
                    )}
                    {order.items.map((item, index) => (
                      <div key={item.cartItemId || index} className="py-2 border-b border-muted/20 last:border-b-0">
                        <div>{item.quantity}x {item.name}</div>
                        {isCompletedTab && item.rating !== undefined && (
                            <div className="mt-2 text-xs">
                                <div className="flex items-center gap-1">
                                   <Star className={cn("h-3 w-3", item.rating > 0 ? "text-amber-400 fill-amber-400" : "text-muted-foreground")} />
                                   {item.rating}
                                </div>
                                {item.feedback && <p className="text-muted-foreground italic">"{item.feedback}"</p>}
                                {item.rating < 3 && <VendorResponseForm orderId={order.orderId} item={item} />}
                            </div>
                        )}
                      </div>
                    ))}
                    {isCompletedTab && order.status === 'Cancelled' && order.cancellationReason && (
                        <div className="mt-2 text-xs text-destructive italic">
                            Reason: {order.cancellationReason}
                        </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">₹{order.totalPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value: OrderStatus) => onStatusChange(order, value)}
                      disabled={isCompletedTab}
                    >
                      <SelectTrigger className="w-[180px]">
                         <div className="flex items-center gap-2 text-xs">
                          <span className={cn('h-2 w-2 rounded-full', statusColors[order.status])} />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {getStatusOptions(order.deliveryOption).map(status => (
                          <SelectItem key={status} value={status}>
                            <div className={cn("flex items-center gap-2 text-xs", status === 'Out for Delivery' && 'text-xs')}>
                              <span className={cn('h-2 w-2 rounded-full', statusColors[status])} />
                              {status}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs">
                     {isCompletedTab ? (
                        order.assignedDeliveryBoyName || 'N/A'
                     ) : (
                        <Select
                            value={order.assignedDeliveryBoyId}
                            onValueChange={(deliveryBoyId: string) => onAssignDeliveryBoy(order.orderId, deliveryBoyId)}
                            disabled={isCompletedTab || deliveryTeam.length === 0 || order.deliveryOption !== 'Home Delivery'}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Assign Agent" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="unassigned" disabled>Unassigned</SelectItem>
                               {deliveryTeam.filter(boy => boy.isApproved).map(boy => (
                                   <SelectItem key={boy.id} value={boy.id}>{boy.name}</SelectItem>
                               ))}
                            </SelectContent>
                        </Select>
                     )}
                  </TableCell>
                </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  No orders found in this category.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        </div>
    );
});
OrderTable.displayName = 'OrderTable';

export default function AdminOrdersPage() {
  const { orders, updateOrderStatus, assignDeliveryBoyToOrder } = useOrder();
  const { deliveryTeam } = useDelivery();
  const { vendor, toggleShopOpenStatus } = useVendor();
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: new Date(), to: new Date() });
  const [filter, setFilter] = useState('today');
  const [currentPage, setCurrentPage] = useState(1);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [qrCodeOrder, setQrCodeOrder] = useState<Order | null>(null);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  const activeOrders = sortedOrders.filter(order => activeStatuses.includes(order.status));
  const allCompletedOrders = sortedOrders.filter(order => completedStatuses.includes(order.status));

  const filteredCompletedOrders = useMemo(() => {
    if (!dateRange?.from) {
        return allCompletedOrders;
    }
    return allCompletedOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(dateRange.from!);
        fromDate.setHours(0,0,0,0);
        const toDate = dateRange.to ? new Date(dateRange.to) : new Date(dateRange.from!);
        toDate.setHours(23,59,59,999);
        return orderDate >= fromDate && orderDate <= toDate;
    });
  }, [allCompletedOrders, dateRange]);

  const totalPages = Math.ceil(filteredCompletedOrders.length / ORDERS_PER_PAGE);
  const paginatedCompletedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ORDERS_PER_PAGE;
    return filteredCompletedOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [filteredCompletedOrders, currentPage]);

  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    if (newStatus === 'Cancelled') {
      setOrderToCancel(order);
    } else {
      updateOrderStatus(order.orderId, newStatus);
    }
  };
  
  const handleAssignDeliveryBoy = (orderId: string, deliveryBoyId: string) => {
    assignDeliveryBoyToOrder(orderId, deliveryBoyId, deliveryTeam);
  };

  const handleEditOrder = (order: Order) => {
    const vendorIdentifier = vendor?.slug || vendor?.username;
    if (vendorIdentifier) {
        router.push(`/vendor/${vendorIdentifier}?edit_order=${order.orderId}`);
    }
  };

  const handleCancellationConfirm = (reason: string) => {
    if (orderToCancel) {
      updateOrderStatus(orderToCancel.orderId, 'Cancelled', reason);
      setOrderToCancel(null);
    }
  };

  const handleFilterChange = (value: string) => {
    setFilter(value);
    setCurrentPage(1);
    const now = new Date();
    switch (value) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'last7':
        setDateRange({ from: subDays(now, 6), to: now });
        break;
      case 'thisMonth':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'thisYear':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
      case 'all':
      default:
        setDateRange(undefined);
        break;
    }
  };

  const handleShopStatusToggle = async () => {
    if (vendor) {
        await toggleShopOpenStatus(vendor.username, vendor.isShopOpen ?? true);
    }
  }


  return (
    <div className="flex-1 space-y-8 p-8 pt-6">
       <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
       </div>
       <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-semibold text-sm">
                <Store className="h-4 w-4"/>
                <span>Shop Status:</span>
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="shop-status-switch"
                    checked={vendor?.isShopOpen ?? true}
                    onCheckedChange={handleShopStatusToggle}
                />
            </div>
            <Link href="/admin/dashboard/orders/live" passHref>
                <Button variant="outline">
                    <Laptop className="mr-2 h-4 w-4"/> Full Screen
                </Button>
            </Link>
        </div>

       <Tabs defaultValue="active" className="w-full">
            <TabsList className="rounded-full">
                <TabsTrigger value="active" className="rounded-full">Active Orders ({activeOrders.length})</TabsTrigger>
                <TabsTrigger value="completed" className="rounded-full">All Orders ({filteredCompletedOrders.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="active">
                <Card className="rounded-3xl">
                    <CardHeader>
                    <CardTitle>Active Orders</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <OrderTable 
                            ordersToShow={activeOrders} 
                            onStatusChange={handleStatusChange} 
                            onAssignDeliveryBoy={handleAssignDeliveryBoy}
                            onShowQrCode={setQrCodeOrder}
                            onEditOrder={handleEditOrder}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="completed">
                 <Card className="rounded-3xl">
                    <CardHeader>
                        <div className="flex flex-col md:flex-row md:items-center justify-end gap-2">
                           <Select value={filter} onValueChange={handleFilterChange}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Select date range" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="last7">Last 7 Days</SelectItem>
                                <SelectItem value="thisMonth">This Month</SelectItem>
                                <SelectItem value="thisYear">This Year</SelectItem>
                                <SelectItem value="all">Select Range</SelectItem>
                            </SelectContent>
                            </Select>
                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-full md:w-auto justify-start text-left font-normal",
                                        !dateRange && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                        dateRange.to ? (
                                        <>
                                            {format(dateRange.from, "LLL dd, y")} -{" "}
                                            {format(dateRange.to, "LLL dd, y")}
                                        </>
                                        ) : (
                                        format(dateRange.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Pick a date range</span>
                                    )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                    <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={(newDate) => {
                                        setDateRange(newDate);
                                        if (newDate?.to) {
                                            setIsCalendarOpen(false);
                                        }
                                        if (newDate) {
                                            setFilter('custom');
                                        }
                                    }}
                                    numberOfMonths={1}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-sm font-medium">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                </Button>
                            </div>
                        )}
                    </CardHeader>
                    <CardContent>
                        <OrderTable 
                            ordersToShow={paginatedCompletedOrders} 
                            isCompletedTab={true}
                            onStatusChange={handleStatusChange} 
                            onAssignDeliveryBoy={handleAssignDeliveryBoy}
                            onShowQrCode={setQrCodeOrder}
                            onEditOrder={handleEditOrder}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        <CancellationReasonDialog
            isOpen={!!orderToCancel}
            onOpenChange={() => setOrderToCancel(null)}
            onConfirm={handleCancellationConfirm}
        />
        {qrCodeOrder && vendor && (
            <QrCodeDialog
                order={qrCodeOrder}
                vendor={vendor}
                isOpen={!!qrCodeOrder}
                onOpenChange={() => setQrCodeOrder(null)}
            />
        )}
    </div>
  );
}




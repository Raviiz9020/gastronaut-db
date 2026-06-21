
'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useOrder } from '@/context/order-context';
import type { Order, OrderStatus, CartItem, DeliveryOption, DeliveryBoy, Vendor } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { format } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { useVendor } from '@/context/vendor-context';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Package, User, Utensils, Bike, Home, Store, QrCode, PlusCircle, Edit, MessageSquare, MapPin } from 'lucide-react';
import Link from 'next/link';
import CancellationReasonDialog from '@/components/cancellation-reason-dialog';
import { useDelivery } from '@/context/delivery-context';
import QrCodeDialog from '@/components/qr-code-dialog';


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
const homeDeliveryStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Processing', 'Out for Delivery', 'Delivered', 'Cancelled'];
const selfPickupStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Order Ready', 'Picked Up', 'Cancelled'];
const dineInStatuses: OrderStatus[] = ['Processing', 'Delivered', 'Cancelled'];

const LiveOrderCard = ({ order, vendor, onStatusChange, onAssignDelivery, onPayClick, onEditOrder, deliveryTeam }: { 
    order: Order; 
    vendor?: Vendor;
    onStatusChange: (order: Order, newStatus: OrderStatus) => void,
    onAssignDelivery: (orderId: string, deliveryBoyId: string) => void;
    onPayClick: (order: Order) => void;
    onEditOrder: (order: Order) => void;
    deliveryTeam: DeliveryBoy[];
}) => {

    const getStatusOptions = (deliveryOption: DeliveryOption): OrderStatus[] => {
        switch (deliveryOption) {
            case 'Self Pickup': return selfPickupStatuses;
            case 'Dine-In': return dineInStatuses;
            case 'Home Delivery':
            default:
                return homeDeliveryStatuses;
        }
    }
    
    const isAssignable = order.deliveryOption === 'Home Delivery' && !order.assignedDeliveryBoyId;
    
    const qrCodeStatuses: OrderStatus[] = ['Accepted', 'Processing', 'Out for Delivery', 'Order Ready'];
    const canShowPayButton = qrCodeStatuses.includes(order.status) && vendor?.upiId;
    const isDineIn = order.deliveryOption === 'Dine-In';

    const DeliveryInfo = ({ deliveryOption }: { deliveryOption?: DeliveryOption }) => (
        <div className="space-y-1 text-sm text-muted-foreground mt-2">
            {deliveryOption && (
                 <div className="flex items-center gap-2">
                    {deliveryOption === 'Home Delivery' && <Bike className="h-4 w-4 text-orange-500"/>}
                    {deliveryOption === 'Self Pickup' && <Home className="h-4 w-4 text-purple-500"/>}
                    {isDineIn && <Utensils className="h-5 w-5 text-blue-400"/>}
                    <span className={cn(isDineIn && "font-bold text-blue-400")}>{deliveryOption}</span>
                </div>
            )}
        </div>
    );

    return (
        <Card className={cn(
            "rounded-2xl w-full flex flex-col bg-card/80 backdrop-blur-sm",
            isDineIn && "bg-blue-500/10 border border-blue-500/20"
        )}>
            <CardHeader className="flex flex-row items-start justify-between gap-4 p-4">
                <div className="space-y-1">
                    <CardTitle className="text-xl font-bold">Order {order.displayId || `#${order.orderId}`}</CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <User className="h-3 w-3"/>
                        {order.customer.name}
                    </div>
                     {order.customer.address && order.deliveryOption !== 'Dine-In' && (
                        <div className="text-xs text-muted-foreground flex items-start gap-2">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0"/>
                            <span>{order.customer.address}</span>
                        </div>
                    )}
                     <DeliveryInfo deliveryOption={order.deliveryOption} />
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                        {order.createdAt ? format(new Date(order.createdAt), 'hh:mm a') : 'N/A'}
                    </p>
                    <p className="text-lg font-bold text-primary">₹{order.totalPrice.toFixed(2)}</p>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 flex-1">
                <Separator className="mb-3"/>
                {order.customNotes && (
                    <div className="mb-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-500/30 dark:text-yellow-300 text-sm flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0"/>
                        <p className="italic">"{order.customNotes}"</p>
                    </div>
                )}
                <div className="space-y-2">
                    {order.items.map(item => (
                      <div key={item.cartItemId || item.name} className="flex flex-col gap-1 py-1">
                        <div className="flex justify-between items-center text-sm">
                          <span className="font-medium">{item.quantity}x {item.name}</span>
                          <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {(item.customizationDetails && Object.entries(item.customizationDetails).length > 0) ? (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.customizationDetails).map(([custId, value]) => {
                                const group = item.customizations?.find(c => c.id === custId);
                                if (!group) return null;
                                const selectedNames = (Array.isArray(value) ? value : [value])
                                    .map(optId => group.options.find(o => o.id === optId)?.name)
                                    .filter(Boolean);
                                if (selectedNames.length === 0) return null;
                                return (
                                    <span key={custId} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                        {group.name}: {selectedNames.join(', ')}
                                    </span>
                                );
                            })}
                          </div>
                        ) : (
                          item.customizations && item.customizations.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {item.customizations.map((group: any) => (
                                <span key={group.id} className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                                  {group.name}: {group.options.map((o: any) => o.name).join(', ')}
                                </span>
                              ))}
                            </div>
                          )
                        )}
                      </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="p-4 flex flex-col gap-2">
                 <Select 
                    value={order.status}
                    onValueChange={(value: OrderStatus) => onStatusChange(order, value)}
                >
                    <SelectTrigger className="w-full">
                        <div className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', statusColors[order.status])} />
                            <SelectValue />
                        </div>
                    </SelectTrigger>
                    <SelectContent>
                        {getStatusOptions(order.deliveryOption).map(status => (
                            <SelectItem key={status} value={status}>
                                <div className="flex items-center gap-2">
                                    <span className={cn('h-2 w-2 rounded-full', statusColors[status])} />
                                    {status}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 {isAssignable && (
                    <Select
                        onValueChange={(deliveryBoyId: string) => onAssignDelivery(order.orderId, deliveryBoyId)}
                        disabled={deliveryTeam.length === 0}
                    >
                        <SelectTrigger className="w-full">
                            <div className="flex items-center gap-2 text-sm">
                               <Bike className="h-4 w-4"/>
                               <SelectValue placeholder="Assign Delivery Agent" />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="unassigned" disabled>Unassigned</SelectItem>
                           {deliveryTeam.filter(boy => boy.isApproved).map(boy => (
                               <SelectItem key={boy.id} value={boy.id}>{boy.name}</SelectItem>
                           ))}
                        </SelectContent>
                    </Select>
                )}
                 <div className="flex w-full gap-2">
                    <Button variant="outline" className="w-full" onClick={() => onEditOrder(order)}>
                        <Edit className="h-4 w-4 mr-2"/>
                        Edit
                    </Button>
                    {canShowPayButton && (
                        <Button variant="outline" className="w-full" onClick={() => onPayClick(order)}>
                            <QrCode className="h-4 w-4 mr-2"/>
                            Pay
                        </Button>
                    )}
                 </div>
            </CardFooter>
        </Card>
    )
};


export default function LiveOrdersPage() {
    const { orders, updateOrderStatus, assignDeliveryBoyToOrder } = useOrder();
    const { vendor } = useVendor();
    const { deliveryTeam } = useDelivery();
    const router = useRouter();
    const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
    const [qrCodeOrder, setQrCodeOrder] = useState<Order | null>(null);

    useEffect(() => {
        if (!vendor) {
            router.replace('/admin/login');
        }
    }, [vendor, router]);
    
    const activeOrders = useMemo(() => {
        if (!vendor) return [];
        return [...orders]
          .filter(order => order.vendorUsername === vendor.username && activeStatuses.includes(order.status))
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }, [orders, vendor]);

    if (!vendor) {
        return null; // or a loading spinner
    }
    
    const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
        if (newStatus === 'Cancelled') {
            setOrderToCancel(order);
        } else {
            updateOrderStatus(order.orderId, newStatus);
        }
    };
    
    const handleCancellationConfirm = (reason: string) => {
        if (orderToCancel) {
            updateOrderStatus(orderToCancel.orderId, 'Cancelled', reason);
            setOrderToCancel(null);
        }
    };

    const handleAssignDelivery = (orderId: string, deliveryBoyId: string) => {
        assignDeliveryBoyToOrder(orderId, deliveryBoyId, deliveryTeam);
    };

    const handleEditOrder = (order: Order) => {
        const vendorIdentifier = vendor?.slug || vendor?.username;
        if (vendorIdentifier) {
            router.push(`/vendor/${vendorIdentifier}?edit_order=${order.orderId}`);
        }
    };


    const vendorUrl = `/vendor/${vendor.slug || vendor.username}`;

    return (
        <>
            <div className="flex flex-col h-screen bg-background">
                <header className="flex items-center justify-between p-4 border-b border-primary/20">
                    <h1 className="text-2xl font-bold font-headline text-primary">Live Orders</h1>
                    <div className="flex items-center gap-2">
                        <Link href="/admin/dashboard/orders" passHref>
                            <Button variant="outline">
                                <ArrowLeft className="mr-2 h-4 w-4"/> Dashboard
                            </Button>
                        </Link>
                    </div>
                </header>
                <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                    {activeOrders.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {activeOrders.map(order => (
                                <LiveOrderCard 
                                    key={order.orderId}
                                    order={order}
                                    vendor={vendor}
                                    onStatusChange={handleStatusChange}
                                    onAssignDelivery={handleAssignDelivery}
                                    onPayClick={setQrCodeOrder}
                                    onEditOrder={handleEditOrder}
                                    deliveryTeam={deliveryTeam}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-32 flex flex-col items-center gap-4 bg-card rounded-2xl">
                            <Package className="h-16 w-16 text-muted-foreground"/>
                            <h3 className="text-2xl font-semibold">All caught up!</h3>
                            <p className="text-muted-foreground">New orders will appear here automatically.</p>
                        </div>
                    )}
                </main>
            </div>
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
        </>
    );
}

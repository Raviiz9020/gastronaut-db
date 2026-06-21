'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useRider } from '@/context/rider-context';
import { useRouter } from 'next/navigation';
import { useOrder } from '@/context/order-context';
import { useVendor } from '@/context/vendor-context';
import type { Order, OrderStatus, Vendor } from '@/types';
import { LogOut, Package, CheckCircle, XCircle, Building, User, Phone, MapPin, Utensils, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import CancellationReasonDialog from '@/components/cancellation-reason-dialog';
import { useToast } from '@/hooks/use-toast';
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

const playSound = () => {
    try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (!audioContext) return;
        
        const playTone = (frequency: number, startTime: number, duration: number) => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(frequency, startTime);
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.01);

            oscillator.start(startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.00001, startTime + duration);
            oscillator.stop(startTime + duration);
        }

        const now = audioContext.currentTime;
        playTone(880, now, 0.15);
        playTone(880, now + 0.2, 0.15);

    } catch(e) {
        console.error("Could not play sound", e);
    }
};

const RiderOrderCard = ({ order, vendor, onStatusChange, onPayClick }: { order: Order; vendor?: Vendor, onStatusChange: (order: Order, status: OrderStatus) => void, onPayClick: (order: Order) => void }) => {
    return (
        <Card className="rounded-2xl w-full">
            <div className="p-4 flex flex-col sm:flex-row items-start gap-4">
                <div className="p-3 bg-muted rounded-full hidden sm:block">
                    <Package className="h-6 w-6 text-green-500" />
                </div>
                
                <div className="flex-1 flex flex-col md:flex-row justify-between w-full gap-4">
                    {/* Column 1: Order & Vendor */}
                    <div className="flex-1 space-y-2">
                        <h3 className="font-bold text-base">Order {order.displayId || `#${order.orderId}`}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Building className="h-4 w-4"/> {vendor?.shopName || order.vendorUsername}
                        </p>
                    </div>

                    {/* Column 2: Customer Details */}
                    <div className="flex-1 space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2"><User className="h-4 w-4"/>{order.customer.name}</p>
                        <p className="flex items-center gap-2"><MapPin className="h-4 w-4"/>{order.customer.address}</p>
                        <p className="flex items-center gap-2"><Phone className="h-4 w-4"/>{order.customer.contact}</p>
                    </div>

                    {/* Column 3: Items */}
                    <div className="flex-1 text-sm">
                        <p className="font-semibold flex items-center gap-2 mb-1"><Utensils className="h-4 w-4"/>Items:</p>
                        <ul className="list-disc list-inside text-muted-foreground">
                            {order.items.map(item => (
                                <li key={item.cartItemId}>{item.quantity}x {item.name}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-end gap-2 w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:border-none">
                    <p className="text-lg font-bold text-primary">₹{order.totalPrice.toFixed(2)}</p>
                     <Select 
                        value={order.status}
                        onValueChange={(value: OrderStatus) => onStatusChange(order, value)}
                    >
                        <SelectTrigger className="w-full sm:w-[180px]">
                            <div className="flex items-center gap-2">
                                <span className={cn('h-2 w-2 rounded-full', statusColors[order.status])} />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            {['Out for Delivery', 'Delivered', 'Cancelled'].map(status => (
                                <SelectItem key={status} value={status}>
                                    <div className={cn("flex items-center gap-2", status === 'Out for Delivery' && 'text-xs')}>
                                        <span className={cn('h-2 w-2 rounded-full', statusColors[status as OrderStatus])} />
                                        {status}
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     {vendor?.upiId && (
                        <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 px-3 text-xs" onClick={() => onPayClick(order)}>
                            <QrCode className="h-3 w-3 mr-1"/> Pay
                        </Button>
                    )}
                </div>
            </div>
        </Card>
    )
};


export default function RiderDashboardPage() {
    const { rider, logout } = useRider();
    const router = useRouter();
    const [isClient, setIsClient] = useState(false);
    
    const { vendors, fetchAllVendors } = useVendor();
    const { updateOrderStatus } = useOrder();
    const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
    const [completedTodayCount, setCompletedTodayCount] = useState(0);

    const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
    const [qrCodeOrder, setQrCodeOrder] = useState<Order | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        setIsClient(true);
        if (!rider) {
            router.replace('/rider/login');
        } else {
            fetchAllVendors();
        }
    }, [rider, router, fetchAllVendors]);

    // Fetch historical data (completed today) once on load
    useEffect(() => {
        if (!isClient || !rider) return;

        const fetchCompletedToday = async () => {
            const todayStr = new Date().toISOString().split('T')[0];
            const ordersRef = collection(db, 'orders');
            const q = query(
                ordersRef,
                where('assignedDeliveryBoyId', '==', rider.id),
                where('status', 'in', ['Delivered', 'Picked Up']),
                where('createdAt', '>=', `${todayStr}T00:00:00.000Z`),
                where('createdAt', '<=', `${todayStr}T23:59:59.999Z`)
            );
            const snapshot = await getDocs(q);
            setCompletedTodayCount(snapshot.size);
        };

        fetchCompletedToday();
    }, [isClient, rider]);

    // Set up real-time listener for active orders
    useEffect(() => {
        if (!isClient || !rider) return;

        const ordersRef = collection(db, 'orders');
        const q = query(
            ordersRef,
            where('assignedDeliveryBoyId', '==', rider.id),
            where('status', 'in', ['Processing', 'Out for Delivery', 'Order Ready'])
        );
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeOrdersData = snapshot.docs.map(doc => ({
                orderId: doc.id,
                ...doc.data()
            } as Order));
            
            const sortedOrders = activeOrdersData.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            setAssignedOrders(sortedOrders);
        }, (error) => {
            console.error("Error fetching active orders in real-time:", error);
        });

        return () => unsubscribe();
    }, [isClient, rider]);

    const previousAssignedOrderCount = useRef(assignedOrders.length);
    useEffect(() => {
        if (!isClient || !rider) return;
        
        if (assignedOrders.length > previousAssignedOrderCount.current) {
            playSound();
            const newOrder = assignedOrders[0]; // Assuming latest is first
            toast({
                title: 'New Delivery Assigned!',
                description: `Order ${(newOrder.displayId || `#${newOrder.orderId}`).substring(0,6).toUpperCase()} from ${newOrder.customer.name} is ready for pickup.`,
                duration: 10000,
            });
        }
        
        previousAssignedOrderCount.current = assignedOrders.length;
    }, [assignedOrders, isClient, rider, toast]);

    
    const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
        if (newStatus === 'Cancelled') {
            setOrderToCancel(order);
        } else {
            updateOrderStatus(order.orderId, newStatus);
            if (newStatus === 'Delivered' || newStatus === 'Picked Up') {
                 setCompletedTodayCount(c => c + 1);
            }
        }
    };
    
    const handleCancellationConfirm = (reason: string) => {
        if (orderToCancel) {
          updateOrderStatus(orderToCancel.orderId, 'Cancelled', reason);
          setOrderToCancel(null);
        }
    };


    const handleLogout = () => {
        logout();
        router.push('/');
    };

    if (!isClient || !rider) {
        return null; // Or a loading spinner
    }

    return (
        <div className="flex flex-col h-screen">
            <header className="flex items-center justify-between p-4 border-b border-green-500/20">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <img src={rider.image} alt={rider.name} className="w-full h-full object-cover rounded-full"/>
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">Welcome, {rider.name}!</h1>
                        <p className="text-sm text-muted-foreground">Ready for today's deliveries?</p>
                    </div>
                </div>
                <Button variant="destructive" onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4"/>
                    Logout
                </Button>
            </header>
            <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <Card className="bg-card border-green-500/20 rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Active Deliveries</CardTitle>
                            <Package className="h-6 w-6 text-green-500"/>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{assignedOrders.length}</p>
                            <p className="text-muted-foreground">Orders currently assigned to you</p>
                        </CardContent>
                    </Card>
                     <Card className="bg-card border-green-500/20 rounded-2xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Completed Today</CardTitle>
                            <CheckCircle className="h-6 w-6 text-green-500"/>
                        </CardHeader>
                        <CardContent>
                            <p className="text-4xl font-bold">{completedTodayCount}</p>
                            <p className="text-muted-foreground">Orders you've delivered today</p>
                        </CardContent>
                    </Card>
                </div>
                
                <h2 className="text-2xl font-bold mb-4">Assigned Orders</h2>

                {assignedOrders.length > 0 ? (
                    <div className="space-y-4">
                        {assignedOrders.map(order => (
                            <RiderOrderCard 
                                key={order.orderId}
                                order={order}
                                vendor={vendors.find(v => v.username === order.vendorUsername)}
                                onStatusChange={handleStatusChange}
                                onPayClick={setQrCodeOrder}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 flex flex-col items-center gap-4 bg-card rounded-2xl">
                        <Package className="h-16 w-16 text-muted-foreground"/>
                        <h3 className="text-xl font-semibold">No active deliveries</h3>
                        <p className="text-muted-foreground">New orders assigned to you will appear here.</p>
                    </div>
                )}
            </main>
             <CancellationReasonDialog
                isOpen={!!orderToCancel}
                onOpenChange={() => setOrderToCancel(null)}
                onConfirm={handleCancellationConfirm}
            />
            {qrCodeOrder && (
                <QrCodeDialog
                    order={qrCodeOrder}
                    vendor={vendors.find(v => v.username === qrCodeOrder.vendorUsername)}
                    isOpen={!!qrCodeOrder}
                    onOpenChange={() => setQrCodeOrder(null)}
                />
            )}
        </div>
    );
}

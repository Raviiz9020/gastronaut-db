
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Cpu, Home, Loader2, Rocket, Utensils, PackageSearch, Package, History, Bike, Star, Building, MessageSquareReply, Calendar as CalendarIcon, Phone, XCircle, ArrowLeft, QrCode, ClipboardCheck, ShoppingCart, MessageSquare, Award, Download, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useOrder } from '@/context/order-context';
import { useCustomer } from '@/context/customer-context';
import { useMenu } from '@/context/menu-context';
import { useCart } from '@/context/cart-context';
import type { Order, OrderStatus, DeliveryBoy, CartItem, Vendor, MenuItem } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useDelivery } from '@/context/delivery-context';
import StarRating from '@/components/star-rating';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useVendor } from '@/context/vendor-context';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ConfirmationDialog from '@/components/confirmation-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import QrCodeDialog from '@/components/qr-code-dialog';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createSlug } from '@/lib/utils';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { usePathname } from 'next/navigation';
import { VendorStatusManager, isItemInStock } from '@/lib/vendorStatusManager';
import { VendorStatus } from '@/types';

const statusConfig: Record<OrderStatus, { name: OrderStatus; icon: React.ReactNode; index: number }> = {
  'Order Placed': { name: 'Order Placed', icon: <CheckCircle className="h-5 w-5" />, index: 0 },
  'Accepted': { name: 'Accepted', icon: <ClipboardCheck className="h-5 w-5" />, index: 1 },
  'Processing': { name: 'Processing', icon: <Cpu className="h-5 w-5" />, index: 2 },
  'Out for Delivery': { name: 'Out for Delivery', icon: <Rocket className="h-5 w-5" />, index: 3 },
  'Delivered': { name: 'Delivered', icon: <Home className="h-5 w-5" />, index: 4 },
  'Cancelled': { name: 'Cancelled', icon: <PackageSearch className="h-5 w-5" />, index: 0 },
  'Order Ready': { name: 'Order Ready', icon: <Package className="h-5 w-5" />, index: 2 },
  'Picked Up': { name: 'Picked Up', icon: <Home className="h-5 w-5" />, index: 3 },
};

const homeDeliveryStatuses = [
    statusConfig['Order Placed'], 
    statusConfig['Accepted'],
    statusConfig['Processing'], 
    statusConfig['Out for Delivery'], 
    statusConfig['Delivered']
];
const selfPickupStatuses = [
    statusConfig['Order Placed'],
    statusConfig['Accepted'],
    statusConfig['Order Ready'],
    statusConfig['Picked Up']
];
const activeStatuses: OrderStatus[] = ['Order Placed', 'Accepted', 'Processing', 'Out for Delivery', 'Order Ready'];
const completedStatuses: OrderStatus[] = ['Delivered', 'Cancelled', 'Picked Up'];
const ORDERS_PER_PAGE = 4;

const AutoSizingTextarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => {
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [props.value]);

    return <Textarea ref={textareaRef} rows={1} {...props} />;
};


const OrderItemRating = ({
  orderId,
  item,
  onRating,
  onFeedbackSubmit
}: {
  orderId: string;
  item: CartItem;
  onRating: (rating: number) => void;
  onFeedbackSubmit: (feedback: string) => void;
}) => {
  const [feedback, setFeedback] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    setFeedback(item.feedback || '');
    setShowFeedback(!!item.feedback || (item.rating !== undefined && item.rating < 3));
  }, [item.feedback, item.rating]);

  const handleSubmitClick = () => {
    if (feedback.trim()) {
        setIsConfirmOpen(true);
    }
  }

  const handleRatingAndShowFeedback = (rating: number) => {
    onRating(rating);
    if(rating < 3) {
      setShowFeedback(true);
    } else {
      setShowFeedback(false);
    }
  }

  return (
    <div className="mt-2 space-y-2">
        <div className="flex items-center gap-4">
            <span className="text-xs">{item.quantity}x {item.name}</span>
            <StarRating rating={item.rating || 0} onRate={handleRatingAndShowFeedback} starSize="h-4 w-4" />
        </div>
        {showFeedback && (
            <div className="space-y-2 pt-1 pl-6">
                {item.feedback ? (
                    <p className="text-sm text-muted-foreground italic">"{item.feedback}"</p>
                ) : (
                    <>
                        <AutoSizingTextarea 
                            placeholder="Tell us what went wrong..." 
                            value={feedback} 
                            onChange={(e) => setFeedback(e.target.value)}
                        />
                        <Button size="sm" onClick={handleSubmitClick} disabled={!feedback}>
                            Submit
                        </Button>
                    </>
                )}
            </div>
        )}
        {item.vendorResponse && (
            <div className="mt-3 pl-6 text-sm">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                    <MessageSquareReply className="h-4 w-4 text-primary"/>
                    Vendor's Response
                </div>
                <p className="mt-1 text-muted-foreground italic">"{item.vendorResponse}"</p>
            </div>
        )}
        <ConfirmationDialog
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            onConfirm={() => {
                onFeedbackSubmit(feedback);
                setIsConfirmOpen(false);
            }}
            title="Confirm Feedback Submission"
            description={`Are you sure you want to submit the following feedback? "${feedback}"`}
        />
    </div>
  );
};


const VendorRating = ({ order, vendor }: { order: Order; vendor?: Vendor }) => {
    const { addRatingToVendor } = useOrder();
    const { toast } = useToast();
    const [feedback, setFeedback] = useState(order.vendorFeedback || '');
    const [showFeedback, setShowFeedback] = useState(!!order.vendorFeedback || (order.vendorRating !== undefined && order.vendorRating < 3));
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    useEffect(() => {
        setFeedback(order.vendorFeedback || '');
        setShowFeedback(!!order.vendorFeedback || (order.vendorRating !== undefined && order.vendorRating < 3));
    }, [order.vendorFeedback, order.vendorRating]);

    const handleRating = async (rating: number) => {
        await addRatingToVendor(order.orderId, rating);
        if (rating < 3) {
            setShowFeedback(true);
        } else {
             setShowFeedback(false);
             setFeedback('');
             if (!order.vendorFeedback) {
                toast({ title: 'Vendor Rating Submitted!', description: 'Thank you for helping us improve.' });
            }
        }
    }

    const handleFeedbackSubmit = async () => {
        if (order.vendorRating === undefined) return;
        await addRatingToVendor(order.orderId, order.vendorRating, feedback);
        toast({ title: 'Vendor Feedback Submitted!', description: 'Thank you for helping us improve.' });
    }
    
    return (
        <>
        <div className="text-right">
             <div className="flex items-center justify-end gap-2">
                <h4 className="whitespace-nowrap text-xs">
                   Rate {vendor?.shopName || vendor?.name || 'Vendor'}:
                </h4>
                <StarRating rating={order.vendorRating || 0} onRate={handleRating} starSize="h-4 w-4"/>
            </div>
            <div className="mt-2 space-y-2">
                {showFeedback && (
                    <div className="space-y-2 pt-1 text-left">
                         {order.vendorFeedback ? (
                            <p className="text-sm text-muted-foreground italic">"{order.vendorFeedback}"</p>
                         ) : (
                            <>
                                <AutoSizingTextarea 
                                    placeholder="Tell us about your experience with the vendor..." 
                                    value={feedback} 
                                    onChange={(e) => setFeedback(e.target.value)}
                                />
                                <Button size="sm" onClick={() => setIsConfirmOpen(true)} disabled={!feedback}>Submit</Button>
                            </>
                         )}
                    </div>
                )}
            </div>
        </div>
        <ConfirmationDialog
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            onConfirm={() => {
                handleFeedbackSubmit();
                setIsConfirmOpen(false);
            }}
            title="Confirm Feedback Submission"
            description={`Are you sure you want to submit the following feedback? "${feedback}"`}
        />
        </>
    )
}

const OrderCard = ({ order, vendor, onPayClick, onOrderAgain }: { order: Order; vendor?: Vendor, onPayClick: (order: Order) => void, onOrderAgain: (order: Order) => void }) => {
  const { addRatingToOrderItem } = useOrder();
  
  const handleRating = async (itemIndex: number, rating: number) => {
    await addRatingToOrderItem(order.orderId, itemIndex, rating);
  };

  const handleFeedbackSubmit = async (itemIndex: number, feedback: string) => {
    const item = order.items[itemIndex];
    if (item?.rating !== undefined) {
      await addRatingToOrderItem(order.orderId, itemIndex, item.rating, feedback);
    }
  };
  
  const currentStatusIndex = statusConfig[order.status]?.index ?? -1;
  const progressStatuses = order.deliveryOption === 'Self Pickup' ? selfPickupStatuses : homeDeliveryStatuses;
  const progress = currentStatusIndex !== -1 ? ((currentStatusIndex + 1) / progressStatuses.length) * 100 : 0;
  const isOrderActive = activeStatuses.includes(order.status);
  const isOrderCompleted = completedStatuses.includes(order.status) && order.status !== 'Cancelled';
  
  const showQrCodeButton = useMemo(() => {
    if (!vendor?.upiId) return false;
    const qrCodeStatuses: OrderStatus[] = ['Accepted', 'Processing', 'Out for Delivery', 'Order Ready'];
    return qrCodeStatuses.includes(order.status);
  }, [order.status, vendor?.upiId]);

  const generatePdfReceipt = () => {
    if (!vendor) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(vendor.shopName || 'Receipt', pageWidth / 2, 20, { align: 'center' });
    
    if (vendor.address) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(vendor.address, pageWidth / 2, 26, { align: 'center' });
    }
    
    doc.setFontSize(10);
    doc.text(`Order: #${order.displayId}`, 15, 35);
    doc.text(`Date: ${format(new Date(order.createdAt), 'dd/MM/yyyy hh:mm a')}`, pageWidth - 15, 35, { align: 'right' });
    
    doc.line(15, 40, pageWidth - 15, 40);

    // Table
    autoTable(doc, {
      startY: 42,
      head: [['Qty', 'Item', 'Price']],
      body: order.items.map(item => [
          item.quantity.toString(),
          item.name,
          `Rs. ${(item.price * item.quantity).toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fontStyle: 'bold', fillColor: [30, 144, 255] },
      columnStyles: {
          0: { halign: 'right', cellWidth: 15 },
          1: { halign: 'left' },
          2: { halign: 'right', cellWidth: 30 }
      },
    });

    // Total
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.line(15, finalY + 5, pageWidth - 15, finalY + 5);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL', 15, finalY + 12);
    doc.text(`Rs. ${order.totalPrice.toFixed(2)}`, pageWidth - 15, finalY + 12, { align: 'right' });

    // Footer
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text('Thank you for your order!', pageWidth / 2, finalY + 22, { align: 'center' });
    
    doc.save(`receipt-${order.displayId}.pdf`);
  };

  return (
      <Card className="rounded-3xl bg-card/80 backdrop-blur-sm border-primary/10">
          <CardHeader className="flex flex-col">
              <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xs text-primary">{order.displayId || order.orderId}</h3>
                    {vendor && (
                         <div className="text-xs mt-1 flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Building className="h-3 w-3 text-muted-foreground"/>
                                <span className="text-xs text-foreground font-semibold">From: {vendor.shopName || vendor.name}</span>
                            </div>
                            {vendor.contact && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-3 w-3 text-muted-foreground"/>
                                    <a href={`tel:${vendor.contact}`} className="text-xs text-muted-foreground hover:underline">{vendor.contact.replace('+91','')}</a>
                                </div>
                            )}
                        </div>
                    )}
                  </div>
                   <div className="text-right">
                        <span className="text-sm font-semibold text-foreground">
                          ₹{order.totalPrice.toFixed(2)}
                        </span>
                        {typeof order.pointsEarned === 'number' && order.pointsEarned > 0 && (
                            <div className={cn(
                                "flex justify-end items-center gap-1 mt-1 text-xs",
                                order.status === 'Cancelled'
                                    ? "text-muted-foreground line-through"
                                    : "text-green-600 dark:text-green-400"
                            )}>
                                <Award className="h-3 w-3" />
                                <span>+ {order.pointsEarned} HP</span>
                            </div>
                        )}
                   </div>
              </div>
               <CardDescription className="space-y-1 !mt-2">
                  <div className="text-xs">
                    Status: <span className="text-foreground">{order.status}</span>
                    {order.createdAt && (
                        <span className="text-xs text-muted-foreground ml-2">
                            ({format(new Date(order.createdAt), "dd/MM/yy HH:mm")})
                        </span>
                    )}
                  </div>
                   {order.assignedDeliveryBoyName && (order.status === 'Out for Delivery' || order.status === 'Delivered') && (
                        <div className="text-xs text-muted-foreground pt-1 flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Bike className="h-4 w-4"/>
                                <span>Delivery by: <span className="text-foreground">{order.assignedDeliveryBoyName}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3"/>
                                <a href={`tel:${order.assignedDeliveryBoyContact}`} className="text-xs text-muted-foreground hover:underline">{order.assignedDeliveryBoyContact?.replace('+91','')}</a>
                            </div>
                        </div>
                    )}
               </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              {isOrderActive && (
                 <div className="space-y-3">
                    <Progress value={progress} className="h-2 bg-primary/20" />
                    <div className="flex justify-between text-muted-foreground">
                        {progressStatuses.map((status) => (
                        <div key={status.name} className={cn("flex flex-col items-center transition-colors w-20 text-center", currentStatusIndex >= status.index ? 'text-primary' : 'text-muted-foreground')}>
                            {status.icon}
                            <p className="mt-1 text-[10px]">{status.name}</p>
                        </div>
                        ))}
                    </div>
                </div>
              )}
               {order.status === 'Cancelled' && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-destructive/10 text-destructive">
                    <XCircle className="h-6 w-6"/>
                    <div>
                        <h4 className="text-xs font-semibold">Order Cancelled</h4>
                        {order.cancellationReason && <p className="text-xs">Reason: {order.cancellationReason}</p>}
                    </div>
                </div>
               )}
                {order.customNotes && (
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                        <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="text-xs font-semibold text-current">Your Notes</h4>
                            <p className="text-xs text-current/80 italic">"{order.customNotes}"</p>
                        </div>
                    </div>
                )}
               <Separator/>
                <div className="space-y-4">
                     {order.status === 'Delivered' || order.status === 'Picked Up' ? (
                        <>
                           <div className="flex justify-end items-start">
                                <VendorRating order={order} vendor={vendor} />
                           </div>
                            <div className="text-muted-foreground space-y-4">
                                {order.items.map((item, index) => (
                                  <OrderItemRating
                                      key={`${order.orderId}-${item.cartItemId || index}`}
                                      orderId={order.orderId}
                                      item={item}
                                      onRating={(rating) => handleRating(index, rating)}
                                      onFeedbackSubmit={(feedback) => handleFeedbackSubmit(index, feedback)}
                                  />
                                ))}
                            </div>
                        </>
                    ) : (
                         <div className="space-y-2">
                            <h4 className="text-xs">Items</h4>
                            <ul className="text-xs text-muted-foreground list-disc pl-5">
                            {order.items.map((item, index) => (
                                    <li key={`${order.orderId}-item-${item.cartItemId || index}`} className="flex flex-col gap-0.5">
                                        <div className="flex justify-between">
                                          <span>{item.quantity}x {item.name}</span>
                                          <span className="text-muted-foreground italic">₹{(item.price * item.quantity).toFixed(0)}</span>
                                        </div>
                                        {(item.customizationDetails && Object.entries(item.customizationDetails).length > 0) ? (
                                          <div className="flex flex-wrap gap-1 mt-0.5">
                                            {Object.entries(item.customizationDetails).map(([custId, value]) => {
                                                const group = item.customizations?.find(c => c.id === custId);
                                                if (!group) return null;
                                                const selectedNames = (Array.isArray(value) ? value : [value])
                                                    .map(optId => group.options.find(o => o.id === optId)?.name)
                                                    .filter(Boolean);
                                                if (selectedNames.length === 0) return null;
                                                return (
                                                    <span key={custId} className="text-[10px] text-muted-foreground/70">
                                                        • {selectedNames.join(', ')}
                                                    </span>
                                                );
                                            })}
                                          </div>
                                        ) : (
                                          item.customizations && item.customizations.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-0.5">
                                              {item.customizations.map((group: any) => (
                                                <span key={group.id} className="text-[10px] text-muted-foreground/70">
                                                  • {group.options.map((o: any) => o.name).join(', ')}
                                                </span>
                                              ))}
                                            </div>
                                          )
                                        )}
                                    </li>
                            ))}
                            </ul>
                        </div>
                    )}
                </div>

                <Separator className="my-4 bg-primary/10" />
                
                {/* Delivery Option, Distance, and Payment Status Badges */}
                <div className="flex flex-wrap items-center justify-between gap-4 py-2 bg-muted/5 rounded-2xl p-4 border border-purple-500/5">
                    <div className="space-y-1">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Delivery Details</span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                            {order.deliveryOption === 'Home Delivery' ? (
                                <>
                                    <Bike className="h-4 w-4 text-purple-500" />
                                    <span>Home Delivery</span>
                                    {order.deliveryDistanceKm !== undefined && order.deliveryDistanceKm > 0 && (
                                        <span className="text-muted-foreground font-normal">
                                            ({order.deliveryDistanceKm.toFixed(2)} km)
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Home className="h-4 w-4 text-purple-500" />
                                    <span>Self Pickup</span>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1 text-right">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wider block font-bold">Payment Method & Status</span>
                        <div className="flex items-center gap-2 justify-end">
                            {order.paymentMethod === 'UPI' ? (
                                <>
                                    <span className="text-xs bg-purple-500/10 text-purple-600 px-2 py-0.5 rounded-full font-bold">UPI</span>
                                    {(order.paymentStatus === 'CONFIRMED BY VENDOR' || order.paymentStatus === 'CONFIRMED BY RIDER') ? (
                                        <span className="text-xs bg-green-500/10 text-green-500 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" /> Paid
                                        </span>
                                    ) : order.paymentStatus === 'AWAITING_CONFIRMATION' ? (
                                        <span className="text-xs bg-amber-500/10 text-amber-500 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 animate-pulse">
                                            <Loader2 className="h-3 w-3 animate-spin" /> Awaiting Verification
                                        </span>
                                    ) : (
                                        <span className="text-xs bg-red-500/10 text-red-500 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                                            Awaiting Payment
                                        </span>
                                    )}
                                </>
                            ) : (
                                <>
                                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">COD</span>
                                    <span className="text-xs bg-blue-500/10 text-blue-600 px-2.5 py-0.5 rounded-full font-bold">Pay on Delivery</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <Separator className="my-4 bg-primary/10" />

                {/* Bill Breakdown */}
                <div className="space-y-2 text-xs">
                    <h4 className="font-bold text-foreground">Billing Breakdown</h4>
                    <div className="space-y-1.5 pl-2">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Subtotal</span>
                            <span>₹{order.subtotal?.toFixed(2) || (order.totalPrice - (order.deliveryCharge || 0)).toFixed(2)}</span>
                        </div>
                        {order.deliveryCharge !== undefined && order.deliveryCharge > 0 && (
                            <div className="flex justify-between text-muted-foreground">
                                <span>Delivery Charges</span>
                                <span>₹{order.deliveryCharge.toFixed(2)}</span>
                            </div>
                        )}
                        {order.discountAmount !== undefined && order.discountAmount > 0 && (
                            <div className="flex justify-between text-green-600 dark:text-green-400">
                                <span>Points Discount</span>
                                <span>- ₹{order.discountAmount.toFixed(2)}</span>
                            </div>
                        )}
                        <div className="flex justify-between font-bold text-sm text-foreground pt-1 border-t border-dashed border-primary/10 mt-1">
                            <span>Grand Total</span>
                            <span className="text-purple-500 font-black">₹{order.totalPrice.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-end items-center gap-2">
             {isOrderCompleted && (
                <>
                  <Button size="sm" variant="ghost" className="h-auto px-2 py-1 text-xs" onClick={() => onOrderAgain(order)}>
                      <ShoppingCart className="h-3 w-3 mr-1" />
                      Order Again
                  </Button>
                  <Button size="sm" variant="ghost" className="h-auto px-2 py-1 text-xs" onClick={generatePdfReceipt}>
                      <Download className="h-3 w-3 mr-1" />
                      Bill
                  </Button>
                </>
            )}
            {showQrCodeButton && (
                <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 px-3 text-xs" onClick={() => onPayClick(order)}>
                    <QrCode className="h-4 w-4 mr-2"/> Scan to Pay
                </Button>
            )}
        </CardFooter>
      </Card>
  )
}

const PortionSelectDialog = ({
  items,
  open,
  onOpenChange,
  onConfirm
}: {
  items: MenuItem[] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (item: MenuItem, quantity: number) => void;
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open && items && items.length > 0) {
      const defaultItem = items.find(item => item.isAvailable) || items[0];
      setSelectedItemId(defaultItem.id);
      setQuantity(1);
    }
  }, [open, items]);

  if (!items || items.length === 0) return null;

  const primaryItem = items[0];
  const baseName = primaryItem.name.replace(/\s+(full|half)$/i, '').trim();

  const handleConfirmClick = () => {
    const selectedItem = items.find(item => item.id === selectedItemId);
    if (!selectedItem) return;
    onConfirm(selectedItem, quantity);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">{baseName}</DialogTitle>
          <DialogDescription>Select your desired portion size.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <RadioGroup value={selectedItemId} onValueChange={setSelectedItemId} className="space-y-2">
            {items.map(item => {
              const variation = item.name.match(/\s+(full|half)$/i)?.[1] || 'Portion';
              const price = (item.isDiscountActive && item.discountPrice) ? item.discountPrice : item.price;
              return (
                <Label
                  key={item.id}
                  htmlFor={item.id}
                  className={cn(
                    "flex items-center justify-between rounded-full border p-3 cursor-pointer transition-colors",
                    selectedItemId === item.id && "border-primary bg-primary/5",
                    !item.isAvailable && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <span className="font-semibold">{variation.charAt(0).toUpperCase() + variation.slice(1)}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground text-sm">₹{price.toFixed(2)}</span>
                    <RadioGroupItem value={item.id} id={item.id} disabled={!item.isAvailable}/>
                  </div>
                </Label>
              );
            })}
          </RadioGroup>
        </div>
        <DialogFooter className="sm:justify-between items-center gap-4">
           <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Minus className="h-4 w-4"/>
              </Button>
              <span className="font-bold text-lg w-10 text-center">{quantity}</span>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => setQuantity(q => q + 1)}>
                  <Plus className="h-4 w-4"/>
              </Button>
          </div>
          <Button onClick={handleConfirmClick} disabled={!selectedItemId}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function TrackPage() {
  const [isClient, setIsClient] = useState(false);
  const { customer, isAuthLoading } = useCustomer();
  const { orders, loadUserOrders, addRatingToOrderItem } = useOrder();
  const { vendors, fetchAllVendors } = useVendor();
  const { menuItems } = useMenu();
  const { addToCart } = useCart();
  const [qrCodeOrder, setQrCodeOrder] = useState<Order | null>(null);
  const [portionSelectItems, setPortionSelectItems] = useState<MenuItem[] | null>(null);

  const [date, setDate] = useState<DateRange | undefined>(undefined);
  const [filter, setFilter] = useState('latest');
  const [activePage, setActivePage] = useState(1);
  const [completedPage, setCompletedPage] = useState(1);
  const { toast } = useToast();
  const pathname = usePathname();
  
  useEffect(() => {
    setIsClient(true);
    fetchAllVendors();
  }, [fetchAllVendors]);

  // Defensive cleanup for body styles
  useEffect(() => {
    document.body.style.pointerEvents = '';
    document.body.style.overflow = '';
  }, []);

  // Force-close all dialogs on route change
  useEffect(() => {
    setQrCodeOrder(null);
    setPortionSelectItems(null);
  }, [pathname]);

  useEffect(() => {
    if (customer?.username) {
        const unsubscribe = loadUserOrders(customer.username, 'customer');
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }
  }, [customer?.username, loadUserOrders]);

  
  const customerOrders = useMemo(() => {
    if (!isClient || !customer) return [];
    return orders
        .filter(order => order.customerUsername === customer.username)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [customer, orders, isClient]);
  
  const allActiveOrders = useMemo(() => {
      return customerOrders.filter(o => activeStatuses.includes(o.status));
  }, [customerOrders]);

  const allCompletedOrders = useMemo(() => {
      return customerOrders.filter(o => completedStatuses.includes(o.status));
  }, [customerOrders]);

  const activeTotalPages = Math.ceil(allActiveOrders.length / ORDERS_PER_PAGE);
  const paginatedActiveOrders = useMemo(() => {
    const startIndex = (activePage - 1) * ORDERS_PER_PAGE;
    return allActiveOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [allActiveOrders, activePage]);
  
  const filteredCompletedOrders = useMemo(() => {
    if (filter === 'latest' && !date) {
        return allCompletedOrders.length > 0 ? [allCompletedOrders[0]] : [];
    }
    if (!date?.from) {
        return allCompletedOrders;
    }
    return allCompletedOrders.filter(order => {
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(date.from!);
        fromDate.setHours(0,0,0,0);
        const toDate = date.to ? new Date(date.to) : new Date(date.from!);
        toDate.setHours(23,59,59,999);
        return orderDate >= fromDate && orderDate <= toDate;
    });
  }, [allCompletedOrders, date, filter]);

  const completedTotalPages = Math.ceil(filteredCompletedOrders.length / ORDERS_PER_PAGE);
  const paginatedCompletedOrders = useMemo(() => {
      const startIndex = (completedPage - 1) * ORDERS_PER_PAGE;
      return filteredCompletedOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [filteredCompletedOrders, completedPage]);


  const handleFilterChange = (value: string) => {
    setFilter(value);
    setDate(undefined); 
    setCompletedPage(1);
    const now = new Date();
    switch (value) {
      case 'today':
        setDate({ from: now, to: now });
        break;
      case 'last7':
        setDate({ from: subDays(now, 6), to: now });
        break;
      case 'thisMonth':
        setDate({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'thisYear':
        setDate({ from: startOfYear(now), to: endOfYear(now) });
        break;
      case 'latest':
      case 'all':
      default:
        setDate(undefined);
        break;
    }
  };

  const handleOrderAgain = (order: Order) => {
    let addedCount = 0;
    let unavailableCount = 0;
    
    order.items.forEach(itemFromOrder => {
      const baseName = itemFromOrder.name.replace(/\s+\(Half\)|\s+\(Full\)/i, '').trim();
      
      const vendor = vendors.find(v => v.username === itemFromOrder.vendorUsername);
      const availableMenuItems = menuItems.filter(mi =>
        mi.vendorUsername === itemFromOrder.vendorUsername &&
        mi.name.startsWith(baseName) &&
        isItemInStock(mi, vendor?.isInventory)
      );
      const isShopOpen = vendor ? VendorStatusManager.getShopStatus(vendor).status === VendorStatus.OPEN : false;

      if (availableMenuItems.length > 0 && isShopOpen) {
        if (availableMenuItems.length === 1) {
          addToCart(availableMenuItems[0], itemFromOrder.customizationDetails || {}, itemFromOrder.quantity);
          addedCount++;
        } else {
          // Multiple variations (half/full) available, prompt user
          setPortionSelectItems(availableMenuItems);
          // Note: we can't easily add to cart here, so we just open the dialog.
          // The reorder might not be complete if the user closes it.
        }
      } else {
        unavailableCount++;
      }
    });
    
    const messages = [];
    if(addedCount > 0) messages.push(`${addedCount} items re-added to your cart.`);
    if(unavailableCount > 0) messages.push(`${unavailableCount} items are currently unavailable.`);
    if(portionSelectItems) messages.push("Please select portions for some items.");

    if(messages.length > 0) {
        toast({
            title: "Reorder Processed",
            description: messages.join(' '),
        });
    }
  }

  if (!isClient || isAuthLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </main>
      </div>
    );
  }
  
  const findVendor = (order: Order) => {
    if (!vendors) return undefined;
    return vendors.find(v => v.username === order.vendorUsername);
  }

  const PaginationControls = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => (
     totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-4">
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
            >
                Next
            </Button>
        </div>
      )
  );

  return (
    <>
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12">
        <Card className="w-full max-w-4xl mx-auto bg-transparent border-none shadow-none">
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-5xl text-primary">
              Your Orders
            </CardTitle>
            <CardDescription>Track your active orders and view your order history.</CardDescription>
          </CardHeader>
          <div className="my-4 flex justify-center">
              <Link href="/menu" passHref>
                  <Button variant="outline">
                      <ArrowLeft className="mr-2 h-4 w-4"/>
                      Back to Menu
                  </Button>
              </Link>
          </div>
          <CardContent>
            {(allActiveOrders.length === 0 && allCompletedOrders.length === 0) ? (
                 <div className="text-center py-16 flex flex-col items-center gap-4 bg-card/50 rounded-lg">
                    <PackageSearch className="h-16 w-16 text-muted-foreground" />
                    <h3 className="text-xl font-semibold">No orders found.</h3>
                    <p className="text-muted-foreground">Place an order from the menu to track it here.</p>
                     <Link href="/" passHref>
                        <Button variant="outline" size="lg" className="text-lg mt-4">
                            <Utensils className="mr-2 h-5 w-5"/>
                            Go to Menu
                        </Button>
                    </Link>
                </div>
            ) : (
                <Tabs defaultValue="active" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-full">
                        <TabsTrigger value="active" className="rounded-full">
                            <Package className="mr-2 h-4 w-4"/>
                            Active Orders ({allActiveOrders.length})
                        </TabsTrigger>
                        <TabsTrigger value="history" className="rounded-full">
                            <History className="mr-2 h-4 w-4"/>
                            Order History ({allCompletedOrders.length})
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="active">
                        <PaginationControls currentPage={activePage} totalPages={activeTotalPages} onPageChange={setActivePage} />
                        <div className="space-y-4 mt-4">
                        {paginatedActiveOrders.length > 0 ? (
                            paginatedActiveOrders.map(order => <OrderCard key={order.orderId} order={order} vendor={findVendor(order)} onPayClick={setQrCodeOrder} onOrderAgain={handleOrderAgain} />)
                        ) : (
                            <p className="text-center text-muted-foreground py-8">No active orders.</p>
                        )}
                       </div>
                       <PaginationControls currentPage={activePage} totalPages={activeTotalPages} onPageChange={setActivePage} />
                    </TabsContent>
                    <TabsContent value="history">
                        <div className="mt-4 flex justify-end items-center gap-2">
                             <Select value={filter} onValueChange={handleFilterChange}>
                              <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="Select date range" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="latest">Latest Order</SelectItem>
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="last7">Last 7 Days</SelectItem>
                                <SelectItem value="thisMonth">This Month</SelectItem>
                                <SelectItem value="thisYear">This Year</SelectItem>
                                <SelectItem value="all">All Time</SelectItem>
                              </SelectContent>
                            </Select>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[300px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                    >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                        <>
                                            {format(date.from, "LLL dd, y")} -{" "}
                                            {format(date.to, "LLL dd, y")}
                                        </>
                                        ) : (
                                        format(date.from, "LLL dd, y")
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
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={(newDate) => {
                                        setDate(newDate);
                                        setCompletedPage(1);
                                        setFilter('custom');
                                    }}
                                    numberOfMonths={2}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <PaginationControls currentPage={completedPage} totalPages={completedTotalPages} onPageChange={setCompletedPage} />
                         <div className="space-y-4 mt-4">
                            {paginatedCompletedOrders.length > 0 ? (
                                paginatedCompletedOrders.map(order => <OrderCard key={order.orderId} order={order} vendor={findVendor(order)} onPayClick={setQrCodeOrder} onOrderAgain={handleOrderAgain} />)
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No past orders found for the selected period.</p>
                            )}
                        </div>
                        <PaginationControls currentPage={completedPage} totalPages={completedTotalPages} onPageChange={setCompletedPage} />
                    </TabsContent>
                </Tabs>
            )}
          </CardContent>
        </Card>
        {qrCodeOrder && (
          <QrCodeDialog
              order={qrCodeOrder}
              vendor={findVendor(qrCodeOrder)}
              isOpen={!!qrCodeOrder}
              onOpenChange={() => setQrCodeOrder(null)}
          />
        )}
         <PortionSelectDialog
            items={portionSelectItems}
            open={!!portionSelectItems}
            onOpenChange={() => setPortionSelectItems(null)}
            onConfirm={(item, quantity) => {
                addToCart(item, {}, quantity);
                toast({ title: "Item Added!", description: `${quantity}x ${item.name} added to your cart.`});
            }}
        />
      </main>
    </>
  );
}

    
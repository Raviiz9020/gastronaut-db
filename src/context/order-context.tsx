

'use client';

import type {
  Order, OrderStatus, CartItem, Customer, Vendor, PaymentMethod, DeliveryOption, DeliveryBoy, MenuItem, DeliveryConfig
} from '@/types';
import React, {
  createContext, useContext, useState, ReactNode, useEffect, useCallback, Dispatch, SetStateAction, useMemo, useRef
} from 'react';
import { useVendor } from './vendor-context';
import { useCustomer } from './customer-context';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import {
  collection, onSnapshot, addDoc, updateDoc, doc, setDoc, query, where,
  writeBatch, getDocs, DocumentData, QuerySnapshot, runTransaction, getDoc, increment, deleteDoc, FieldValue
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { sendOrderEmail } from '@/ai/flows/send-order-email';
import { sendCustomerInvoice } from '@/ai/flows/send-customer-invoice';
import { sendCancellationEmail } from '@/ai/flows/send-cancellation-email';
import { sendOrderModifiedEmail } from '@/ai/flows/send-order-modified-email';
import { ensureAuthUser } from '@/lib/ensureAuth';
import { sendTelegramNotification } from '@/ai/flows/send-telegram-notification';
import { calculateDistanceInKm } from '@/lib/location-utils';

interface OrderContextType {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  loadUserOrders: (username: string, userType: 'customer' | 'vendor') => (() => void) | undefined;
  addOrder: (args: {
    cartItems: CartItem[];
    customer: Partial<Customer>;
    allVendors: Vendor[];
    paymentMethod: PaymentMethod;
    deliveryOptions?: Record<string, DeliveryOption>; // Optional now
    tableId?: string;
    customNotes?: Record<string, string>;
    redemption?: {
      canRedeem: boolean;
      pointsToRedeem: number;
      discountAmount: number;
    }
  }) => Promise<string[]>;
  updateOrderStatus: (orderId: string, status: OrderStatus, reason?: string) => Promise<void>;
  updateOrderItems: (orderId: string, newItems: CartItem[], customNotes?: string) => Promise<void>;
  assignDeliveryBoyToOrder: (orderId: string, deliveryBoyId: string, deliveryTeam: DeliveryBoy[]) => Promise<void>;
  addRatingToOrderItem: (orderId: string, itemIndex: number, rating: number, feedback?: string) => Promise<void>;
  addRatingToVendor: (orderId: string, rating: number, feedback?: string) => Promise<void>;
  addResponseToOrderItem: (orderId: string, cartItemId: string, response: string, itemName: string) => Promise<void>;
  fetchAllOrders: () => Promise<Order[]>;
  removeOrder: (orderId: string) => Promise<void>;
  bulkDeleteCancelledOrdersForVendor: (vendorUsername: string) => Promise<void>;
}

const OrderContext = createContext<OrderContextType | undefined>(undefined);

const cleanOrderItem = (item: any) => {
  // If it's already cleaned (i.e. has menuItemId and no customizationDetails), return it as is.
  if (item.menuItemId && !item.customizationDetails) {
    return item;
  }

  const itemId = item.id || item.menuItemId;
  const customizationDetails = item.customizationDetails || {};

  const filteredCustomizations = (item.customizations || []).map((group: any) => {
    const selectedValue = customizationDetails[group.id];
    if (!selectedValue) return null;

    const selectedIds = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
    const filteredOptions = group.options.filter((opt: any) => selectedIds.includes(opt.id));

    if (filteredOptions.length === 0) return null;

    return {
      id: group.id,
      name: group.name,
      minSelect: group.minSelect ?? 0,
      options: filteredOptions.map((opt: any) => ({
        id: opt.id,
        name: opt.name,
        price: opt.price,
        originalPrice: opt.originalPrice ?? null,
        isAvailable: opt.isAvailable ?? true,
        stock: opt.stock ?? null,
        type: group.type,
        priceModifier: opt.priceModifier ?? null
      }))
    };
  }).filter(Boolean);

  return {
    menuItemId: itemId,
    name: item.name,
    price: item.price,
    quantity: item.quantity,
    image: item.image || '',
    shopName: item.shopName || '',
    vendorUsername: item.vendorUsername,
    cartItemId: item.cartItemId,
    customizations: filteredCustomizations
  };
};

export const OrderProvider = ({ children, setCurrentCustomer }: { children: ReactNode; setCurrentCustomer: Dispatch<SetStateAction<Customer | null>> }) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const activeListenerUnsubscribeRef = useRef<() => void | null>(null);

  const loadUserOrders = useCallback((username: string, userType: 'customer' | 'vendor'): (() => void) | undefined => {
    if (activeListenerUnsubscribeRef.current) {
      activeListenerUnsubscribeRef.current();
    }
    setOrders([]);

    const userField = userType === 'customer' ? 'customerUsername' : 'vendorUsername';

    const q = query(collection(db, 'orders'), where(userField, '==', username));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userOrders = snapshot.docs.map(doc => ({ orderId: doc.id, ...doc.data() } as Order));
      setOrders(userOrders);

    }, (error) => {
      console.error(`Error in real-time listener for ${userType} orders:`, error);
      toast({ title: 'Error', description: 'Could not sync all orders.', variant: 'destructive' });
    });

    activeListenerUnsubscribeRef.current = unsubscribe;
    return unsubscribe;

  }, [toast]);

  const addOrder: OrderContextType['addOrder'] = async ({
    cartItems, customer: cust, allVendors, paymentMethod, deliveryOptions, tableId, customNotes, redemption
  }) => {
    const user = auth.currentUser;
    const isDineInFlow = !!tableId;

    if (isDineInFlow && !user) {
      throw new Error("A vendor must be logged in to create a dine-in order.");
    }
    if (!isDineInFlow && !cust?.username) {
      throw new Error("Customer details are required for this order type.");
    }

    const customerForOrder: Partial<Customer> = isDineInFlow
      ? { name: `Table ${tableId}`, contact: '', address: 'Dine-In' }
      : cust;

    const customerUsername = isDineInFlow ? user!.uid : cust!.username!;
    const newOrderIds: string[] = [];

    try {
      await runTransaction(db, async (transaction) => {
        // --- READ PHASE ---
        const counterRef = doc(db, 'counters', 'orderCounter');
        const counterDoc = await transaction.get(counterRef);
        let currentNumber = (counterDoc.exists() && typeof counterDoc.data().currentID === 'number') ? counterDoc.data().currentID : 0;

        const ordersByVendor: Record<string, CartItem[]> = {};
        for (const item of cartItems) {
          if (!ordersByVendor[item.vendorUsername]) ordersByVendor[item.vendorUsername] = [];
          ordersByVendor[item.vendorUsername].push(item);
        }

        // Read stock and availability for all inventory-managed items
        const itemSnapshots: Record<string, any> = {};
        for (const vendorUsername of Object.keys(ordersByVendor)) {
          const v = allVendors.find((vv) => vv.username === vendorUsername);
          const vendorItems = ordersByVendor[vendorUsername];
          // Track accumulated stock usage for this transaction
          const accumulatedChecks: Record<string, number> = {}; // itemId -> baseStockUsed
          const accumulatedVariantChecks: Record<string, Record<string, number>> = {}; // itemId -> variantId -> stockUsed

            for (const cartItem of vendorItems) {
              const itemRef = doc(db, 'menuItems', cartItem.id);
              let itemData = itemSnapshots[cartItem.id];
              if (!itemData) {
                const itemDoc = await transaction.get(itemRef);
                if (!itemDoc.exists() || !itemDoc.data().isAvailable) {
                  throw new Error(`${cartItem.name} is no longer available.`);
                }
                itemData = itemDoc.data();
                itemSnapshots[cartItem.id] = itemData;
              }

              const isVariantBased =
                itemData.price === 0 ||
                (itemData.customizations?.some((group: any) =>
                  group.options.some((opt: any) => opt.stock !== undefined && opt.stock !== null)
                ) ?? false);

              // 1. Check variant stocks if applicable
              if (itemData.customizations) {
                if (!accumulatedVariantChecks[cartItem.id]) accumulatedVariantChecks[cartItem.id] = {};
                for (const group of itemData.customizations) {
                  const selectedOptionIds = cartItem.customizationDetails[group.id];
                  if (selectedOptionIds) {
                    const idsToCheck = Array.isArray(selectedOptionIds) ? selectedOptionIds : [selectedOptionIds];
                    for (const optId of idsToCheck) {
                      const option = group.options.find((o: any) => o.id === optId);
                      if (option && option.stock !== undefined && option.stock !== null) {
                        const usedSoFar = accumulatedVariantChecks[cartItem.id][optId] || 0;
                        const newUsed = usedSoFar + cartItem.quantity;
                        if (option.stock < newUsed) {
                          throw new Error(`Not enough stock for ${option.name}. Only ${option.stock} left.`);
                        }
                        accumulatedVariantChecks[cartItem.id][optId] = newUsed;
                      }
                    }
                  }
                }
              }

              // 2. Check base stock ONLY if not variant-based
              if (!isVariantBased) {
                const stock = itemData.stock;
                if (stock !== undefined && stock !== null) {
                  const usedSoFar = accumulatedChecks[cartItem.id] || 0;
                  const newUsed = usedSoFar + cartItem.quantity;
                  if (stock < newUsed) {
                    throw new Error(`Not enough stock for ${cartItem.name}. Only ${stock} left.`);
                  }
                  accumulatedChecks[cartItem.id] = newUsed;
                }
              }
            }
          }

        // Read delivery settings in transaction
        let deliveryConfig: DeliveryConfig | null = null;
        const settingsRef = doc(db, 'settings', 'delivery_settings');
        const settingsSnap = await transaction.get(settingsRef);
        if (settingsSnap.exists()) {
          deliveryConfig = settingsSnap.data() as DeliveryConfig;
        } else {
          const siteSettingsRef = doc(db, 'site-settings', 'delivery');
          const siteSettingsSnap = await transaction.get(siteSettingsRef);
          if (siteSettingsSnap.exists()) {
            deliveryConfig = siteSettingsSnap.data() as DeliveryConfig;
          }
        }
        
        // --- PREPARE WRITES PHASE ---
        const nowIso = new Date().toISOString();
        const shouldRedeemPoints = redemption?.canRedeem && redemption.pointsToRedeem > 0 && Object.keys(ordersByVendor).length === 1;

        const preparedOrders: { ref: any, data: Omit<Order, 'orderId'> }[] = [];

        for (const vendorUsername of Object.keys(ordersByVendor)) {
          const vendorItems = ordersByVendor[vendorUsername];
          const originalSubtotal = vendorItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
          const v = allVendors.find((vv) => vv.username === vendorUsername);
          if (!v) {
            console.warn('Vendor missing for username:', vendorUsername, '— skipping this vendor order.');
            continue;
          }

          currentNumber++;
          const displayId = `HYPER-${currentNumber}`;
          const orderId = displayId;
          newOrderIds.push(orderId);
          const orderRef = doc(db, 'orders', orderId);

          const vendorDeliveryOption = (deliveryOptions && deliveryOptions[v.username]) || (isDineInFlow ? (String(tableId).startsWith('Take Away') ? 'Self Pickup' : 'Dine-In') : 'Home Delivery');

          let deliveryDistanceKm = 0;
          let deliveryCharge = 0;
          let distanceCalculationType = "";

          if (vendorDeliveryOption === 'Home Delivery' && deliveryConfig) {
            if (cust?.latitude && cust?.longitude && v.latitude && v.longitude) {
              const rawDist = calculateDistanceInKm(cust.latitude, cust.longitude, v.latitude, v.longitude);
              const multiplier = deliveryConfig.distanceMultiplier ?? 1.0;
              const adjustedDist = rawDist * multiplier;
              deliveryDistanceKm = parseFloat(adjustedDist.toFixed(2));
              
              if (deliveryConfig.isEnabled === true) {
                const slab = deliveryConfig.slabs.find(s => adjustedDist >= s.minKm && adjustedDist <= s.maxKm);
                deliveryCharge = slab ? slab.charge : 0;
                distanceCalculationType = "SL-1.3";
              } else {
                deliveryCharge = 0.0;
              }
            }
          }

          let pointsEarned = 0;
          let finalPrice = originalSubtotal + deliveryCharge;
          let discountAmount = 0;

          const isCustomerOrder = !isDineInFlow;
          const isEligibleForPoints = (vendorDeliveryOption === 'Home Delivery' || vendorDeliveryOption === 'Self Pickup') && v.isRewardsEnabled;

          if (isCustomerOrder && isEligibleForPoints && v.rewardsConfig && !shouldRedeemPoints && cust.username !== v.username) {
            pointsEarned = Math.floor(originalSubtotal / v.rewardsConfig.spend) * v.rewardsConfig.points;
          }

          if (shouldRedeemPoints && redemption) {
            discountAmount = redemption.discountAmount;
            finalPrice -= discountAmount;
          }

          const cleanedItems = vendorItems.map(item => cleanOrderItem(item));

          const isHomeDelivery = vendorDeliveryOption === 'Home Delivery';

          const newOrderData: Omit<Order, 'orderId'> & { tableId?: string | null } = {
            displayId: displayId,
            customer: {
              name: customerForOrder.name || 'Unknown',
              contact: customerForOrder.contact || '',
              address: customerForOrder.address || '',
              email: customerForOrder.email || '',
              ...(isHomeDelivery ? {
                latitude: cust?.latitude ?? 0,
                longitude: cust?.longitude ?? 0
              } : {})
            },
            customerUsername: customerUsername,
            items: cleanedItems,
            subtotal: originalSubtotal,
            discountAmount: discountAmount,
            totalPrice: finalPrice,
            status: isDineInFlow ? 'Processing' : 'Order Placed',
            vendorUsername: v.username,
            createdAt: nowIso,
            paymentMethod,
            deliveryOption: vendorDeliveryOption,
            vendorContact: v.contact || '',
            customNotes: (customNotes && customNotes[v.username]) ? customNotes[v.username] : '',
            pointsEarned: pointsEarned > 0 ? pointsEarned : 0,
            pointsRedeemed: shouldRedeemPoints ? redemption.pointsToRedeem : 0,
            tableId: tableId ?? null,
            deliveryDistanceKm: deliveryDistanceKm > 0 ? deliveryDistanceKm : 0,
            deliveryCharge: deliveryCharge > 0 ? deliveryCharge : 0,
            distanceCalculationType: distanceCalculationType || "",
            paymentStatus: 'PENDING',
            ...(isHomeDelivery ? {
              riderPayout: deliveryCharge,
              paymentConfirmedAt: "",
              paymentRequestedAt: "",
              riderSettlementConfirmedAt: "",
              riderSettlementMarkedAt: "",
              riderSettlementMarkedBy: "",
              riderSettlementPaymentMode: "",
              riderSettlementRejectedReason: "",
              riderSettlementStatus: "",
              vendorAddress: v.address || "",
              vendorLatitude: v.latitude ?? 0,
              vendorLongitude: v.longitude ?? 0,
              vendorShopName: v.shopName || v.name || ""
            } : {})
          };

          preparedOrders.push({ ref: orderRef, data: newOrderData });
        }

        // --- WRITE PHASE ---
        transaction.set(counterRef, { currentID: currentNumber }, { merge: true });

        preparedOrders.forEach(order => {
          transaction.set(order.ref, order.data);
        });

        if (shouldRedeemPoints && cust?.username) {
          const customerRef = doc(db, 'customers', cust.username);
          transaction.update(customerRef, {
            [`lockedPoints.${preparedOrders[0].data.vendorUsername}`]: increment(redemption.pointsToRedeem),
          });
        }

        // Decrement stock
        for (const vendorUsername of Object.keys(ordersByVendor)) {
          const v = allVendors.find((vv) => vv.username === vendorUsername);
          const vendorItems = ordersByVendor[vendorUsername];
          // Group items by MenuItem ID to apply updates once per document
          const itemsToUpdate: Record<string, CartItem[]> = {};
          for (const item of vendorItems) {
            if (!itemsToUpdate[item.id]) itemsToUpdate[item.id] = [];
            itemsToUpdate[item.id].push(item);
          }

            for (const [itemId, items] of Object.entries(itemsToUpdate)) {
              const itemRef = doc(db, 'menuItems', itemId);
              const itemData = itemSnapshots[itemId];
              if (!itemData) continue;
              const isVariantBased =
                itemData.price === 0 ||
                (itemData.customizations?.some((group: any) =>
                  group.options.some((opt: any) => opt.stock !== undefined && opt.stock !== null)
                ) ?? false);
              let updatePayload: any = {};

              // Update variant stocks
              if (itemData.customizations) {
                let modified = false;
                const newCustomizations = JSON.parse(JSON.stringify(itemData.customizations)); // deep clone
                
                for (const cartItem of items) {
                  newCustomizations.forEach((group: any) => {
                    const selected = cartItem.customizationDetails[group.id];
                    if (selected) {
                      const ids = Array.isArray(selected) ? selected : [selected];
                      group.options.forEach((opt: any) => {
                        if (ids.includes(opt.id) && opt.stock !== undefined && opt.stock !== null) {
                          opt.stock -= cartItem.quantity;
                          modified = true;
                        }
                      });
                    }
                  });
                }
                if (modified) {
                  updatePayload.customizations = newCustomizations;
                }
              }

              // Update base stock ONLY if not variant-based
              if (!isVariantBased) {
                if (itemData.stock !== undefined && itemData.stock !== null) {
                  const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
                  updatePayload.stock = increment(-totalQty);
                }
              }

              if (Object.keys(updatePayload).length > 0) {
                transaction.update(itemRef, updatePayload);
              }
            }
          }
        
      });

      if (redemption?.canRedeem && redemption.pointsToRedeem > 0 && cust?.username) {
        const vendorUsername = Object.keys(cartItems.reduce((acc, item) => ({ ...acc, [item.vendorUsername]: true }), {}))[0];
        setCurrentCustomer(prev => {
          if (!prev) return null;
          const newLockedPoints = { ...(prev.lockedPoints || {}), [vendorUsername]: (prev.lockedPoints?.[vendorUsername] || 0) + redemption.pointsToRedeem };
          return { ...prev, lockedPoints: newLockedPoints };
        });
      }

      const customerSnap = isDineInFlow ? null : await getDoc(doc(db, 'customers', cust!.username!));
      const customerForEmail = customerSnap?.exists() ? customerSnap.data() as Customer : null;

      for (const orderId of newOrderIds) {
        const orderSnap = await getDoc(doc(db, 'orders', orderId));
        if (orderSnap.exists()) {
          const newOrder = { orderId, ...orderSnap.data() } as Order;
          const vendorRef = doc(db, 'vendors', newOrder.vendorUsername);
          const vendorSnap = await getDoc(vendorRef);
          if (vendorSnap.exists()) {
            const vendorData = vendorSnap.data() as Vendor;
            if (vendorData.email && !isDineInFlow) {
              sendOrderEmail({ order: JSON.parse(JSON.stringify(newOrder)), vendor: JSON.parse(JSON.stringify(vendorData)) }).catch(console.error);
            }
            if (customerForEmail?.email) {
              sendCustomerInvoice({ order: JSON.parse(JSON.stringify(newOrder)), customer: JSON.parse(JSON.stringify(customerForEmail)) }).catch(console.error);
            }
            // Send Telegram notification - DISABLED as this is now handled by a Cloud Function
            /*
            sendTelegramNotification({
              orderId: newOrder.displayId || newOrder.orderId,
              vendorUsername: newOrder.vendorUsername,
              totalPrice: newOrder.totalPrice,
              customerName: newOrder.customer.name,
              items: newOrder.items,
              deliveryOption: newOrder.deliveryOption,
              customerAddress: newOrder.customer.address
            }).catch(console.error);
            */
          }
        }
      }
      return newOrderIds;

    } catch (e: any) {
      console.error('Error adding order:', e);
      toast({ title: 'Error', description: e.message || 'Failed to place order.', variant: 'destructive' });
      throw e; // re-throw to be caught in component
    }
  };

  const updateOrderStatus: OrderContextType['updateOrderStatus'] = async (orderId, status, reason) => {
    const orderRef = doc(db, 'orders', orderId);
    try {
      if (status === 'Cancelled') {
        // Use a transaction for cancellation to ensure atomicity
        await runTransaction(db, async (transaction) => {
          // --- ALL READS MUST GO FIRST ---
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await transaction.get(orderRef);
          if (!orderSnap.exists()) {
            throw new Error("Order not found");
          }
          const order = orderSnap.data() as Order;

          const vendorRef = doc(db, 'vendors', order.vendorUsername);
          const vendorSnap = await transaction.get(vendorRef);
          // --- END OF READS ---

          // --- ALL WRITES GO AFTER READS ---
          // 1. Update order status and reason
          const updateData: any = { status };
          if (reason) {
            updateData.cancellationReason = reason;
          }
          transaction.update(orderRef, updateData);

          // 2. Restore stock for bakery items (if applicable)
          if (vendorSnap.exists() && vendorSnap.data().category === 'Bakery') {
            order.items.forEach(item => {
              if (item.id) {
                const itemRef = doc(db, 'menuItems', item.id);
                // The increment function safely handles cases where `stock` might not exist yet
                transaction.update(itemRef, { stock: increment(item.quantity) });
              }
            });
          }
          // --- END OF WRITES ---
        });

        // Post-transaction side-effects
        toast({ title: "Order Cancelled", description: "The order has been cancelled and stock restored." });
        const updatedOrderSnap = await getDoc(orderRef);
        if (updatedOrderSnap.exists()) {
          const orderForEmail = { orderId, ...updatedOrderSnap.data() } as Order;
          // Email logic...
          if (orderForEmail.deliveryOption === 'Dine-In') {
            const vendorSnap = await getDoc(doc(db, 'vendors', orderForEmail.vendorUsername));
            if (vendorSnap.exists() && vendorSnap.data().email) {
              const vendorData = vendorSnap.data() as Vendor;
              const dineInCustomerAsVendor = { ...orderForEmail.customer, email: vendorData.email };
              sendCancellationEmail({ order: JSON.parse(JSON.stringify({ ...orderForEmail, customer: dineInCustomerAsVendor })) }).catch(console.error);
            }
          } else if (orderForEmail.customer.email) {
            sendCancellationEmail({ order: JSON.parse(JSON.stringify(orderForEmail)) }).catch(console.error);
          }
        }

      } else {
        // For other status updates, a simple update is fine
        await updateDoc(orderRef, { status });

        // Handle email for delivery status
        if (status === 'Delivered') {
          const orderSnap = await getDoc(orderRef);
          if (orderSnap.exists()) {
            const order = { orderId, ...orderSnap.data() } as Order;
            if (order.deliveryOption === 'Dine-In') {
              const vendorSnap = await getDoc(doc(db, 'vendors', order.vendorUsername));
              if (vendorSnap.exists() && vendorSnap.data().email) {
                const vendorData = vendorSnap.data() as Vendor;
                const dineInCustomerAsVendor = { ...order.customer, email: vendorData.email };
                sendCustomerInvoice({ order: JSON.parse(JSON.stringify(order)), customer: JSON.parse(JSON.stringify(dineInCustomerAsVendor)) }).catch(console.error);
              }
            }
          }
        }
      }

    } catch (e: any) {
      console.error('Error updating order status:', e);
      toast({ title: 'Error', description: e.message || 'Failed to update order status.', variant: 'destructive' });
    }
  };

  const updateOrderItems: OrderContextType['updateOrderItems'] = async (orderId, newItems, customNotes) => {
    try {
      const user = await ensureAuthUser();

      if (newItems.length === 0) {
        await removeOrder(orderId);
        toast({ title: "Order Cleared", description: "The order was removed as it has no items." });
        return;
      }

      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await transaction.get(orderRef);

        if (!orderSnap.exists()) {
          throw new Error('Order does not exist!');
        }

        const orderData = orderSnap.data() as Order;
        if (orderData.vendorUsername !== user.uid) {
          throw new Error('You do not have permission to edit this order.');
        }

        const newTotalPrice = newItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        if (orderData.deliveryOption !== 'Dine-In' && orderData.deliveryOption !== 'Self Pickup') {
          const vendorRef = doc(db, 'vendors', orderData.vendorUsername);
          const vendorSnap = await transaction.get(vendorRef);
          if (vendorSnap.exists()) {
            const vendorData = vendorSnap.data() as Vendor;
            if (vendorData.minOrderAmount && newTotalPrice < vendorData.minOrderAmount) {
              throw new Error(`The new total (₹${newTotalPrice.toFixed(2)}) is below the minimum order amount of ₹${vendorData.minOrderAmount.toFixed(2)}.`);
            }
          }
        }

        const itemsWithCorrectVendor = newItems.map(item => {
          const cleaned = cleanOrderItem(item);
          return {
            ...cleaned,
            vendorUsername: orderData.vendorUsername,
            shopName: orderData.items[0]?.shopName || cleaned.shopName || ''
          };
        });

        const updatePayload: any = {
          items: itemsWithCorrectVendor,
          totalPrice: newTotalPrice,
          updatedAt: new Date().toISOString(),
        };

        if (customNotes !== undefined) {
          updatePayload.customNotes = customNotes;
        }

        transaction.update(orderRef, updatePayload);
      });

      if (newItems.length > 0) {
        const updatedOrderSnap = await getDoc(doc(db, 'orders', orderId));
        if (updatedOrderSnap.exists()) {
          const updatedOrder = { orderId, ...updatedOrderSnap.data() } as Order;

          if (updatedOrder.deliveryOption !== 'Dine-In') {
            let customerToEmail: Customer | Vendor | null = null;

            if (updatedOrder.deliveryOption === 'Dine-In') {
              const vendorRef = doc(db, 'vendors', updatedOrder.vendorUsername);
              const vendorSnap = await getDoc(vendorRef);
              if (vendorSnap.exists()) customerToEmail = vendorSnap.data() as Vendor;
            } else {
              const customerRef = doc(db, 'customers', updatedOrder.customerUsername);
              const customerSnap = await getDoc(customerRef);
              if (customerSnap.exists()) customerToEmail = customerSnap.data() as Customer;
            }

            if (customerToEmail?.email) {
              await sendOrderModifiedEmail({
                order: JSON.parse(JSON.stringify(updatedOrder)),
                customer: JSON.parse(JSON.stringify(customerToEmail)),
              });
            }
          }
        }
        toast({ title: "Order Updated!", description: "The items for this order have been successfully updated." });
      }

    } catch (e: any) {
      console.error('Error updating order items:', e);
      toast({ title: 'Update Failed', description: e.message || 'Could not update the order.', variant: 'destructive' });
    }
  };

  const assignDeliveryBoyToOrder: OrderContextType['assignDeliveryBoyToOrder'] = async (orderId, deliveryBoyId, deliveryTeam) => {
    try {
      const deliveryBoyData = deliveryTeam.find(d => d.id === deliveryBoyId);
      if (!deliveryBoyData) {
        throw new Error('Delivery person not found in the provided team list.');
      }

      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        assignedDeliveryBoyId: deliveryBoyId,
        assignedDeliveryBoyName: deliveryBoyData.name,
        assignedDeliveryBoyContact: deliveryBoyData.contact,
        status: 'Out for Delivery'
      });

    } catch (e: any) {
      console.error('Error assigning delivery boy:', e);
      toast({ title: 'Error', description: e.message || 'Failed to assign delivery agent.', variant: 'destructive' });
    }
  };

  const addRatingToOrderItem: OrderContextType['addRatingToOrderItem'] = async (orderId, itemIndex, rating, feedback) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order not found!");

        const orderData = orderSnap.data() as Order;
        const itemToRate = orderData.items[itemIndex];
        if (!itemToRate) {
          throw new Error("Item not found at the specified index in the order.");
        }

        let menuItemRef: any = null;
        let menuItemSnap: any = null;
        if (itemToRate.id) {
          menuItemRef = doc(db, 'menuItems', itemToRate.id);
          menuItemSnap = await transaction.get(menuItemRef);
        } else {
          console.warn("CRITICAL: Found item in order but it's missing a MenuItem ID.", { orderId, itemToRate });
        }

        const updatedItems = [...orderData.items];
        const feedbackToSet = rating >= 3 ? '' : (feedback ?? updatedItems[itemIndex].feedback ?? '');
        const oldRating = updatedItems[itemIndex].rating;
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], rating, feedback: feedbackToSet };
        transaction.update(orderRef, { items: updatedItems });

        if (menuItemSnap && menuItemSnap.exists()) {
          const menuItemData = menuItemSnap.data() as MenuItem;
          const currentSum = menuItemData.totalRatingSum || 0;
          const currentCount = menuItemData.ratingCount || 0;
          let newSum = currentSum;
          let newCount = currentCount;

          if (oldRating !== undefined && oldRating !== null) {
            newSum = currentSum - oldRating + rating;
          } else {
            newSum = currentSum + rating;
            newCount = currentCount + 1;
          }

          transaction.update(menuItemRef, {
            totalRatingSum: newSum,
            ratingCount: newCount,
          });
        } else if (itemToRate.id) {
          console.warn(`Could not find MenuItem with id ${itemToRate.id} to aggregate rating.`);
        }
      });
      toast({ title: 'Rating Submitted!', description: 'Thank you for your feedback.' });
    } catch (e: any) {
      console.error('Error adding rating:', e);
      toast({ title: 'Error', description: 'Failed to submit rating.', variant: 'destructive' });
    }
  };

  const addRatingToVendor: OrderContextType['addRatingToVendor'] = async (orderId, rating, feedback) => {
    const feedbackToSet = rating >= 3 ? '' : (feedback ?? '');
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order not found!");

        const orderData = orderSnap.data() as Order;
        const vendorRef = doc(db, 'vendors', orderData.vendorUsername);
        const vendorSnap = await transaction.get(vendorRef);
        if (!vendorSnap.exists()) throw new Error("Vendor not found!");

        const oldRating = orderData.vendorRating;

        transaction.update(orderRef, { vendorRating: rating, vendorFeedback: feedbackToSet });

        const vendorData = vendorSnap.data() as Vendor;
        const currentSum = vendorData.totalRatingSum || 0;
        const currentCount = vendorData.ratingCount || 0;

        let newSum = currentSum;
        let newCount = currentCount;

        if (oldRating !== undefined && oldRating !== null) {
          newSum = currentSum - oldRating + rating;
        } else {
          newSum = currentSum + rating;
          newCount = currentCount + 1;
        }

        transaction.update(vendorRef, {
          totalRatingSum: newSum,
          ratingCount: newCount,
        });
      });

      toast({ title: 'Vendor Rating Submitted!', description: 'Thank you for helping us improve.' });

    } catch (e: any) {
      console.error('Error adding vendor rating:', e);
      toast({ title: 'Error', description: e.message || 'Failed to submit vendor rating.', variant: 'destructive' });
    }
  };


  const addResponseToOrderItem: OrderContextType['addResponseToOrderItem'] = async (orderId, cartItemId, response) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) throw new Error("Order not found!");

        const orderData = orderSnap.data() as Order;
        const updatedItems = orderData.items.map(item =>
          item.cartItemId === cartItemId ? { ...item, vendorResponse: response } : item
        );
        transaction.update(orderRef, { items: updatedItems });
      });
    } catch (e) {
      console.error('Error adding vendor response:', e);
      toast({ title: 'Error', description: 'Failed to submit response.', variant: 'destructive' });
    }
  };

  const fetchAllOrders = useCallback(async (): Promise<Order[]> => {
    try {
      const q = collection(db, 'orders');
      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ orderId: d.id, ...d.data() } as Order));
      setOrders(all);
      return all;
    } catch (e) {
      console.error('Error fetching all orders:', e);
      setOrders([]);
      return [];
    }
  }, []);

  const removeOrder = async (orderId: string) => {
    try {
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', orderId);
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error("Order not found.");
        }
        const orderData = orderSnap.data() as Order;
        const vendorUsername = orderData.vendorUsername;

        if (orderData.pointsRedeemed && orderData.pointsRedeemed > 0) {
          const customerRef = doc(db, 'customers', orderData.customerUsername);
          const customerSnap = await transaction.get(customerRef);
          if (customerSnap.exists()) {
            const isCompleted = orderData.status === 'Delivered' || orderData.status === 'Picked Up';
            if (isCompleted) {
              transaction.update(customerRef, {
                [`hyperPoints.${vendorUsername}`]: increment(orderData.pointsRedeemed),
              });
            } else {
              transaction.update(customerRef, {
                [`lockedPoints.${vendorUsername}`]: increment(-orderData.pointsRedeemed),
              });
            }
          }
        }

        if ((orderData.status === 'Delivered' || orderData.status === 'Picked Up') && orderData.pointsEarned && orderData.pointsEarned > 0) {
          const customerRef = doc(db, 'customers', orderData.customerUsername);
          const customerSnap = await transaction.get(customerRef);
          if (customerSnap.exists()) {
            transaction.update(customerRef, {
              [`hyperPoints.${vendorUsername}`]: increment(-orderData.pointsEarned),
            });
          }
        }

        transaction.delete(orderRef);
      });

      setOrders(prevOrders => prevOrders.filter(order => order.orderId !== orderId));

      toast({ title: 'Success', description: 'Order has been deleted and points adjusted.' });
    } catch (e: any) {
      console.error("Error removing order:", e);
      toast({ title: 'Error', description: e.message || 'Could not remove the order.', variant: 'destructive' });
      throw e;
    }
  };

  const bulkDeleteCancelledOrdersForVendor = async (vendorUsername: string) => {
    try {
      const q = query(
        collection(db, 'orders'),
        where('vendorUsername', '==', vendorUsername),
        where('status', '==', 'Cancelled')
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        toast({ title: 'No Orders Found', description: 'There are no cancelled orders to delete for this vendor.' });
        return;
      }

      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      toast({ title: 'Success', description: `${snapshot.size} cancelled orders have been deleted.` });
    } catch (error: any) {
      console.error("Error in bulk delete:", error);
      toast({ title: 'Error', description: error.message || 'Failed to delete orders.', variant: 'destructive' });
    }
  };

  const value = useMemo(() => ({
    orders,
    setOrders,
    loadUserOrders,
    addOrder,
    updateOrderStatus,
    updateOrderItems,
    assignDeliveryBoyToOrder,
    addRatingToOrderItem,
    addRatingToVendor,
    addResponseToOrderItem,
    fetchAllOrders,
    removeOrder,
    bulkDeleteCancelledOrdersForVendor,
  }), [orders, fetchAllOrders, loadUserOrders]);

  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
};

export const useOrder = () => {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error('useOrder must be used within an OrderProvider');
  return ctx;
};

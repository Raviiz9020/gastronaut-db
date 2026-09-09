'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/context/cart-context';
import { OrderProvider } from '@/context/order-context';
import { CustomerProvider, useCustomer } from '@/context/customer-context';
import { MenuProvider } from '@/context/menu-context';
import { DeliveryProvider } from '@/context/delivery-context';
import { VendorProvider } from '@/context/vendor-context';
import { SuperAdminProvider } from '@/context/super-admin-context';
import { VendorCategoryProvider } from '@/context/vendor-category-context';
import { OfferProvider } from '@/context/offer-context';
import { RiderProvider } from '@/context/rider-context';
import { SiteReviewProvider } from '@/context/site-review-context';
import { SpecialMenuProvider } from '@/context/special-menu-context';
import { SiteSettingsProvider } from '@/context/site-settings-context';
import { ExpenseProvider } from '@/context/expense-context';
import { ExpenseCategoryProvider } from '@/context/expense-category-context';
import { RiderManagementProvider } from '@/context/rider-management-context';
import { LocationProvider } from '@/context/location-context';
import { AppProvider, useAppContext } from '@/context/app-context';
import OrderPlacedDialog from '@/components/order-placed-dialog';
import MobileBottomNav from '@/components/mobile-bottom-nav';
import { cn } from '@/lib/utils';

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  'G-TWDTCQ04E5';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isOrderPlacedDialogOpen, setIsOrderPlacedDialogOpen } = useAppContext();
  const { setCurrentCustomer } = useCustomer();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && typeof window !== 'undefined' && (window as any).gtag && GA_MEASUREMENT_ID) {
      // 100ms timeout ensures document.title has settled on client-side route transitions
      const timer = setTimeout(() => {
        (window as any).gtag('config', GA_MEASUREMENT_ID, {
          page_path: pathname,
          page_title: document.title || 'HyperDelivery – Order Food Online',
        });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  return (
    <OrderProvider setCurrentCustomer={setCurrentCustomer}>
      <div className="flex-1 flex flex-col pb-16 lg:pb-0">
        <main className={cn('flex-1 flex flex-col')}>{children}</main>
      </div>
      <MobileBottomNav />
      <OrderPlacedDialog
        isOpen={isOrderPlacedDialogOpen}
        onOpenChange={setIsOrderPlacedDialogOpen}
      />
    </OrderProvider>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SuperAdminProvider>
      <CustomerProvider>
        <LocationProvider>
          <VendorProvider>
            <RiderProvider>
              <RiderManagementProvider>
                <SiteSettingsProvider>
                  <VendorCategoryProvider>
                    <ExpenseCategoryProvider>
                      <OfferProvider>
                        <SiteReviewProvider>
                          <SpecialMenuProvider>
                            <MenuProvider>
                              <DeliveryProvider>
                                <ExpenseProvider>
                                  <CartProvider>
                                    <AppProvider>
                                      <LayoutContent>{children}</LayoutContent>
                                      <Toaster />
                                    </AppProvider>
                                  </CartProvider>
                                </ExpenseProvider>
                              </DeliveryProvider>
                            </MenuProvider>
                          </SpecialMenuProvider>
                        </SiteReviewProvider>
                      </OfferProvider>
                    </ExpenseCategoryProvider>
                  </VendorCategoryProvider>
                </SiteSettingsProvider>
              </RiderManagementProvider>
            </RiderProvider>
          </VendorProvider>
        </LocationProvider>
      </CustomerProvider>
    </SuperAdminProvider>
  );
}

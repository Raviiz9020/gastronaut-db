
'use client';

import type { Metadata } from 'next';
import Script from 'next/script';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { CartProvider } from '@/context/cart-context';
import { OrderProvider } from '@/context/order-context';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import { CustomerProvider, useCustomer } from '@/context/customer-context';
import { MenuProvider } from '@/context/menu-context';
import { DeliveryProvider } from '@/context/delivery-context';
import { VendorProvider, useVendor } from '@/context/vendor-context';
import { SuperAdminProvider } from '@/context/super-admin-context';
import React, { createContext, useContext, useState, useEffect } from 'react';
import OrderPlacedDialog from '@/components/order-placed-dialog';
import { VendorCategoryProvider } from '@/context/vendor-category-context';
import { OfferProvider } from '@/context/offer-context';
import { RiderProvider, useRider } from '@/context/rider-context';
import { SiteReviewProvider } from '@/context/site-review-context';
import { SpecialMenuProvider } from '@/context/special-menu-context';
import { SiteSettingsProvider } from '@/context/site-settings-context';
import { ExpenseProvider } from '@/context/expense-context';
import { ExpenseCategoryProvider } from '@/context/expense-category-context';
import { RiderManagementProvider } from '@/context/rider-management-context';
import { Loader2 } from 'lucide-react';
import type { Customer } from '@/types';
import { LocationProvider } from '@/context/location-context';
import MobileBottomNav from '@/components/mobile-bottom-nav';

// Create a context for the dialog
interface AppContextType {
  isOrderPlacedDialogOpen: boolean;
  showOrderPlacedDialog: () => void;
  closeOrderPlacedDialog: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};


const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  'G-TWDTCQ04E5';

// We need to wrap the layout content in a client component to use usePathname
function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isOrderPlacedDialogOpen, setIsOrderPlacedDialogOpen] = useState(false);
  const { setCurrentCustomer } = useCustomer();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && typeof window !== 'undefined' && (window as any).gtag && GA_MEASUREMENT_ID) {
      (window as any).gtag('config', GA_MEASUREMENT_ID, {
        page_path: pathname,
      });
    }
  }, [pathname]);

  const showOrderPlacedDialog = () => setIsOrderPlacedDialogOpen(true);
  const closeOrderPlacedDialog = () => setIsOrderPlacedDialogOpen(false);

  return (
     <AppContext.Provider value={{ isOrderPlacedDialogOpen, showOrderPlacedDialog, closeOrderPlacedDialog }}>
        <OrderProvider setCurrentCustomer={setCurrentCustomer}>
            <div className="flex-1 flex flex-col pb-16 lg:pb-0">
                <main className={cn("flex-1 flex flex-col")}>
                {children}
                </main>
            </div>
            <MobileBottomNav />
            <OrderPlacedDialog isOpen={isOrderPlacedDialogOpen} onOpenChange={setIsOrderPlacedDialogOpen} />
        </OrderProvider>
    </AppContext.Provider>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="font-body antialiased">
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
                            <LayoutContent>{children}</LayoutContent>
                            <Toaster />
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
      </body>
    </html>
  );
}

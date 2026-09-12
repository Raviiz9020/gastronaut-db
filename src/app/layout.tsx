import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import ClientLayout from './client-layout';

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ||
  'G-TWDTCQ04E5';

export const metadata: Metadata = {
  metadataBase: new URL('https://hyperdelivery.in'),
  title: {
    template: '%s | HyperDelivery',
    default: 'HyperDelivery – Order Food Online',
  },
  description: 'Order food from your favourite local restaurants on HyperDelivery.',
  icons: {
    icon: '/icon.svg',
  },
  openGraph: {
    title: 'HyperDelivery – Order Food Online',
    description: 'Order food from your favourite local restaurants on HyperDelivery. Fresh, fast & reliable delivery.',
    url: 'https://hyperdelivery.in',
    siteName: 'HyperDelivery',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: '/og-banner.jpg',
        width: 1200,
        height: 630,
        alt: 'HyperDelivery – Order Food Online',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HyperDelivery – Order Food Online',
    description: 'Order food from your favourite local restaurants on HyperDelivery.',
    images: ['/og-banner.jpg'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-body antialiased">
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
                    page_title: 'HyperDelivery – Order Food Online',
                  });
                `,
              }}
            />
          </>
        )}
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}


'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TermsOfServicePage() {
  const title = "Terms of Service";

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <Card className="w-full max-w-4xl mx-auto bg-card/80 backdrop-blur-sm border-primary/20 box-glow-primary rounded-3xl">
            <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <FileText className="h-8 w-8 text-primary animate-pulse"/>
                    <CardTitle className="font-headline text-4xl sm:text-5xl text-primary flex overflow-hidden">
                      {title.split("").map((char, i) => (
                        <motion.span
                          key={`${char}-${i}`}
                          initial={{ y: 0 }}
                          animate={{ y: [0, -10, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.1,
                            ease: 'easeInOut'
                          }}
                          style={{ whiteSpace: 'pre' }}
                        >
                          {char}
                        </motion.span>
                      ))}
                    </CardTitle>
                </div>
                 <CardDescription className="text-muted-foreground max-w-2xl mx-auto">
                    Effective Date: March 11, 2026
                </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert prose-p:text-sm prose-p:text-muted-foreground prose-h3:text-primary prose-strong:text-foreground prose-li:text-sm prose-li:text-muted-foreground mx-auto p-6">
                <p>
                    Welcome to HyperDelivery. These Terms of Service govern your use of the HyperDelivery platform, including our mobile application and website.
                </p>
                <p>
                    By accessing or using the HyperDelivery platform, you agree to comply with these Terms. If you do not agree with any part of these Terms, you should not use the platform.
                </p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">1. Our Role</h3>
                <p>
                    HyperDelivery is a technology platform that connects customers with local home chefs and vendors (“Vendors”). Our platform allows Vendors to list their products and enables customers to place orders with them.
                </p>
                <p>
                    HyperDelivery acts solely as a technology facilitator and does not manufacture, prepare, store, or deliver the products listed by Vendors.
                </p>
                <p>
                    Any transaction for the purchase of products is directly between the customer and the Vendor.
                </p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">2. User Accounts</h3>
                <p>
                    To use certain features of the platform, users may be required to create an account.
                </p>
                <p>Users are responsible for:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Maintaining the confidentiality of their account credentials</li>
                    <li>Ensuring the accuracy of information provided</li>
                    <li>All activities conducted under their account</li>
                </ul>
                <p>
                    HyperDelivery reserves the right to suspend or terminate accounts that violate these Terms or misuse the platform.
                </p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">3. Vendor Responsibilities</h3>
                <p>Vendors using the HyperDelivery platform are responsible for:</p>
                
                <p><strong>Product Quality:</strong> Vendors are solely responsible for the quality, safety, and legality of the products they offer.</p>
                <p><strong>Delivery:</strong> Vendors are responsible for the preparation and delivery of the goods ordered through the platform. HyperDelivery does not manage the physical delivery of items.</p>
                <p><strong>Product Information:</strong> Vendors must provide accurate information regarding product descriptions, pricing, and availability.</p>
                <p><strong>Product Images:</strong> Images displayed on the platform are for illustrative purposes only. While Vendors strive to provide accurate representations, the actual product received may vary slightly in appearance. The product description should be considered the primary reference.</p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">4. Orders and Cancellations</h3>
                <p>Orders placed through the platform are requests to purchase products from Vendors.</p>
                <p>Vendors may accept or reject orders based on availability or operational constraints.</p>
                <p>In cases where an order cannot be fulfilled, the Vendor may cancel the order and inform the customer accordingly.</p>
                <p>Customers are expected to place orders responsibly and avoid misuse of the platform.</p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">5. Payments</h3>
                <p>HyperDelivery provides QR code generation to simplify payment between customers and Vendors.</p>
                <p>HyperDelivery does not process payments and is not responsible for payment processing, transaction failures, or disputes arising from UPI or bank transactions.</p>
                <p>In the event of payment issues, customers and Vendors should first attempt to resolve the issue directly. If necessary, users should contact their respective bank or UPI service provider.</p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">6. Platform Availability</h3>
                <p>While we strive to provide uninterrupted service, HyperDelivery does not guarantee that the platform will always be available without interruption.</p>
                <p>The service may occasionally be unavailable due to system maintenance, technical issues, or updates.</p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">7. Prohibited Use</h3>
                <p>Users agree not to misuse the platform. This includes but is not limited to:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Placing fraudulent or fake orders</li>
                    <li>Abusing or harassing Vendors or other users</li>
                    <li>Attempting to interfere with platform functionality</li>
                    <li>Using the platform for unlawful activities</li>
                </ul>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">8. Limitation of Liability</h3>
                <p>HyperDelivery is provided on an “as is” and “as available” basis.</p>
                <p>We do not make any warranties regarding product quality provided by Vendors, delivery timelines, or availability of products.</p>
                <p>HyperDelivery shall not be liable for any direct or indirect damages arising from the use of the platform.</p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">9. Changes to These Terms</h3>
                <p>HyperDelivery reserves the right to update or modify these Terms at any time.</p>
                <p>Any updates will be posted on this page. Continued use of the platform after changes indicates acceptance of the revised Terms.</p>

                <h3 className="font-headline text-xl mt-8 border-t pt-4">10. Contact Us</h3>
                <p>If you have questions about these Terms of Service, please contact us:</p>
                <p>Email: <strong>rvp.officework@gmail.com</strong></p>

            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

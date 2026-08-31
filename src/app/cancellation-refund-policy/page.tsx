'use client';

import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CancellationRefundPolicyPage() {
  const words = ["Cancellation", "&", "Refund", "Policy"];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-4xl"
        >
          <div className="mb-4">
            <Link href="/" passHref>
              <Button variant="outline" size="sm" className="rounded-full gap-2 border-primary/20 hover:bg-primary/10">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>

          <Card className="w-full bg-card/80 backdrop-blur-sm border-primary/20 box-glow-primary rounded-3xl">
            <CardHeader className="text-center px-4 sm:px-6">
              <div className="flex items-center justify-center gap-2 sm:gap-3 mb-2">
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse flex-shrink-0" />
                <CardTitle className="font-headline text-2xl sm:text-4xl md:text-5xl text-primary flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                  {words.map((word, wordIndex) => (
                    <span key={wordIndex} className="inline-flex">
                      {word.split("").map((char, charIndex) => (
                        <motion.span
                          key={`${char}-${charIndex}`}
                          initial={{ y: 0 }}
                          animate={{ y: [0, -6, 0] }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: (wordIndex * 4 + charIndex) * 0.04,
                            ease: 'easeInOut'
                          }}
                          style={{ whiteSpace: 'pre' }}
                        >
                          {char}
                        </motion.span>
                      ))}
                    </span>
                  ))}
                </CardTitle>
              </div>
              <CardDescription className="text-muted-foreground max-w-2xl mx-auto text-xs sm:text-sm">
                Last updated on: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </CardDescription>
            </CardHeader>
            <CardContent className="prose prose-sm prose-invert prose-p:text-sm prose-p:text-muted-foreground prose-h3:text-primary prose-strong:text-foreground prose-li:text-sm prose-li:text-muted-foreground mx-auto p-6">
              <p>
                HyperDelivery ("we", "our", "us") believes in helping its customers as far as possible, and has therefore a liberal cancellation policy. Under this policy:
              </p>
              <p>
                <strong>HyperDelivery acts as a technology platform connecting customers with independent restaurants and home chefs. Refund decisions may require verification with the respective vendor where applicable.</strong>
              </p>

              <h3 className="font-headline text-xl mt-8">1. Cancellations</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Timeframe for Cancellation:</strong> Cancellations will be considered only if the request is made within 10 minutes of placing the order. <strong>Orders cannot be cancelled once the restaurant/vendor has started preparing the order.</strong></li>
                <li><strong>Order Rejected Before Preparation:</strong> If the vendor is unable to accept your order before preparation begins, any prepaid amount will be refunded in full.</li>
                <li><strong>Non-Cancellable Items:</strong> We do not accept cancellation requests for perishable items once preparation has started. However, a refund/replacement can be made if the user establishes that the quality of product delivered is not good.</li>
              </ul>

              <h3 className="font-headline text-xl mt-8">2. Refunds</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Failed Deliveries / Merchant Issues:</strong> In case you do not receive your order, or the vendor cancels your order due to unavailability, a full refund will be initiated automatically.</li>
                <li><strong>Damaged or Incorrect Items:</strong> In case of receipt of damaged or defective items, please report the same to our Customer Service team. The request will, however, be entertained once the merchant has checked and determined the same at their own end. This should be reported within 2 hours of receipt of the products.</li>
                <li><strong>Customer Mistakes:</strong> Orders placed with an incorrect delivery address, incorrect contact details, or accidental orders may not be eligible for a refund once preparation has begun.</li>
                <li><strong>Delivery Delays:</strong> Delays caused by traffic, weather, or unforeseen circumstances do not automatically qualify for a refund.</li>
                <li><strong>Partial Refunds:</strong> In certain cases, HyperDelivery may offer a full refund, partial refund, replacement, or store credit, depending on the nature of the issue.</li>
                <li><strong>Approval of Refund:</strong> Once your refund request is approved, it will be processed immediately on our end.</li>
              </ul>

              <h3 className="font-headline text-xl mt-8">3. Refund Processing Time</h3>
              <p>
                For approved refunds, the amount will be credited back to your original method of payment (Credit Card, Debit Card, UPI, Netbanking, etc.) within <strong>5 to 7 working days</strong>. Please note that the exact time for the refund to reflect in your account depends on your bank or payment provider.
              </p>

              <h3 className="font-headline text-xl mt-8">4. Contact Us</h3>
              <p>If you have any questions about our Cancellation and Refunds Policy, please contact us at:</p>
              <p>Email: <strong>hyperlabsupport@gmail.com</strong></p>

            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

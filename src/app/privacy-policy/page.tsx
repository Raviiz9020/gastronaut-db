'use client';

import React from 'react';
import Header from '@/components/header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-28 md:pb-16">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 sm:py-10 md:py-14 max-w-4xl">
        {/* Navigation Bar / Top Bar */}
        <div className="flex items-center justify-between gap-3 mb-6 sm:mb-8">
          <Link href="/" passHref>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full border-border/70 hover:border-primary/50 hover:bg-primary/10 transition-all shadow-xs"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[11px] sm:text-xs font-semibold text-primary shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-primary flex-shrink-0 animate-pulse" />
            <span>Privacy & Data Protection</span>
          </div>
        </div>

        {/* Hero Section */}
        <section className="text-center max-w-2xl mx-auto mb-8 sm:mb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3">
              Privacy{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                Policy
              </span>
            </h1>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground mb-4">
              <Calendar className="h-3.5 w-3.5 text-primary" />
              <span>Effective Date: March 11, 2026</span>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              How HyperDelivery collects, uses, and safeguards your information when you use our mobile application and services.
            </p>
          </motion.div>
        </section>

        {/* Content Card with Verbatim Legal Text */}
        <Card className="rounded-3xl border-border/80 bg-card/60 backdrop-blur-md p-5 sm:p-8 md:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <CardContent className="prose prose-sm dark:prose-invert max-w-none p-0 text-muted-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-muted-foreground prose-headings:font-headline leading-relaxed space-y-6">
            <p>
              Welcome to HyperDelivery. Your privacy is important to us, and we are committed to protecting your personal information and being transparent about how we collect and use it. This Privacy Policy explains how HyperDelivery collects, uses, and safeguards your information when you use our mobile application and services.
            </p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">1. Information We Collect</h3>
            <p>To provide and improve our services, we may collect the following types of information:</p>

            <p className="font-semibold text-foreground">Personal Information</p>
            <p>When you create an account or use our services, we may collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Name or username</li>
              <li>Email address (when using Google Sign-In)</li>
              <li>Phone number</li>
              <li>Delivery address entered by you</li>
            </ul>
            <p>This information is necessary to create and manage your account and facilitate order delivery.</p>

            <p className="font-semibold text-foreground">Order Information</p>
            <p>When you place an order through the platform, we collect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Products ordered</li>
              <li>Order history</li>
              <li>Order status and transaction details</li>
            </ul>
            <p>This helps us manage orders and improve service quality.</p>

            <p className="font-semibold text-foreground">Feedback and Reviews</p>
            <p>We may collect ratings, reviews, or feedback you provide regarding vendors, products, or our services.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">2. Automatically Collected Information</h3>
            <p>When you use the HyperDelivery application, certain technical information may be automatically collected to ensure the app functions properly.</p>
            <p>This may include:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Device type</li>
              <li>Operating system version</li>
              <li>App diagnostics such as crash reports</li>
            </ul>
            <p>This information is used only to improve app stability, performance, and reliability.</p>
            <p>We do not collect precise location data or track user activity outside the app.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">3. How We Use Your Information</h3>
            <p>We use the information collected for the following purposes:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>To process and manage orders placed through the platform</li>
              <li>To facilitate delivery between customers, vendors, and delivery personnel</li>
              <li>To manage your account and provide customer support</li>
              <li>To send important notifications related to orders and service updates</li>
              <li>To improve our platform based on user feedback and order history</li>
              <li>For internal record keeping and operational purposes within the HyperDelivery community</li>
            </ul>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">4. Data Sharing</h3>
            <p>We value your privacy and handle your information responsibly.</p>
            <p>Your personal information is not sold or shared with third-party companies for marketing purposes.</p>
            <p>However, certain information may be shared in the following situations:</p>

            <p className="font-semibold text-foreground">Vendors and Delivery Personnel</p>
            <p>Your delivery address, name, and phone number may be shared with the specific vendor and delivery personnel responsible for fulfilling your order. This is necessary to complete the delivery process.</p>

            <p className="font-semibold text-foreground">Service Providers</p>
            <p>We may use trusted third-party services that help operate the application, such as:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Google Sign-In for secure authentication</li>
              <li>Firebase Cloud Messaging for sending order notifications</li>
              <li>Google Play Services for application functionality</li>
            </ul>
            <p>These services operate under their own privacy policies.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">5. Data Security</h3>
            <p>We are committed to ensuring that your information is secure. We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, misuse, or disclosure.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">6. Data Retention</h3>
            <p>We retain personal information only for as long as necessary to provide our services, maintain order records, and comply with legal or operational requirements.</p>
            <p>Users may request deletion of their account and associated personal data by contacting us.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">7. Your Rights</h3>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access your personal information</li>
              <li>Update or correct your information</li>
              <li>Request deletion of your account and associated data</li>
            </ul>
            <p>You can manage some of this information directly through your account settings or contact us for assistance.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">8. Children’s Privacy</h3>
            <p>HyperDelivery is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that such information has been collected, we will take appropriate steps to remove it.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">9. Changes to This Privacy Policy</h3>
            <p>We may update this Privacy Policy from time to time to reflect changes in our services or legal requirements. Any updates will be posted on this page with the revised effective date.</p>
            <p>We encourage users to review this policy periodically.</p>

            <h3 className="text-lg sm:text-xl font-bold mt-8 pt-4 border-t border-border/60">10. Contact Us</h3>
            <p>If you have any questions or concerns about this Privacy Policy or how your information is handled, please contact us:</p>
            <p>Email: <a href="mailto:hyperlabsupport@gmail.com" className="text-primary hover:underline font-semibold">hyperlabsupport@gmail.com</a></p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

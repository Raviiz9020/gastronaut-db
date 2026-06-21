
'use client';

import Header from '@/components/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PrivacyPolicyPage() {
  const title = "Privacy Policy";

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
                    Welcome to HyperDelivery. Your privacy is important to us, and we are committed to protecting your personal information and being transparent about how we collect and use it. This Privacy Policy explains how HyperDelivery collects, uses, and safeguards your information when you use our mobile application and services.
                </p>

                <h3 className="font-headline text-xl mt-8">1. Information We Collect</h3>
                <p>To provide and improve our services, we may collect the following types of information:</p>
                
                <p><strong>Personal Information</strong></p>
                <p>When you create an account or use our services, we may collect:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Name or username</li>
                    <li>Email address (when using Google Sign-In)</li>
                    <li>Phone number</li>
                    <li>Delivery address entered by you</li>
                </ul>
                <p>This information is necessary to create and manage your account and facilitate order delivery.</p>

                <p><strong>Order Information</strong></p>
                <p>When you place an order through the platform, we collect:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Products ordered</li>
                    <li>Order history</li>
                    <li>Order status and transaction details</li>
                </ul>
                <p>This helps us manage orders and improve service quality.</p>

                <p><strong>Feedback and Reviews</strong></p>
                <p>We may collect ratings, reviews, or feedback you provide regarding vendors, products, or our services.</p>

                <h3 className="font-headline text-xl mt-8">2. Automatically Collected Information</h3>
                <p>When you use the HyperDelivery application, certain technical information may be automatically collected to ensure the app functions properly.</p>
                <p>This may include:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Device type</li>
                    <li>Operating system version</li>
                    <li>App diagnostics such as crash reports</li>
                </ul>
                <p>This information is used only to improve app stability, performance, and reliability.</p>
                <p>We do not collect precise location data or track user activity outside the app.</p>

                <h3 className="font-headline text-xl mt-8">3. How We Use Your Information</h3>
                <p>We use the information collected for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>To process and manage orders placed through the platform</li>
                    <li>To facilitate delivery between customers, vendors, and delivery personnel</li>
                    <li>To manage your account and provide customer support</li>
                    <li>To send important notifications related to orders and service updates</li>
                    <li>To improve our platform based on user feedback and order history</li>
                    <li>For internal record keeping and operational purposes within the HyperDelivery community</li>
                </ul>

                <h3 className="font-headline text-xl mt-8">4. Data Sharing</h3>
                <p>We value your privacy and handle your information responsibly.</p>
                <p>Your personal information is not sold or shared with third-party companies for marketing purposes.</p>
                <p>However, certain information may be shared in the following situations:</p>

                <p><strong>Vendors and Delivery Personnel</strong></p>
                <p>Your delivery address, name, and phone number may be shared with the specific vendor and delivery personnel responsible for fulfilling your order. This is necessary to complete the delivery process.</p>

                <p><strong>Service Providers</strong></p>
                <p>We may use trusted third-party services that help operate the application, such as:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Google Sign-In for secure authentication</li>
                    <li>Firebase Cloud Messaging for sending order notifications</li>
                    <li>Google Play Services for application functionality</li>
                </ul>
                <p>These services operate under their own privacy policies.</p>

                <h3 className="font-headline text-xl mt-8">5. Data Security</h3>
                <p>We are committed to ensuring that your information is secure. We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, misuse, or disclosure.</p>

                <h3 className="font-headline text-xl mt-8">6. Data Retention</h3>
                <p>We retain personal information only for as long as necessary to provide our services, maintain order records, and comply with legal or operational requirements.</p>
                <p>Users may request deletion of their account and associated personal data by contacting us.</p>

                <h3 className="font-headline text-xl mt-8">7. Your Rights</h3>
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-1">
                    <li>Access your personal information</li>
                    <li>Update or correct your information</li>
                    <li>Request deletion of your account and associated data</li>
                </ul>
                <p>You can manage some of this information directly through your account settings or contact us for assistance.</p>

                <h3 className="font-headline text-xl mt-8">8. Children’s Privacy</h3>
                <p>HyperDelivery is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that such information has been collected, we will take appropriate steps to remove it.</p>

                <h3 className="font-headline text-xl mt-8">9. Changes to This Privacy Policy</h3>
                <p>We may update this Privacy Policy from time to time to reflect changes in our services or legal requirements. Any updates will be posted on this page with the revised effective date.</p>
                <p>We encourage users to review this policy periodically.</p>

                <h3 className="font-headline text-xl mt-8">10. Contact Us</h3>
                <p>If you have any questions or concerns about this Privacy Policy or how your information is handled, please contact us:</p>
                <p>Email: <strong>rvp.officework@gmail.com</strong></p>

            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}

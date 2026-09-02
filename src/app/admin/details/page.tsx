
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Building, Rocket, ChevronLeft, Upload, Loader2, Info, Mail, Bike, Home, AlertCircle, KeyRound, MapPin, BadgePercent, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useVendor } from '@/context/vendor-context';
import { useVendorCategory } from '@/context/vendor-category-context';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import Image from 'next/image';
import { compressImage, uploadImageToStorage } from '@/lib/client-utils';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { DeliveryType, EmailPreferences } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const GoogleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-5 w-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
        <path fill="none" d="M0 0h48v48H0z"></path>
    </svg>
);


const TermsDialog = ({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl rounded-2xl">
                <Tabs defaultValue="terms" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-full">
                        <TabsTrigger value="terms" className="rounded-full">Terms of Service</TabsTrigger>
                        <TabsTrigger value="privacy" className="rounded-full">Privacy Policy</TabsTrigger>
                    </TabsList>
                    <TabsContent value="terms">
                        <DialogHeader>
                            <DialogTitle className="text-2xl">Terms of Service</DialogTitle>
                            <DialogDescription>Effective Date: March 11, 2026</DialogDescription>
                        </DialogHeader>
                        <ScrollArea className="h-[50vh] pr-4 mt-4">
                            <div className="prose prose-sm dark:prose-invert">
                                <p>Welcome to HyperDelivery. These Terms of Service govern your use of the HyperDelivery platform, including our mobile application and website.</p>
                                <p>By accessing or using the HyperDelivery platform, you agree to comply with these Terms. If you do not agree with any part of these Terms, you should not use the platform.</p>
                                
                                <h3>1. Our Role</h3>
                                <p>HyperDelivery is a technology platform that connects customers with local home chefs and vendors (“Vendors”). Our platform allows Vendors to list their products and enables customers to place orders with them.</p>
                                <p>HyperDelivery acts solely as a technology facilitator and does not manufacture, prepare, store, or deliver the products listed by Vendors.</p>
                                <p>Any transaction for the purchase of products is directly between the customer and the Vendor.</p>

                                <h3>2. User Accounts</h3>
                                <p>To use certain features of the platform, users may be required to create an account.</p>
                                <p>Users are responsible for:</p>
                                <ul>
                                    <li>Maintaining the confidentiality of their account credentials</li>
                                    <li>Ensuring the accuracy of information provided</li>
                                    <li>All activities conducted under their account</li>
                                </ul>
                                <p>HyperDelivery reserves the right to suspend or terminate accounts that violate these Terms or misuse the platform.</p>

                                <h3>3. Vendor Responsibilities</h3>
                                <p>Vendors using the HyperDelivery platform are responsible for:</p>
                                <p><strong>Product Quality:</strong> Vendors are solely responsible for the quality, safety, and legality of the products they offer.</p>
                                <p><strong>Delivery:</strong> Vendors are responsible for the preparation and delivery of the goods ordered through the platform. HyperDelivery does not manage the physical delivery of items.</p>
                                <p><strong>Product Information:</strong> Vendors must provide accurate information regarding product descriptions, pricing, and availability.</p>
                                <p><strong>Product Images:</strong> Images displayed on the platform are for illustrative purposes only. While Vendors strive to provide accurate representations, the actual product received may vary slightly in appearance. The product description should be considered the primary reference.</p>

                                <h3>4. Orders and Cancellations</h3>
                                <p>Orders placed through the platform are requests to purchase products from Vendors.</p>
                                <p>Vendors may accept or reject orders based on availability or operational constraints.</p>
                                <p>In cases where an order cannot be fulfilled, the Vendor may cancel the order and inform the customer accordingly.</p>
                                <p>Customers are expected to place orders responsibly and avoid misuse of the platform.</p>

                                <h3>5. Payments</h3>
                                <p>HyperDelivery provides QR code generation to simplify payment between customers and Vendors.</p>
                                <p>HyperDelivery does not process payments and is not responsible for payment processing, transaction failures, or disputes arising from UPI or bank transactions.</p>
                                <p>In the event of payment issues, customers and Vendors should first attempt to resolve the issue directly. If necessary, users should contact their respective bank or UPI service provider.</p>

                                <h3>6. Platform Availability</h3>
                                <p>While we strive to provide uninterrupted service, HyperDelivery does not guarantee that the platform will always be available without interruption.</p>
                                <p>The service may occasionally be unavailable due to:</p>
                                <ul>
                                    <li>system maintenance</li>
                                    <li>technical issues</li>
                                    <li>updates or improvements</li>
                                </ul>

                                <h3>7. Prohibited Use</h3>
                                <p>Users agree not to misuse the platform. This includes but is not limited to:</p>
                                <ul>
                                    <li>placing fraudulent or fake orders</li>
                                    <li>abusing or harassing Vendors or other users</li>
                                    <li>attempting to interfere with platform functionality</li>
                                    <li>using the platform for unlawful activities</li>
                                </ul>
                                <p>HyperDelivery reserves the right to suspend or restrict access to users who violate these rules.</p>

                                <h3>8. Limitation of Liability</h3>
                                <p>HyperDelivery is provided on an “as is” and “as available” basis.</p>
                                <p>We do not make any warranties regarding:</p>
                                <ul>
                                    <li>product quality provided by Vendors</li>
                                    <li>delivery timelines</li>
                                    <li>availability of products</li>
                                </ul>
                                <p>HyperDelivery shall not be liable for any direct or indirect damages arising from the use of the platform.</p>

                                <h3>9. Changes to These Terms</h3>
                                <p>HyperDelivery reserves the right to update or modify these Terms at any time.</p>
                                <p>Any updates will be posted on this page. Continued use of the platform after changes indicates acceptance of the revised Terms.</p>

                                <h3>10. Contact Us</h3>
                                <p>If you have questions about these Terms of Service, please contact us:</p>
                                <p>Email: <strong>rvp.officework@gmail.com</strong></p>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                    <TabsContent value="privacy">
                         <DialogHeader>
                            <DialogTitle className="text-2xl">Privacy Policy</DialogTitle>
                            <DialogDescription>Effective Date: March 11, 2026</DialogDescription>
                        </DialogHeader>
                         <ScrollArea className="h-[50vh] pr-4 mt-4">
                             <div className="prose prose-sm dark:prose-invert">
                                <p>Welcome to HyperDelivery. Your privacy is important to us, and we are committed to protecting your personal information and being transparent about how we collect and use it. This Privacy Policy explains how HyperDelivery collects, uses, and safeguards your information when you use our mobile application and services.</p>
                                
                                <h3>1. Information We Collect</h3>
                                <p>To provide and improve our services, we may collect the following types of information:</p>
                                <p><strong>Personal Information</strong></p>
                                <p>When you create an account or use our services, we may collect:</p>
                                <ul>
                                    <li>Name or username</li>
                                    <li>Email address (when using Google Sign-In)</li>
                                    <li>Phone number</li>
                                    <li>Delivery address entered by you</li>
                                </ul>
                                <p>This information is necessary to create and manage your account and facilitate order delivery.</p>

                                <p><strong>Order Information</strong></p>
                                <p>When you place an order through the platform, we collect:</p>
                                <ul>
                                    <li>Products ordered</li>
                                    <li>Order history</li>
                                    <li>Order status and transaction details</li>
                                </ul>
                                <p>This helps us manage orders and improve service quality.</p>

                                <p><strong>Feedback and Reviews</strong></p>
                                <p>We may collect ratings, reviews, or feedback you provide regarding vendors, products, or our services.</p>

                                <h3>2. Automatically Collected Information</h3>
                                <p>When you use the HyperDelivery application, certain technical information may be automatically collected to ensure the app functions properly.</p>
                                <p>This may include:</p>
                                <ul>
                                    <li>Device type</li>
                                    <li>Operating system version</li>
                                    <li>App diagnostics such as crash reports</li>
                                </ul>
                                <p>This information is used only to improve app stability, performance, and reliability.</p>
                                <p>We do not collect precise location data or track user activity outside the app.</p>

                                <h3>3. How We Use Your Information</h3>
                                <p>We use the information collected for the following purposes:</p>
                                <ul>
                                    <li>To process and manage orders placed through the platform</li>
                                    <li>To facilitate delivery between customers, vendors, and delivery personnel</li>
                                    <li>To manage your account and provide customer support</li>
                                    <li>To send important notifications related to orders and service updates</li>
                                    <li>To improve our platform based on user feedback and order history</li>
                                    <li>For internal record keeping and operational purposes within the HyperDelivery community</li>
                                </ul>

                                <h3>4. Data Sharing</h3>
                                <p>We value your privacy and handle your information responsibly.</p>
                                <p>Your personal information is not sold or shared with third-party companies for marketing purposes.</p>
                                <p>However, certain information may be shared in the following situations:</p>

                                <p><strong>Vendors and Delivery Personnel</strong></p>
                                <p>Your delivery address, name, and phone number may be shared with the specific vendor and delivery personnel responsible for fulfilling your order. This is necessary to complete the delivery process.</p>

                                <p><strong>Service Providers</strong></p>
                                <p>We may use trusted third-party services that help operate the application, such as:</p>
                                <ul>
                                    <li>Google Sign-In for secure authentication</li>
                                    <li>Firebase Cloud Messaging for sending order notifications</li>
                                    <li>Google Play Services for application functionality</li>
                                </ul>
                                <p>These services operate under their own privacy policies.</p>

                                <h3>5. Data Security</h3>
                                <p>We are committed to ensuring that your information is secure. We implement appropriate technical and organizational measures to protect your personal information from unauthorized access, misuse, or disclosure.</p>

                                <h3>6. Data Retention</h3>
                                <p>We retain personal information only for as long as necessary to provide our services, maintain order records, and comply with legal or operational requirements.</p>
                                <p>Users may request deletion of their account and associated personal data by contacting us.</p>

                                <h3>7. Your Rights</h3>
                                <p>You have the right to:</p>
                                <ul>
                                    <li>Access your personal information</li>
                                    <li>Update or correct your information</li>
                                    <li>Request deletion of your account and associated data</li>
                                </ul>
                                <p>You can manage some of this information directly through your account settings or contact us for assistance.</p>

                                <h3>8. Children’s Privacy</h3>
                                <p>HyperDelivery is not intended for use by individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that such information has been collected, we will take appropriate steps to remove it.</p>

                                <h3>9. Changes to This Privacy Policy</h3>
                                <p>We may update this Privacy Policy from time to time to reflect changes in our services or legal requirements. Any updates will be posted on this page with the revised effective date.</p>
                                <p>We encourage users to review this policy periodically.</p>

                                <h3>10. Contact Us</h3>
                                <p>If you have any questions or concerns about this Privacy Policy or how your information is handled, please contact us:</p>
                                <p>Email: <strong>rvp.officework@gmail.com</strong></p>
                            </div>
                        </ScrollArea>
                    </TabsContent>
                </Tabs>
                 <DialogFooter className="mt-4">
                    <DialogClose asChild>
                        <Button type="button">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function VendorDetailsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { vendor, updateDetails, linkNewGoogleAccount } = useVendor();

    const [shopName, setShopName] = useState('');
    const [contact, setContact] = useState('');
    const [address, setAddress] = useState('');
    const [googleMapsUrl, setGoogleMapsUrl] = useState('');
    const [category, setCategory] = useState('');
    const [minOrderAmount, setMinOrderAmount] = useState(0);
    const [freeDeliveryDistanceKm, setFreeDeliveryDistanceKm] = useState(0);
    const [about, setAbout] = useState('');
    const [workingHours, setWorkingHours] = useState('');
    const [tagline, setTagline] = useState('');
    const [shopImage, setShopImage] = useState('');
    const [upiId, setUpiId] = useState('');
    const [telegramChatId, setTelegramChatId] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
    const [deliveryType, setDeliveryType] = useState<DeliveryType>('All');
    const [dineInTables, setDineInTables] = useState(0);
    const [emailPreferences, setEmailPreferences] = useState<EmailPreferences>({ campaigns: true });

    const [isSaving, setIsSaving] = useState(false);
    const [isLinking, setIsLinking] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!vendor) {
            router.replace('/admin/login');
            return;
        }
        
        setShopName(vendor.shopName || '');
        setContact((vendor.contact || '').replace('+91', ''));
        setAddress(vendor.address || '');
        setGoogleMapsUrl(vendor.googleMapsUrl || '');
        setCategory(vendor.category || '');
        setMinOrderAmount(vendor.minOrderAmount || 0);
        setFreeDeliveryDistanceKm(vendor.freeDeliveryDistanceKm || 0);
        setAbout(vendor.about || '');
        setWorkingHours(vendor.workingHours || '');
        setTagline(vendor.tagline || '');
        setShopImage(vendor.shopImage || 'https://placehold.co/400x225');
        setUpiId(vendor.upiId || '');
        setTelegramChatId(vendor.telegramChatId || '');
        setTermsAccepted(vendor.termsAccepted || false);
        setDeliveryType(vendor.deliveryType || 'All');
        setDineInTables(vendor.dineInTables || 0);
        setEmailPreferences(vendor.emailPreferences || { campaigns: true });

    }, [vendor, router]);
    
     const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && vendor) {
          setIsSaving(true);
          try {
            const { compressedDataUrl } = await compressImage(URL.createObjectURL(file));
            const imageUrl = await uploadImageToStorage(compressedDataUrl, `shop-images/${vendor.username}/${Date.now()}`);
            setShopImage(imageUrl);
            toast({ title: 'Image Uploaded', description: 'The image has been uploaded. Save to confirm.' });
          } catch (err) {
            console.error(err);
            toast({ title: 'Image upload error', description: 'Could not process the uploaded image.', variant: 'destructive'});
          } finally {
            setIsSaving(false);
          }
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleLinkAccount = async () => {
        setIsLinking(true);
        try {
            await linkNewGoogleAccount();
            // The context handles the success toast and logout
        } catch (e) {
            // The context handles the error toast
        } finally {
            setIsLinking(false);
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (contact && contact.length !== 10) {
            toast({
                title: "Invalid Contact Number",
                description: "Please enter a valid 10-digit mobile number.",
                variant: "destructive",
            });
            return;
        }
        
        if (!shopName || !contact || !address) {
            toast({
                title: "Incomplete Details",
                description: "Please fill in the required fields: Shop Name, Contact, and Address.",
                variant: "destructive",
            });
            return;
        }
        setIsSaving(true);
        try {
            const details = { 
                shopName, 
                contact, 
                address, 
                googleMapsUrl,
                category, 
                minOrderAmount, 
                freeDeliveryDistanceKm,
                about, 
                workingHours, 
                tagline, 
                shopImage, 
                upiId, 
                telegramChatId,
                termsAccepted,
                deliveryType,
                dineInTables,
                emailPreferences,
            };
            await updateDetails(details);
            
            toast({
                title: "Details Saved!",
                description: "Your shop information has been updated.",
            });

            router.push('/admin/dashboard/orders');
            
        } catch (error: any) {
             toast({
                title: "Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
          setIsSaving(false);
        }
    }
    
    const isSaveDisabled = isSaving || !termsAccepted || isLinking;


  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-16">
        {/* Top Header & Quick Actions */}
        <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/60 py-3.5 px-4 sm:px-8">
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" passHref>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold font-headline text-foreground flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Shop Settings
                </h1>
                <p className="text-xs text-muted-foreground hidden sm:block">
                  Manage your store profile, delivery rules, and business operations.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <Link href={`/vendor/${vendor?.slug || vendor?.username}`} target="_blank" className="hidden sm:inline-flex">
                <Button variant="outline" size="sm" className="rounded-full text-xs font-semibold gap-1.5 h-9">
                  <span>View Storefront</span>
                  <Rocket className="h-3.5 w-3.5 text-primary" />
                </Button>
              </Link>

              <Button
                type="button"
                onClick={(e) => {
                  const form = document.getElementById('vendor-details-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                size="sm"
                className="rounded-full font-bold text-xs h-9 px-4 gap-1.5 shadow-xs"
                disabled={isSaveDisabled}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="h-3.5 w-3.5" />
                    <span>Save Changes</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6">
          {vendor && !vendor.isApproved && (
            <Alert variant="default" className="mb-6 rounded-2xl bg-blue-950/20 border-blue-500/30 text-foreground">
              <Info className="h-4 w-4 text-blue-400" />
              <AlertTitle className="text-blue-300 font-bold">Welcome to HyperDelivery!</AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-1">
                Thank you for signing up. Please fill out your shop details below. To get your account approved and start selling, contact us at: <strong className="font-bold text-foreground">+917083609020</strong>
              </AlertDescription>
            </Alert>
          )}

          <form id="vendor-details-form" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form Area with Categorized Tabs */}
              <div className="lg:col-span-8 space-y-6">
                <Tabs defaultValue="profile" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full h-11 rounded-2xl bg-muted/70 p-1 border border-border/50">
                    <TabsTrigger value="profile" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                      <Building className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Profile</span>
                    </TabsTrigger>
                    <TabsTrigger value="location" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Location</span>
                    </TabsTrigger>
                    <TabsTrigger value="fulfillment" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                      <Bike className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Fulfillment</span>
                    </TabsTrigger>
                    <TabsTrigger value="security" className="rounded-xl text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Security</span>
                    </TabsTrigger>
                  </TabsList>

                  {/* Tab 1: Profile & Identity */}
                  <TabsContent value="profile" className="mt-4 space-y-4">
                    <Card className="rounded-3xl border-border/70 shadow-xs bg-card/90 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Building className="h-4 w-4 text-primary" /> Store Identity
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Basic information displayed to customers browsing your store.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="shopName" className="text-xs font-bold">Shop Name *</Label>
                            <Input
                              id="shopName"
                              placeholder="e.g., The Future Eatery"
                              value={shopName}
                              onChange={(e) => setShopName(e.target.value)}
                              required
                              className="rounded-xl h-10 text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="category" className="text-xs font-bold">Shop Category</Label>
                            <Input 
                              id="category" 
                              value={category || 'To be assigned by admin'} 
                              readOnly 
                              className="rounded-xl h-10 text-xs bg-muted/50 cursor-not-allowed text-muted-foreground"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="tagline" className="text-xs font-bold">Tagline</Label>
                          <Input
                            id="tagline"
                            placeholder="e.g., Authentic home-cooked flavours & gourmet treats"
                            value={tagline}
                            onChange={(e) => setTagline(e.target.value)}
                            className="rounded-xl h-10 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="about" className="text-xs font-bold">About your shop</Label>
                          <Textarea
                            id="about"
                            placeholder="Tell customers about your kitchen, specialties, and story..."
                            value={about}
                            onChange={(e) => setAbout(e.target.value)}
                            rows={3}
                            className="rounded-xl text-xs"
                          />
                        </div>

                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <Label className="text-xs font-bold">Shop Banner / Logo Image</Label>
                          <div className="flex items-center gap-4">
                            <div className="relative w-28 h-20 rounded-2xl bg-muted/60 border border-border/60 overflow-hidden shrink-0 shadow-2xs">
                              {shopImage ? (
                                <Image src={shopImage} alt="Shop preview" fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                                  No Image
                                </div>
                              )}
                            </div>
                            <div className="space-y-1.5">
                              <Button
                                type="button"
                                onClick={handleUploadClick}
                                variant="outline"
                                size="sm"
                                className="rounded-full text-xs font-bold gap-1.5"
                                disabled={isSaving}
                              >
                                <Upload className="h-3.5 w-3.5 text-primary" />
                                <span>Upload New Banner</span>
                              </Button>
                              <p className="text-[11px] text-muted-foreground">
                                Recommended 16:9 ratio (PNG, JPG, or WebP). Automatically compressed.
                              </p>
                              <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                className="hidden"
                                accept="image/png, image/jpeg, image/webp"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 2: Location & Contact */}
                  <TabsContent value="location" className="mt-4 space-y-4">
                    <Card className="rounded-3xl border-border/70 shadow-xs bg-card/90 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" /> Location & Contact Info
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Where customers and delivery partners can reach you.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="contact" className="text-xs font-bold">Contact Mobile Number *</Label>
                          <div className="flex items-center border border-border/80 rounded-xl px-3 bg-background h-10 shadow-2xs">
                            <span className="text-xs font-bold text-muted-foreground mr-2">+91</span>
                            <div className="h-4 w-px bg-border mr-2" />
                            <Input
                              id="contact"
                              type="tel"
                              placeholder="9876543210"
                              value={contact}
                              onChange={(e) => setContact(e.target.value.replace(/[^0-9]/g, ''))}
                              maxLength={10}
                              required
                              className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1 px-0 h-9 text-xs font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="address" className="text-xs font-bold">Full Address *</Label>
                          <Input
                            id="address"
                            placeholder="e.g., Shop 4, Near Gandhi Statue, Main Road, Kolhapur"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            required
                            className="rounded-xl h-10 text-xs"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="googleMapsUrl" className="text-xs font-bold">Google Maps Directions URL</Label>
                          <Input
                            id="googleMapsUrl"
                            placeholder="https://maps.app.goo.gl/..."
                            value={googleMapsUrl}
                            onChange={(e) => setGoogleMapsUrl(e.target.value)}
                            className="rounded-xl h-10 text-xs"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Customers can tap &quot;Directions&quot; on your storefront to navigate directly to your location.
                          </p>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                          <Label htmlFor="workingHours" className="text-xs font-bold">Operating Hours</Label>
                          <Textarea
                            id="workingHours"
                            placeholder="e.g., Daily: 9:00 AM - 10:00 PM (Lunch: 1:00 PM - 3:30 PM)"
                            value={workingHours}
                            onChange={(e) => setWorkingHours(e.target.value)}
                            rows={2}
                            className="rounded-xl text-xs"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 3: Fulfillment & Ordering Ops */}
                  <TabsContent value="fulfillment" className="mt-4 space-y-4">
                    <Card className="rounded-3xl border-border/70 shadow-xs bg-card/90 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Bike className="h-4 w-4 text-primary" /> Fulfillment & Ordering Settings
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Configure delivery radius, UPI payment destination, and dine-in features.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <Label htmlFor="upiId" className="text-xs font-bold">UPI ID (For Customer QR Payments)</Label>
                            <Input
                              id="upiId"
                              placeholder="your-id@okhdfcbank"
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                              className="rounded-xl h-10 text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="telegramChatId" className="text-xs font-bold">Telegram Chat ID (Instant Alerts)</Label>
                            <Input
                              id="telegramChatId"
                              placeholder="e.g., -100123456789"
                              value={telegramChatId}
                              onChange={(e) => setTelegramChatId(e.target.value)}
                              className="rounded-xl h-10 text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Find via @userinfobot on Telegram to receive live order dispatch alerts.
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/50">
                          <div className="space-y-1.5">
                            <Label htmlFor="minOrderAmount" className="text-xs font-bold">Minimum Order Amount (₹)</Label>
                            <Input
                              id="minOrderAmount"
                              type="number"
                              placeholder="0"
                              value={minOrderAmount}
                              onChange={(e) => setMinOrderAmount(Number(e.target.value))}
                              className="rounded-xl h-10 text-xs"
                              required
                            />
                          </div>

                          <div className="space-y-1.5">
                            <Label htmlFor="freeDeliveryDistanceKm" className="text-xs font-bold">Free Delivery Radius (km)</Label>
                            <Input
                              id="freeDeliveryDistanceKm"
                              type="number"
                              step="0.1"
                              min="0"
                              max="50"
                              placeholder="0"
                              value={freeDeliveryDistanceKm || ''}
                              onChange={(e) => setFreeDeliveryDistanceKm(Number(e.target.value))}
                              className="rounded-xl h-10 text-xs"
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Orders within this distance receive ₹0 delivery fee.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-border/50">
                          <Label className="text-xs font-bold">Supported Delivery Modes</Label>
                          <RadioGroup value={deliveryType} onValueChange={(v) => setDeliveryType(v as DeliveryType)} className="flex flex-wrap gap-4 pt-1">
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-xl border border-border/60">
                              <RadioGroupItem value="All" id="all-delivery" />
                              <Label htmlFor="all-delivery" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                                <Bike className="h-3.5 w-3.5 text-primary" /> Delivery + Self-Pickup
                              </Label>
                            </div>
                            <div className="flex items-center gap-2 bg-muted/50 px-3 py-2 rounded-xl border border-border/60">
                              <RadioGroupItem value="Self Pickup Only" id="self-pickup" />
                              <Label htmlFor="self-pickup" className="text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
                                <Home className="h-3.5 w-3.5 text-primary" /> Self-Pickup Only
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-border/50">
                          <Label htmlFor="dineInTables" className="text-xs font-bold">Dine-in Tables Count (Optional)</Label>
                          <Input
                            id="dineInTables"
                            type="number"
                            placeholder="e.g., 8"
                            value={dineInTables}
                            onChange={(e) => setDineInTables(Number(e.target.value))}
                            className="rounded-xl h-10 text-xs max-w-xs"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Enables customer QR ordering for on-premise tables if set &gt; 0.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Tab 4: Account, Security & Alerts */}
                  <TabsContent value="security" className="mt-4 space-y-4">
                    <Card className="rounded-3xl border-border/70 shadow-xs bg-card/90 backdrop-blur-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <KeyRound className="h-4 w-4 text-primary" /> Account & Security
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Manage login access and email marketing communication.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                          <Label htmlFor="commission" className="text-xs font-bold flex items-center gap-1.5">
                            <BadgePercent className="h-3.5 w-3.5 text-primary" /> Commission Tier
                          </Label>
                          <Input
                            id="commission"
                            value={
                              vendor?.isCommissionOn
                                ? `${vendor?.commissionPercentage ?? 0}% Commission (Managed by Superadmin)`
                                : 'Disabled / Subscription Mode (Managed by Superadmin)'
                            }
                            readOnly
                            className="rounded-xl h-10 text-xs bg-muted/50 cursor-not-allowed font-medium text-muted-foreground"
                          />
                        </div>

                        <div className="rounded-2xl border border-border/60 p-4 bg-muted/20 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-xs font-bold">Email Marketing & Offers</Label>
                              <p className="text-[11px] text-muted-foreground">
                                Receive promotional campaigns, growth tips, and special merchant offers.
                              </p>
                            </div>
                            <Checkbox
                              checked={emailPreferences.campaigns}
                              onCheckedChange={(checked) => setEmailPreferences(prev => ({ ...prev, campaigns: !!checked }))}
                            />
                          </div>
                          {!emailPreferences.campaigns && (
                            <div className="text-[11px] text-destructive flex items-center gap-1.5 pt-2 border-t border-destructive/20 font-medium">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>You might miss out on important product updates and promotional perks!</span>
                            </div>
                          )}
                        </div>

                        {vendor?.isAccountLinkingEnabled && (
                          <div className="rounded-2xl border border-border/60 p-4 space-y-3">
                            <Label className="text-xs font-bold">Primary Google Login Account</Label>
                            <Input value={vendor?.email || 'Not set'} disabled className="rounded-xl h-10 text-xs bg-muted/50" />
                            <Button
                              type="button"
                              onClick={handleLinkAccount}
                              disabled={isLinking}
                              variant="outline"
                              className="w-full rounded-full text-xs font-bold gap-2 h-10"
                            >
                              {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
                              <span>{isLinking ? 'Processing...' : 'Link New Google Account'}</span>
                            </Button>
                            <p className="text-[11px] text-muted-foreground text-center">
                              Changes the Google account linked with this restaurant dashboard.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Terms Agreement Pill Checkbox */}
                <div className="rounded-2xl border border-border/60 p-4 bg-card/60 flex items-start gap-3 shadow-2xs">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    className="mt-0.5"
                  />
                  <div className="text-xs leading-relaxed text-muted-foreground">
                    <label htmlFor="terms" className="font-semibold text-foreground cursor-pointer mr-1">
                      I accept the terms and conditions.
                    </label>
                    You agree to our{' '}
                    <Button
                      type="button"
                      variant="link"
                      className="p-0 h-auto text-xs font-bold text-primary inline"
                      onClick={() => setIsTermsDialogOpen(true)}
                    >
                      Terms of Service and Privacy Policy
                    </Button>
                    .
                  </div>
                </div>
              </div>

              {/* Right Side: Live Customer View Preview Card */}
              <div className="lg:col-span-4 space-y-4">
                <div className="sticky top-20 space-y-4">
                  <Card className="rounded-3xl border border-border/70 bg-card/95 backdrop-blur-md shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-border/60 bg-muted/30">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Rocket className="h-3.5 w-3.5 text-primary" /> Live Customer View Preview
                      </h3>
                    </div>

                    {/* Preview Hero Card */}
                    <div className="relative h-20 w-full bg-gradient-to-r from-primary/25 via-primary/10 to-amber-500/15">
                      <div className="absolute -bottom-6 left-4">
                        <div className="relative w-14 h-14 rounded-2xl overflow-hidden border-2 border-card shadow-md bg-card">
                          <Image
                            src={shopImage || 'https://placehold.co/120x120.png'}
                            alt={shopName || 'Vendor'}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="px-4 pt-8 pb-4 space-y-2.5">
                      <div>
                        <h4 className="font-headline font-extrabold text-base text-foreground truncate">
                          {shopName || 'Your Restaurant Name'}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {tagline || 'Fresh Food & Gourmet Delights'}
                        </p>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Open Now • Taking Orders</span>
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                        {workingHours && (
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Clock className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{workingHours}</span>
                          </div>
                        )}
                        {address && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3 w-3 text-primary shrink-0" />
                            <span className="truncate">{address}</span>
                          </div>
                        )}
                        {contact && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="h-3 w-3 text-primary shrink-0" />
                            <span>+91 {contact}</span>
                          </div>
                        )}
                      </div>

                      {minOrderAmount > 0 && (
                        <div className="bg-primary/10 rounded-xl px-3 py-1 text-[11px] font-bold text-primary flex items-center justify-between">
                          <span>Min. Order</span>
                          <span>₹{minOrderAmount}</span>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Quick Bottom Action Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full rounded-2xl font-bold text-xs shadow-md gap-2"
                    disabled={isSaveDisabled}
                  >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
                    <span>Save Shop Details</span>
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
      <TermsDialog isOpen={isTermsDialogOpen} onOpenChange={setIsTermsDialogOpen} />
    </>
  );
}

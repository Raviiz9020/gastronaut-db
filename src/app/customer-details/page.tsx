
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { User, Utensils, Mail, Loader2, Phone, ShieldCheck, AlertCircle, Navigation } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useCustomer } from '@/context/customer-context';
import { useLocation } from '@/context/location-context';
import Link from 'next/link';
import type { EmailPreferences } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { cn } from '@/lib/utils';


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

const parseAddress = (address: string | undefined | null) => {
  const result = {
    houseFlatNo: '',
    buildingSocietyName: '',
    floorNo: '',
    areaLocality: '',
    landmark: ''
  };

  if (!address) return result;

  const trimmedAddress = address.trim();
  const dotIndex = trimmedAddress.indexOf('.');

  if (dotIndex !== -1) {
    const leftPart = trimmedAddress.substring(0, dotIndex).trim();
    const rightPart = trimmedAddress.substring(dotIndex + 1).trim();

    // Parse left part: "houseFlatNo, buildingSocietyName"
    const commaIndex = leftPart.indexOf(',');
    if (commaIndex !== -1) {
      result.houseFlatNo = leftPart.substring(0, commaIndex).trim();
      result.buildingSocietyName = leftPart.substring(commaIndex + 1).trim();
    } else {
      result.buildingSocietyName = leftPart;
    }

    // Parse right part: "[Floor X, ] areaLocality [, landmark]"
    let rest = rightPart;
    if (rest.startsWith('Floor ')) {
      const firstComma = rest.indexOf(',');
      if (firstComma !== -1) {
        result.floorNo = rest.substring(6, firstComma).trim();
        rest = rest.substring(firstComma + 1).trim();
      } else {
        result.floorNo = rest.substring(6).trim();
        rest = '';
      }
    }

    if (rest) {
      const lastComma = rest.lastIndexOf(',');
      if (lastComma !== -1) {
        result.areaLocality = rest.substring(0, lastComma).trim();
        result.landmark = rest.substring(lastComma + 1).trim();
      } else {
        result.areaLocality = rest;
      }
    }
  } else {
    // Legacy parsing fallback
    const parts = trimmedAddress.split(/\s+/);
    if (parts.length === 3) {
      // Legacy LR format: "Sector Building FlatNo" (e.g., "R2 B 1802")
      result.houseFlatNo = parts[2];
      result.buildingSocietyName = parts[1];
      result.areaLocality = `Life Republic ${parts[0]}`;
    } else {
      // Fallback
      result.buildingSocietyName = trimmedAddress;
      result.areaLocality = 'Life Republic';
    }
  }

  return result;
};

const formatAddress = (values: {
  houseFlatNo: string;
  buildingSocietyName: string;
  floorNo?: string;
  areaLocality: string;
  landmark?: string;
}) => {
  const floorPart = values.floorNo?.trim() ? `Floor ${values.floorNo.trim()}, ` : '';
  const landmarkPart = values.landmark?.trim() ? `, ${values.landmark.trim()}` : '';
  return `${values.houseFlatNo.trim()}, ${values.buildingSocietyName.trim()}. ${floorPart}${values.areaLocality.trim()}${landmarkPart}`;
};

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  contact: z.string().length(10, { message: "Please enter a valid 10-digit number." }),
  houseFlatNo: z.string().min(1, { message: "House / Flat Number is required." }).refine(val => val.trim().length > 0, { message: "House / Flat Number is required." }),
  buildingSocietyName: z.string().min(1, { message: "Building / Society Name is required." }).refine(val => val.trim().length > 0, { message: "Building / Society Name is required." }),
  floorNo: z.string().optional(),
  areaLocality: z.string().min(1, { message: "Area / Locality is required." }).refine(val => val.trim().length > 0, { message: "Area / Locality is required." }),
  landmark: z.string().optional(),
  termsAccepted: z.boolean().refine(val => val === true, { message: "You must accept the terms and conditions." }),
  emailPreferences: z.object({
      campaigns: z.boolean(),
  }),
  latitude: z.number({ required_error: "Please select your current location.", invalid_type_error: "Please select your current location." }),
  longitude: z.number({ required_error: "Please select your current location.", invalid_type_error: "Please select your current location." }),
});


export default function CustomerDetailsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { customer, updateDetails, loginWithGoogle } = useCustomer();
    const { userLocation, detectLocation, isLoading: isLocating, error: locationError } = useLocation();
    const [isTermsDialogOpen, setIsTermsDialogOpen] = useState(false);
    const [isLoading, startTransition] = useTransition();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            contact: '',
            houseFlatNo: '',
            buildingSocietyName: '',
            floorNo: '',
            areaLocality: '',
            landmark: '',
            termsAccepted: false,
            emailPreferences: {
                campaigns: true,
            },
            latitude: undefined,
            longitude: undefined,
        }
    });
    
    const campaignsEnabled = form.watch('emailPreferences.campaigns');

    useEffect(() => {
        if (!customer) {
            router.replace('/customer-login');
            return;
        }

        const parsed = parseAddress(customer.address);

        form.reset({
            name: customer.name || '',
            contact: (customer.contact || '').replace('+91', ''),
            houseFlatNo: parsed.houseFlatNo,
            buildingSocietyName: parsed.buildingSocietyName,
            floorNo: parsed.floorNo,
            areaLocality: parsed.areaLocality,
            landmark: parsed.landmark,
            termsAccepted: customer.termsAccepted || false,
            emailPreferences: {
                campaigns: customer.emailPreferences?.campaigns ?? true,
            },
            latitude: (customer.latitude !== undefined && customer.latitude !== null) ? customer.latitude : undefined,
            longitude: (customer.longitude !== undefined && customer.longitude !== null) ? customer.longitude : undefined,
        });

    }, [customer, router, form]);

    useEffect(() => {
        if (userLocation?.latitude && userLocation?.longitude) {
            form.setValue('latitude', userLocation.latitude, { shouldValidate: true });
            form.setValue('longitude', userLocation.longitude, { shouldValidate: true });
            toast({
                title: "Location Captured Successfully",
                description: `Lat: ${userLocation.latitude.toFixed(6)}, Lng: ${userLocation.longitude.toFixed(6)}`,
            });
        }
    }, [userLocation, form, toast]);

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        startTransition(async () => {
            const finalAddress = formatAddress({
                houseFlatNo: values.houseFlatNo.trim(),
                buildingSocietyName: values.buildingSocietyName.trim(),
                floorNo: values.floorNo?.trim() || '',
                areaLocality: values.areaLocality.trim(),
                landmark: values.landmark?.trim() || ''
            });

            try {
                const contactChanged = values.contact !== (customer?.contact || '').replace('+91', '');
                
                await updateDetails({ 
                    name: values.name.trim(), 
                    contact: values.contact.trim(), 
                    address: finalAddress, 
                    termsAccepted: values.termsAccepted,
                    emailPreferences: values.emailPreferences,
                    latitude: values.latitude,
                    longitude: values.longitude,
                });
                
                toast({ title: "Details Saved!", description: "Your information has been updated." });

                // Skip phone verification redirect for demo customers
                if (!customer?.isDemoCustomer && values.contact && (contactChanged || !customer?.phoneVerified)) {
                    router.push('/verify-phone');
                } else {
                    router.push('/menu');
                }
            } catch (error: any) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
            }
        });
    }
    
    const handleLinkGoogle = async () => {
        try {
            await loginWithGoogle();
        } catch(error) {
            // Error toast is handled in the context
        }
    }

    const isSaveDisabled = isLoading;

  return (
    <>
    <div className="flex flex-col flex-1 items-center justify-center p-4">
      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
      >
        {customer && !customer.email && (
             <Alert variant="destructive" className="mb-6">
                <Mail className="h-4 w-4" />
                <AlertTitle>Email Address Recommended</AlertTitle>
                <AlertDescription>
                   For better account security and notifications, please link a Google account to add an email address.
                    <Button onClick={handleLinkGoogle} size="sm" className="mt-2 ml-auto flex gap-2">
                        <GoogleIcon /> Link Google Account
                    </Button>
                </AlertDescription>
            </Alert>
        )}
        {customer && customer.contact && !customer.phoneVerified && !customer.isDemoCustomer && (
            <Alert className="mb-6">
                <Phone className="h-4 w-4 text-primary" />
                <AlertTitle>Action Required</AlertTitle>
                <AlertDescription>
                   Please verify your phone number to continue. You will be redirected after saving your details.
                </AlertDescription>
            </Alert>
        )}

      <Card className="w-full bg-card/80 backdrop-blur-sm border-purple-500/20 box-glow-accent rounded-3xl">
          <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardHeader>
          <div className="flex items-center justify-center gap-3 mb-2">
              <User className="h-8 w-8 text-purple-500"/>
              <CardTitle className="font-headline text-4xl text-center text-purple-500">Your Details</CardTitle>
          </div>
          <CardDescription className="text-center">Please provide your contact and delivery information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="e.g. John Doe" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
            )}/>
            <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl><Input type="email" value={customer?.email || 'Not available'} readOnly className="bg-muted/50 cursor-not-allowed" /></FormControl>
            </FormItem>
             <FormField control={form.control} name="contact" render={({ field }) => (
                <FormItem>
                    <FormLabel>Contact Number (10 digits)</FormLabel>
                    <FormControl>
                        <div className="flex items-center border rounded-full px-3">
                             <Phone className="h-5 w-5 text-muted-foreground"/>
                             <span className="pl-2 pr-1 text-sm">+91</span>
                            <Input {...field} type="tel" maxLength={10} className="border-none focus-visible:ring-0 focus-visible:ring-offset-0"/>
                            <ShieldCheck className={cn("h-5 w-5 ml-2", (customer?.phoneVerified || customer?.isDemoCustomer) ? "text-green-500" : "text-muted-foreground")} />
                        </div>
                    </FormControl>
                    {!customer?.isDemoCustomer && <FormDescription>You will need to verify this number via OTP after saving.</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}/>
            {/* Delivery Address Section */}
            <div className="space-y-4 pt-2">
                <FormLabel className="text-base font-semibold">Delivery Address</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="houseFlatNo" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">House / Flat Number <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input placeholder="e.g. 1801" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="buildingSocietyName" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Building / Society Name <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input placeholder="e.g. Building A" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="floorNo" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Floor Number <span className="text-muted-foreground/60">(Optional)</span></FormLabel>
                            <FormControl><Input placeholder="e.g. 18" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="areaLocality" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">Area / Locality <span className="text-destructive">*</span></FormLabel>
                            <FormControl><Input placeholder="e.g. Life Republic R1" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="landmark" render={({ field }) => (
                        <FormItem className="sm:col-span-2">
                            <FormLabel className="text-xs text-muted-foreground">Landmark <span className="text-muted-foreground/60">(Optional)</span></FormLabel>
                            <FormControl><Input placeholder="e.g. Near Jambe Bus Stop" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </div>
            </div>

            {/* Current Location Section */}
            <div className="space-y-3 pt-2 border-t border-primary/10">
                <div className="flex items-center justify-between">
                    <div>
                        <FormLabel className="text-base font-semibold">Current Location <span className="text-destructive">*</span></FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">Required for vendor discovery near you.</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-2 rounded-xl border-purple-500/50 text-purple-500 hover:bg-purple-500/10"
                        onClick={() => detectLocation()}
                        disabled={isLocating}
                    >
                        {isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
                        {isLocating ? 'Detecting...' : 'Select Current Location'}
                    </Button>
                </div>

                {/* Location status feedback */}
                {form.watch('latitude') && form.watch('longitude') ? (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3"
                    >
                        <ShieldCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">Location captured</p>
                            <p className="text-xs text-muted-foreground">
                                Lat: {form.watch('latitude')?.toFixed(6)}, Lng: {form.watch('longitude')?.toFixed(6)}
                            </p>
                        </div>
                    </motion.div>
                ) : locationError ? (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 rounded-xl bg-destructive/10 border border-destructive/30 px-4 py-3"
                    >
                        <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        <div>
                            <p className="text-sm font-medium text-destructive">
                                {locationError === 'User denied Geolocation'
                                    ? 'Location permission denied. Please enable it in your browser settings.'
                                    : locationError}
                            </p>
                        </div>
                    </motion.div>
                ) : (
                    <p className="text-xs text-muted-foreground px-1">Click "Select Current Location" to detect your GPS coordinates. This is mandatory to proceed.</p>
                )}
                {/* Show Zod validation error for latitude if not captured */}
                {form.formState.errors.latitude && (
                    <p className="text-sm text-destructive font-medium">{form.formState.errors.latitude.message}</p>
                )}
            </div>

              <div className="space-y-2 pt-4 border-t border-primary/10">
                <FormField
                    control={form.control}
                    name="emailPreferences.campaigns"
                    render={({ field }) => (
                        <FormItem className="flex flex-col space-y-3 rounded-2xl border p-4 shadow-sm">
                            <div className="flex flex-row items-center justify-between">
                                <div className="space-y-0.5">
                                    <FormLabel>Email Preferences</FormLabel>
                                    <FormDescription>
                                        Receive marketing campaigns and special offers via email.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </div>
                            {!campaignsEnabled && (
                                <motion.div
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-xs text-destructive flex items-center gap-2 pt-2 border-t border-destructive/20"
                                >
                                    <AlertCircle className="h-4 w-4"/>
                                    You might miss out on important offers and updates!
                                </motion.div>
                            )}
                        </FormItem>
                    )}
                />
              </div>

             <FormField control={form.control} name="termsAccepted" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 pt-4">
                     <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="grid gap-1.5 leading-none">
                        <FormLabel>Accept terms and conditions</FormLabel>
                        <FormDescription>
                            You agree to our{' '}
                            <Button type="button" variant="link" className="p-0 h-auto text-sm" onClick={() => setIsTermsDialogOpen(true)}>
                                Terms and Policies
                            </Button>
                            .
                        </FormDescription>
                        <FormMessage />
                    </div>
                </FormItem>
            )}/>
        </CardContent>
        <CardFooter className="flex-col gap-4">
          <Button type="submit" size="lg" className="w-full text-lg border-neutral-700" variant="outline" disabled={isSaveDisabled}>
              {isLoading ? <Loader2 className="animate-spin" /> : 'Save and Continue'}
          </Button>
          {/* Only show Back to Menu if profile is already complete (editing, not onboarding) */}
          {customer?.latitude && customer?.longitude && customer?.termsAccepted && customer?.address && (
            <Link href="/menu" passHref className="w-full">
              <Button variant="outline" size="lg" className="w-full text-lg border-neutral-700" type="button">
                  <Utensils className="mr-2 h-5 w-5"/>
                  Back to Menu
              </Button>
            </Link>
          )}
        </CardFooter>
        </form>
        </Form>
      </Card>
      </motion.div>
    </div>
    <TermsDialog isOpen={isTermsDialogOpen} onOpenChange={setIsTermsDialogOpen} />
    </>
  );
}

'use client';
import { useEffect, useState } from "react";
import { sendOtp, clearRecaptcha } from "@/services/otpService";
import { auth, db } from "@/lib/firebase";
import { updateDoc, doc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, KeyRound, Loader2, Rocket, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import type { ConfirmationResult } from "firebase/auth";
import { useCustomer } from "@/context/customer-context";
import Link from "next/link";
import { PhoneAuthProvider, updatePhoneNumber } from "firebase/auth";
import { motion } from 'framer-motion';
import { cn } from "@/lib/utils";

export default function VerifyPhonePage() {
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const { customer, isAuthLoading } = useCustomer();
  const [phone, setPhone] = useState<string>('');

  useEffect(() => {
      if (!isAuthLoading && customer) {
          if (customer.isDemoCustomer) {
              router.replace('/menu');
              return;
          }
          setPhone(customer.contact || "");
      }
  }, [customer, isAuthLoading, router]);

  // On mount, ensure the reCAPTCHA container exists. On unmount, clear it.
  useEffect(() => {
    return () => clearRecaptcha();
  }, []);

  const handleSendOtp = async () => {
    if (!phone) {
        toast({ title: "No Phone Number", description: "Customer phone number not found.", variant: "destructive"});
        setIsLoading(false);
        return;
    };
    setIsLoading(true);
    try {
      const result = await sendOtp(phone);
      setConfirmation(result);
      toast({ title: "OTP Sent!", description: "Check your phone for the verification code."});
    } catch (err: any) {
      console.error("OTP error:", err);
      if (err.code === "auth/too-many-requests") {
        toast({ title: "Too Many Attempts", description: "Please wait a while before trying again.", variant: "destructive"});
      } else {
         toast({ title: "Error", description: err.message, variant: "destructive"});
      }
    } finally {
        setIsLoading(false);
    }
  };
  
  // Automatically send OTP when the page loads with a valid phone number
  useEffect(() => {
    if(phone && !customer?.isDemoCustomer) {
        handleSendOtp();
    }
  }, [phone, customer]);


  const handleVerifyOtp = async () => {
    if (!confirmation) {
        toast({ title: "Error", description: "Please send an OTP first.", variant: "destructive"});
        return;
    }
    if (otp.length !== 6) {
        toast({ title: "Invalid Code", description: "OTP must be 6 digits.", variant: "destructive"});
        return;
    }

    setIsLoading(true);
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("User is not authenticated.");

        const userCred = await confirmation.confirm(otp);
        const verifiedPhone = userCred.user.phoneNumber;

        const hasExistingPhone = user.providerData.some(p => p.providerId === 'phone');
        
        if (hasExistingPhone && user.phoneNumber !== verifiedPhone) {
            const credential = PhoneAuthProvider.credential(confirmation.verificationId, otp);
            await updatePhoneNumber(user, credential);
        }
        
        await updateDoc(doc(db, "customers", user.uid), {
            contact: verifiedPhone,
            phoneVerified: true,
        });
      
        clearRecaptcha();

        toast({ title: "Phone Verified!", description: "You can now proceed to place orders."});
        router.push('/menu');

    } catch (err: any) {
      console.error("Verification failed:", err);
      if (err.code === "auth/invalid-verification-code") {
        toast({ title: "Invalid Code", description: "The code you entered is incorrect. Please try again.", variant: "destructive"});
      } else {
         toast({ title: "Verification Failed", description: "Could not verify the code. You may have entered the wrong number.", variant: "destructive"});
      }
    } finally {
        setIsLoading(false);
    }
  };

  if (isAuthLoading || customer?.isDemoCustomer) {
      return (
           <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
               <Loader2 className="h-8 w-8 animate-spin" />
           </main>
      )
  }

  return (
    <main className="flex-1 container mx-auto px-4 py-12 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <Card className="w-full max-w-md bg-card/80 backdrop-blur-sm border-purple-500/20 box-glow-accent rounded-3xl">
            <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-3 mb-2">
                    <ShieldCheck className="h-8 w-8 text-purple-500"/>
                    <CardTitle className="font-headline text-4xl text-center text-purple-500">Verify Your Phone</CardTitle>
                </div>
                <CardDescription>
                    Dear {customer?.name}, please verify the mobile number below to complete your profile.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <div className="flex items-center justify-center text-lg font-semibold border rounded-full px-3 py-2 bg-muted/50">
                        <Phone className="h-5 w-5 text-muted-foreground mr-3"/>
                        <span>{phone || "Loading number..."}</span>
                    </div>
                </div>

                <div className="space-y-2">
                     <div className="flex items-center border rounded-full px-3">
                        <KeyRound className="h-5 w-5 text-muted-foreground"/>
                        <Input
                            placeholder="Enter 6-digit OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            className="border-none focus-visible:ring-0 focus-visible:ring-offset-0 tracking-widest text-center"
                            maxLength={6}
                        />
                    </div>
                    <Button onClick={handleVerifyOtp} disabled={isLoading || !otp} className="w-full">
                        {isLoading ? <Loader2 className="animate-spin"/> : 'Verify & Continue'}
                    </Button>
                </div>
            </CardContent>
            <CardFooter className="justify-center">
                 <Button asChild variant="link" className="text-sm text-muted-foreground">
                    <Link href="/customer-details">Entered the wrong number?</Link>
                 </Button>
            </CardFooter>
        </Card>
      </motion.div>
    </main>
  );
}

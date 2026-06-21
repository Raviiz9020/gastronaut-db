'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useTransition, Suspense, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, MailX, CheckCircle } from 'lucide-react'; // ✅ Replaced MailOff with MailX
import { motion } from 'framer-motion';
import Link from 'next/link';
import ConfirmationDialog from '@/components/confirmation-dialog';

// ✅ Safe client-side wrapper to call Genkit flow via API
const handleUnsubscribe = async ({ email }: { email: string }) => {
  const response = await fetch("/api/handle-unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({ message: "An unknown error occurred." }));
    throw new Error(errorBody.message);
  }
  return await response.json();
};

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'initial' | 'loading' | 'success' | 'error'>('initial');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!email) {
      setStatus('error');
    }
  }, [email]);

  const onUnsubscribe = () => {
    if (!email) return;
    startTransition(async () => {
      setStatus('loading');
      try {
        const result = await handleUnsubscribe({ email });
        if (result.success) {
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (e) {
        console.error("Error unsubscribing:", e);
        setStatus('error');
      }
    });
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;

      case 'success':
        return (
          <>
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-green-600 text-lg mt-4">You have successfully unsubscribed.</p>
            <p className="text-muted-foreground text-sm">
              You will no longer receive marketing emails from us.
            </p>
          </>
        );

      case 'error':
        return (
          <>
            <MailX className="h-12 w-12 text-destructive" /> {/* ✅ Fixed icon */}
            <p className="text-destructive text-lg mt-4">An error occurred.</p>
            <p className="text-muted-foreground text-sm">
              We couldn't process your unsubscribe request. Please try again later.
            </p>
          </>
        );

      case 'initial':
      default:
        return (
          <>
            <MailX className="h-12 w-12 text-primary" /> {/* ✅ Fixed icon */}
            <p className="text-lg mt-4">
              You are about to unsubscribe <strong className="break-all">{email}</strong>.
            </p>
            <p className="text-muted-foreground text-sm">Do you wish to continue?</p>
          </>
        );
    }
  };

  return (
    <>
      <div className="flex flex-col flex-1 items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="w-full bg-card/80 backdrop-blur-sm border-primary/20 box-glow-primary rounded-3xl">
            <CardHeader className="text-center">
              <CardTitle className="font-headline text-3xl text-primary">Unsubscribe</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center text-center space-y-2 min-h-[150px]">
              {renderContent()}
            </CardContent>
            <CardFooter className="flex-col gap-2">
              {status === 'initial' && (
                <Button
                  onClick={() => setIsConfirmDialogOpen(true)}
                  disabled={isPending}
                  className="w-full"
                >
                  {isPending ? <Loader2 className="animate-spin" /> : "Confirm Unsubscribe"}
                </Button>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/menu">Back to Menu</Link>
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      </div>

      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
        onConfirm={onUnsubscribe}
        title="We're sad to see you go..."
        description="You will miss out on HyperDelivery offers and communications. 
        In case you change your mind, you can always subscribe again by logging in, 
        going to 'My Details', and turning on email communication."
      />
    </>
  );
}

export default function UnsubscribeClient() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
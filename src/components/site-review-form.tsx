'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import StarRating from './star-rating';
import { useCustomer } from '@/context/customer-context';
import { useSiteReview } from '@/context/site-review-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import Link from 'next/link';

const formSchema = z.object({
  rating: z.number().min(1, { message: 'Please select a rating.' }),
  text: z.string().min(10, { message: 'Review must be at least 10 characters.' }).max(500, { message: 'Review must be less than 500 characters.' }),
});

export default function SiteReviewForm() {
  const { customer } = useCustomer();
  const { addReview } = useSiteReview();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rating: 0,
      text: '',
    },
  });
  
  const { setValue, trigger, formState: { errors } } = form;

  const handleRating = (rating: number) => {
    setValue('rating', rating, { shouldValidate: true });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!customer) return;
    setIsSubmitting(true);
    await addReview({
      ...values,
      customerUsername: customer.username,
      authorName: customer.name,
    });
    form.reset();
    setIsSubmitting(false);
  };

  if (!customer) {
    return (
        <div className="text-center text-sm text-muted-foreground p-4 bg-muted/30 rounded-2xl border-dashed border">
             Want to leave a review?{' '}
            <Link href="/customer-login" className="font-semibold text-primary hover:underline">
                Login or Sign Up
            </Link>
            {' '}to share your feedback.
        </div>
    );
  }

  if (customer?.isDemoCustomer) {
    return (
        <div className="text-center text-sm text-muted-foreground p-4 bg-muted/30 rounded-2xl border-dashed border">
             Site review submission is disabled in Demo Mode.
        </div>
    );
  }

  return (
    <Card className="bg-card/80 rounded-3xl">
      <CardHeader>
        <CardTitle className="text-xl">Leave a Review</CardTitle>
        <CardDescription className="text-xs">Share your experience with other customers!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col items-center gap-2">
                <FormLabel>Your Rating</FormLabel>
                <StarRating rating={form.watch('rating')} onRate={handleRating} starSize="h-6 w-6" />
                 {errors.rating && <p className="text-sm font-medium text-destructive">{errors.rating.message}</p>}
            </div>
            <FormField
              control={form.control}
              name="text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Review</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell us about your experience..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

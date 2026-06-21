'use server';
import { z } from 'zod';
import { getAdminDb } from '@/lib/firebaseAdmin';

const UnsubscribeInputSchema = z.object({
  email: z.string().email(),
});

export type UnsubscribeInput = z.infer<typeof UnsubscribeInputSchema>;

export async function handleUnsubscribe(input: UnsubscribeInput) {
  const { email } = input;
  if (!email) {
    return { success: false, message: 'No email address provided.' };
  }

  try {
    const db = getAdminDb();
    const batch = db.batch();
    let userFound = false;

    // Query vendors
    const vendorQuery = db.collection('vendors').where('email', '==', email);
    const vendorSnapshot = await vendorQuery.get();
    vendorSnapshot.forEach(doc => {
      userFound = true;
      batch.update(doc.ref, { 'emailPreferences.campaigns': false });
    });

    // Query customers
    const customerQuery = db.collection('customers').where('email', '==', email);
    const customerSnapshot = await customerQuery.get();
    customerSnapshot.forEach(doc => {
      userFound = true;
      batch.update(doc.ref, { 'emailPreferences.campaigns': false });
    });

    if (!userFound) {
      return { success: false, message: 'Email address not found in our records.' };
    }

    await batch.commit();
    return { success: true, message: 'Successfully unsubscribed.' };
  } catch (error) {
    console.error('Error during unsubscribe:', error);
    return { success: false, message: 'An internal error occurred. Please try again later.' };
  }
}

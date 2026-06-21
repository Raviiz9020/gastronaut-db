
'use server';
/**
 * @fileOverview A flow to handle sending a password reset OTP.
 * This is a demo implementation and does not actually send an SMS.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

const SendOtpInputSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  userType: z.enum(['customer', 'vendor']),
});
export type SendOtpInput = z.infer<typeof SendOtpInputSchema>;

const SendOtpOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  otpForDemo: z.string().optional().describe('The raw OTP, for demo purposes only.'),
});
export type SendOtpOutput = z.infer<typeof SendOtpOutputSchema>;

export async function sendOtp(input: SendOtpInput): Promise<SendOtpOutput> {
  return sendOtpFlow(input);
}

const sendOtpFlow = ai.defineFlow(
  {
    name: 'sendOtpFlow',
    inputSchema: SendOtpInputSchema,
    outputSchema: SendOtpOutputSchema,
  },
  async ({ username, userType }) => {
    const collectionName = userType === 'customer' ? 'customers' : 'vendors';
    const userRef = doc(db, collectionName, username);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists() || !userSnap.data().contact) {
      return { success: false, message: 'User not found or no contact number on file.' };
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

    // Store OTP hash and expiry in Firestore
    const otpRef = doc(db, 'otpTokens', username);
    await setDoc(otpRef, {
      username,
      userType,
      otpHash,
      expiresAt: expiresAt.toISOString(),
    });
    
    // In a real app, you would integrate with an SMS gateway like Twilio here.
    // For this prototype, we'll just return the OTP for demonstration.
    console.log(`Password reset OTP for ${username} (${userType}): ${otp}`);

    return { 
        success: true, 
        message: 'OTP sent successfully.',
        otpForDemo: otp
    };
  }
);

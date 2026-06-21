
'use server';
/**
 * @fileOverview A flow to verify an OTP and reset the user's password.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import crypto from 'crypto';

const VerifyOtpInputSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  userType: z.enum(['customer', 'vendor']),
  otp: z.string().length(6, 'OTP must be 6 digits.'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpInputSchema>;

const VerifyOtpOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type VerifyOtpOutput = z.infer<typeof VerifyOtpOutputSchema>;

export async function verifyOtpAndResetPassword(input: VerifyOtpInput): Promise<VerifyOtpOutput> {
  return verifyOtpAndResetPasswordFlow(input);
}

const verifyOtpAndResetPasswordFlow = ai.defineFlow(
  {
    name: 'verifyOtpAndResetPasswordFlow',
    inputSchema: VerifyOtpInputSchema,
    outputSchema: VerifyOtpOutputSchema,
  },
  async ({ username, userType, otp, newPassword }) => {
    const otpRef = doc(db, 'otpTokens', username);
    const otpSnap = await getDoc(otpRef);

    if (!otpSnap.exists()) {
      return { success: false, message: 'Invalid or expired OTP. Please try again.' };
    }

    const tokenData = otpSnap.data();
    const expiresAt = new Date(tokenData.expiresAt);

    if (expiresAt < new Date()) {
      await deleteDoc(otpRef);
      return { success: false, message: 'OTP has expired. Please request a new one.' };
    }

    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    if (otpHash !== tokenData.otpHash) {
      return { success: false, message: 'Invalid OTP.' };
    }
    
    // OTP is valid, update the password
    const collectionName = userType === 'customer' ? 'customers' : 'vendors';
    const userRef = doc(db, collectionName, username);
    await updateDoc(userRef, { password: newPassword });

    // Delete the OTP token so it can't be reused
    await deleteDoc(otpRef);

    return { 
        success: true, 
        message: 'Password has been reset successfully.',
    };
  }
);

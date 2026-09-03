'use server';

/**
 * @fileOverview A flow to handle sending a campaign email to different audience types.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Vendor, Customer } from '@/types';
import nodemailer from 'nodemailer';
import { uploadImageToStorage } from '@/lib/client-utils';

const AudienceSchema = z.object({
  type: z.enum(['all-vendors', 'all-customers', 'specific-vendor', 'specific-customer', 'all']),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
  recipientEmail: z.string().optional(),
  recipientName: z.string().optional(),
  recipientsList: z.array(z.object({
    email: z.string(),
    name: z.string().optional(),
  })).optional(),
});

const SendCampaignEmailInputSchema = z.object({
  subject: z.string(),
  body: z.string().describe('The main content of the email, can be plain text or HTML.'),
  imageUrl: z.string().url().optional().or(z.literal('')).describe("Can be a data URI or a public URL."),
  audience: AudienceSchema,
});
export type SendCampaignEmailInput = z.infer<typeof SendCampaignEmailInputSchema>;

const SendCampaignEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  sentCount: z.number(),
});
export type SendCampaignEmailOutput = z.infer<typeof SendCampaignEmailOutputSchema>;

export async function sendCampaignEmail(input: SendCampaignEmailInput): Promise<SendCampaignEmailOutput> {
  return sendCampaignEmailFlow(input);
}

const sendCampaignEmailFlow = ai.defineFlow(
  {
    name: 'sendCampaignEmailFlow',
    inputSchema: SendCampaignEmailInputSchema,
    outputSchema: SendCampaignEmailOutputSchema,
  },
  async ({ subject, body, imageUrl, audience }) => {
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        console.error('Email credentials are not set in environment variables.');
        return { success: false, message: 'Server is not configured to send emails. Check EMAIL_USER and EMAIL_APP_PASSWORD.', sentCount: 0 };
    }

    let publicImageUrl = imageUrl;
    if (imageUrl && imageUrl.startsWith('data:image')) {
      try {
        publicImageUrl = await uploadImageToStorage(imageUrl, `campaign-images/${Date.now()}`);
      } catch (e) {
        console.error('Failed to upload campaign image from data URI:', e);
        return { success: false, message: 'Failed to upload campaign image.', sentCount: 0 };
      }
    }

    let recipients: { email: string; name?: string }[] = [];

    // 1. Direct 1-on-1 recipient passed from client
    if (audience.recipientEmail && audience.recipientEmail.trim() !== '') {
      recipients = [{ email: audience.recipientEmail.trim(), name: audience.recipientName || 'Valued Member' }];
    }
    // 2. Direct recipients list passed from authenticated client session
    else if (audience.recipientsList && audience.recipientsList.length > 0) {
      recipients = audience.recipientsList.filter(r => r.email && r.email.trim() !== '');
    }
    // 3. Fallback: Query Firestore collections
    else {
      try {
        if (audience.type === 'all-vendors') {
            const vendorsRef = collection(db, 'vendors');
            const vendorSnapshot = await getDocs(vendorsRef);
            recipients = vendorSnapshot.docs
              .map(doc => ({ username: doc.id, ...doc.data() } as Vendor))
              .filter(v => v.email && v.email.trim() !== "" && (v.emailPreferences?.campaigns ?? true))
              .map(v => ({ email: v.email!, name: v.shopName || v.name }));
        } 
        
        else if (audience.type === 'all-customers') {
            const customersRef = collection(db, 'customers');
            const customerSnapshot = await getDocs(customersRef);
            recipients = customerSnapshot.docs
              .map(doc => ({ username: doc.id, ...doc.data() } as Customer))
              .filter(c => c.email && c.email.trim() !== "" && (c.emailPreferences?.campaigns ?? true))
              .map(c => ({ email: c.email!, name: c.name }));
        } 
        
        else if (audience.type === 'specific-vendor' && audience.vendorId) {
            let targetVendor: Vendor | null = null;

            try {
                const vendorRef = doc(db, 'vendors', audience.vendorId);
                const docSnap = await getDoc(vendorRef);
                if (docSnap.exists()) {
                    targetVendor = { username: docSnap.id, ...docSnap.data() } as Vendor;
                }
            } catch (e) {
                console.warn("Direct vendor doc fetch failed, checking queries:", e);
            }

            if (!targetVendor) {
                const vendorsRef = collection(db, 'vendors');
                const [byUsername, byShopName, byEmail] = await Promise.all([
                    getDocs(query(vendorsRef, where('username', '==', audience.vendorId))),
                    getDocs(query(vendorsRef, where('shopName', '==', audience.vendorId))),
                    getDocs(query(vendorsRef, where('email', '==', audience.vendorId)))
                ]);

                const foundDoc = byUsername.docs[0] || byShopName.docs[0] || byEmail.docs[0];
                if (foundDoc && foundDoc.exists()) {
                    targetVendor = { username: foundDoc.id, ...foundDoc.data() } as Vendor;
                }
            }

            if (!targetVendor) {
                return { success: false, message: `Store "${audience.vendorId}" was not found in the database.`, sentCount: 0 };
            }

            if (!targetVendor.email || targetVendor.email.trim() === '') {
                return { success: false, message: `Store "${targetVendor.shopName || targetVendor.name || audience.vendorId}" does not have a registered email address.`, sentCount: 0 };
            }

            recipients = [{ email: targetVendor.email, name: targetVendor.shopName || targetVendor.name }];
        } 
        
        else if (audience.type === 'specific-customer' && audience.customerId) {
            let targetCustomer: Customer | null = null;

            try {
                const customerRef = doc(db, 'customers', audience.customerId);
                const docSnap = await getDoc(customerRef);
                if (docSnap.exists()) {
                    targetCustomer = { username: docSnap.id, ...docSnap.data() } as Customer;
                }
            } catch (e) {
                console.warn("Direct customer doc fetch failed, checking queries:", e);
            }

            if (!targetCustomer) {
                const customersRef = collection(db, 'customers');
                const [byUsername, byEmail, byContact] = await Promise.all([
                    getDocs(query(customersRef, where('username', '==', audience.customerId))),
                    getDocs(query(customersRef, where('email', '==', audience.customerId))),
                    getDocs(query(customersRef, where('contact', '==', audience.customerId)))
                ]);

                const foundDoc = byUsername.docs[0] || byEmail.docs[0] || byContact.docs[0];
                if (foundDoc && foundDoc.exists()) {
                    targetCustomer = { username: foundDoc.id, ...foundDoc.data() } as Customer;
                }
            }

            if (!targetCustomer) {
                return { success: false, message: `Customer "${audience.customerId}" was not found in the database.`, sentCount: 0 };
            }

            if (!targetCustomer.email || targetCustomer.email.trim() === '') {
                return { success: false, message: `Customer "${targetCustomer.name || audience.customerId}" does not have a registered email address.`, sentCount: 0 };
            }

            recipients = [{ email: targetCustomer.email, name: targetCustomer.name }];
        }
        
        else if (audience.type === 'all') {
            const vendorsRef = collection(db, 'vendors');
            const customersRef = collection(db, 'customers');
        
            const [vendorSnapshot, customerSnapshot] = await Promise.all([
                getDocs(vendorsRef),
                getDocs(customersRef),
            ]);
        
            const vendorRecipients = vendorSnapshot.docs
              .map(doc => ({ username: doc.id, ...doc.data() } as Vendor))
              .filter(v => v.email && v.email.trim() !== "" && (v.emailPreferences?.campaigns ?? true))
              .map(v => ({ email: v.email!, name: v.shopName || v.name }));
        
            const customerRecipients = customerSnapshot.docs
              .map(doc => ({ username: doc.id, ...doc.data() } as Customer))
              .filter(c => c.email && c.email.trim() !== "" && (c.emailPreferences?.campaigns ?? true))
              .map(c => ({ email: c.email!, name: c.name }));
        
            const allRecipients = [...vendorRecipients, ...customerRecipients];
            
            // Ensure unique emails
            const uniqueEmails = new Set<string>();
            recipients = allRecipients.filter(r => {
                if (r.email && !uniqueEmails.has(r.email)) {
                    uniqueEmails.add(r.email);
                    return true;
                }
                return false;
            });
        }
      } catch (error: any) {
        console.error("Error fetching recipients from Firestore:", error);
        return { success: false, message: `Failed to fetch recipient list: ${error?.message || 'Permission or connection error'}`, sentCount: 0 };
      }
    }

    if (recipients.length === 0) {
        return { success: false, message: 'No recipients with registered email addresses found.', sentCount: 0 };
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
        pool: true,
    });

    let sentCount = 0;
    const errors: string[] = [];

    // Send emails in parallel
    const sendPromises = recipients.map(recipient => {
        if (!recipient.email) return Promise.resolve();

        const recipientName = recipient.name || 'Valued Member';
        const unsubscribeUrl = `https://hyperdelivery.in/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
        const emailHtml = `
          <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td align="center">
                        <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
                            <tr>
                                <td>
                                    <div style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
                                    ${publicImageUrl ? `<img src="${publicImageUrl}" alt="Campaign Banner" style="width: 100%; max-width: 100%; height: auto; display: block; border: 0;"/>` : ''}
                                    <div style="padding: 20px 30px; line-height: 1.6;">
                                        <p>Dear ${recipientName},</p>
                                        ${body.replace(/\n/g, '<br/>')}
                                    </div>
                                    <div style="background-color: #f4f4f4; text-align: center; padding: 15px; font-size: 12px; color: #888;">
                                        <p style="margin: 0;">&copy; ${new Date().getFullYear()} HyperDelivery. All rights reserved.</p>
                                        <p style="margin-top: 5px;">
                                            If you no longer wish to receive these emails, you can 
                                            <a href="${unsubscribeUrl}" style="color: #007bff; text-decoration: underline;">unsubscribe here</a>.
                                        </p>
                                    </div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
          </body>
        `;

        const mailOptions = {
            from: `"HyperDelivery" <${process.env.EMAIL_USER}>`,
            to: recipient.email,
            subject: subject,
            html: emailHtml,
        };
        return transporter.sendMail(mailOptions)
            .then(() => {
                sentCount++;
            })
            .catch(error => {
                console.error(`Failed to send email to ${recipient.email}:`, error);
                errors.push(recipient.email);
            });
    });

    await Promise.all(sendPromises);

    if (errors.length > 0) {
        return {
            success: false,
            message: `Successfully sent ${sentCount} emails, but failed to send to ${errors.length} recipients.`,
            sentCount,
        };
    }

    return { 
        success: true, 
        message: `Campaign email broadcasted successfully to ${sentCount} recipient${sentCount === 1 ? '' : 's'}.`,
        sentCount,
    };
  }
);

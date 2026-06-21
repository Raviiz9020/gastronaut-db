

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
import { uploadImageToStorage } from '@/lib/client-utils'; // Use client-side safe uploader

const AudienceSchema = z.object({
  type: z.enum(['all-vendors', 'all-customers', 'specific-vendor', 'specific-customer', 'all']),
  vendorId: z.string().optional(),
  customerId: z.string().optional(),
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
        return { success: false, message: 'Server is not configured to send emails.', sentCount: 0 };
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


    let recipients: (Vendor | Customer)[] = [];

    // 1. Fetch recipients based on audience type
    try {
        if (audience.type === 'all-vendors') {
            const vendorsRef = collection(db, 'vendors');
            const vendorSnapshot = await getDocs(vendorsRef);
            recipients = vendorSnapshot.docs
              .map(doc => doc.data() as Vendor)
              .filter(v => v.email && v.email.trim() !== "" && (v.emailPreferences?.campaigns ?? true));
        } 
        
        else if (audience.type === 'all-customers') {
            const customersRef = collection(db, 'customers');
            const customerSnapshot = await getDocs(customersRef);
            recipients = customerSnapshot.docs
              .map(doc => doc.data() as Customer)
              .filter(c => c.email && c.email.trim() !== "" && (c.emailPreferences?.campaigns ?? true));
        } 
        
        else if (audience.type === 'specific-vendor' && audience.vendorId) {
            const vendorRef = doc(db, 'vendors', audience.vendorId);
            const docSnap = await getDoc(vendorRef);
            const vendorData = docSnap.data() as Vendor;
            if (docSnap.exists() && vendorData.email && (vendorData.emailPreferences?.campaigns ?? true)) {
                recipients = [vendorData];
            }
        } 
        
        else if (audience.type === 'specific-customer' && audience.customerId) {
            const customerRef = doc(db, 'customers', audience.customerId);
            const docSnap = await getDoc(customerRef);
            const customerData = docSnap.data() as Customer;
            if (docSnap.exists() && customerData.email && (customerData.emailPreferences?.campaigns ?? true)) {
                recipients = [customerData];
            }
        }
        
        else if (audience.type === 'all') {
            const vendorsRef = collection(db, 'vendors');
            const customersRef = collection(db, 'customers');
        
            const [vendorSnapshot, customerSnapshot] = await Promise.all([
                getDocs(vendorsRef),
                getDocs(customersRef),
            ]);
        
            const vendorRecipients = vendorSnapshot.docs
              .map(doc => doc.data() as Vendor)
              .filter(v => v.email && v.email.trim() !== "" && (v.emailPreferences?.campaigns ?? true));
        
            const customerRecipients = customerSnapshot.docs
              .map(doc => doc.data() as Customer)
              .filter(c => c.email && c.email.trim() !== "" && (c.emailPreferences?.campaigns ?? true));
        
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
    } catch (error) {
        console.error("Error fetching recipients:", error);
        return { success: false, message: 'Failed to fetch recipient list.', sentCount: 0 };
    }


    if (recipients.length === 0) {
        return { success: true, message: 'No recipients with email addresses found to send to.', sentCount: 0 };
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
        pool: true, // Use a connection pool for bulk sending
    });

    let sentCount = 0;
    const errors: string[] = [];

    // 2. Send emails in parallel
    const sendPromises = recipients.map(recipient => {
        if (!recipient.email) return Promise.resolve();

        // Determine the personalized name
        const recipientName = (recipient as Vendor).shopName || recipient.name || 'Valued Member';

        // 3. Construct the email body for each recipient
        const unsubscribeUrl = `https://hyperdelivery.shop/unsubscribe?email=${encodeURIComponent(recipient.email)}`;
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
                errors.push(recipient.email!);
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
        message: `Campaign email sent successfully to ${sentCount} recipients.`,
        sentCount,
    };
  }
);


'use server';

/**
 * @fileOverview A flow to notify the super admin when a new offer is activated.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import type { Offer } from '@/types';
import nodemailer from 'nodemailer';
import { format } from 'date-fns';

const SendOfferNotificationInputSchema = z.object({
  offer: z.any().describe('The full offer object that was activated.'),
  vendorName: z.string().describe("The name of the vendor who activated the offer."),
  superAdminEmail: z.string().email().describe("The email address of the super admin to notify.")
});
export type SendOfferNotificationInput = z.infer<typeof SendOfferNotificationInputSchema>;

const SendOfferNotificationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendOfferNotificationOutput = z.infer<typeof SendOfferNotificationOutputSchema>;

export async function sendOfferNotificationEmail(input: SendOfferNotificationInput): Promise<SendOfferNotificationOutput> {
  return sendOfferNotificationFlow(input);
}

const sendOfferNotificationFlow = ai.defineFlow(
  {
    name: 'sendOfferNotificationFlow',
    inputSchema: SendOfferNotificationInputSchema,
    outputSchema: SendOfferNotificationOutputSchema,
  },
  async ({ offer, vendorName, superAdminEmail }) => {
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
        console.error('Email credentials are not set in environment variables.');
        return { success: false, message: 'Server is not configured to send emails.' };
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
    });

    const subject = `New Offer Activated: "${offer.title}" by ${vendorName}`;
    const campaignLink = `https://hyperdelivery.shop/super-admin/dashboard/campaigns`;
    
    const formattedStartDate = offer.startDate ? format(new Date(offer.startDate), 'MMM dd, yyyy') : 'N/A';
    const formattedEndDate = offer.endDate ? format(new Date(offer.endDate), 'MMM dd, yyyy') : 'N/A';

    const body = `
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
                        <tr>
                            <td>
                                <div style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
                                <div style="background-color: #f59e0b; padding: 20px; text-align: center; color: white;">
                                    <h1 style="margin: 0;">New Offer Alert</h1>
                                </div>
                                <div style="padding: 20px 30px;">
                                    <h2 style="font-size: 20px; color: #333;">A new promotional offer has been activated.</h2>
                                    <p style="color: #555;">Here are the details:</p>
                                    
                                    <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                        <p style="margin: 5px 0; color: #555;"><strong>Vendor:</strong> ${vendorName}</p>
                                        <p style="margin: 5px 0; color: #555;"><strong>Offer Title:</strong> ${offer.title}</p>
                                        <p style="margin: 5px 0; color: #555;"><strong>Description:</strong> ${offer.description}</p>
                                        <p style="margin: 5px 0; color: #555;"><strong>Active From:</strong> ${formattedStartDate}</p>
                                        <p style="margin: 5px 0; color: #555;"><strong>Active Until:</strong> ${formattedEndDate}</p>
                                    </div>
                                    
                                    <div style="text-align: center; margin-top: 30px;">
                                    <p style="color: #555;">Would you like to notify customers about this offer?</p>
                                    <a href="${campaignLink}" style="display: inline-block; background-color: #1890ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 10px;">Create Campaign Now</a>
                                    </div>
                                </div>
                                <div style="background-color: #f4f4f4; text-align: center; padding: 15px; font-size: 12px; color: #888;">
                                    This is an automated notification from HyperDelivery.
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

    try {
        await transporter.sendMail({
            from: `"HyperDelivery System" <${process.env.EMAIL_USER}>`,
            to: superAdminEmail,
            subject: subject,
            html: body,
        });
        return { 
            success: true, 
            message: 'Super admin notification email sent successfully.',
        };
    } catch(error) {
        console.error("Error sending offer notification email: ", error);
        return { success: false, message: 'Failed to send notification email.' };
    }
  }
);

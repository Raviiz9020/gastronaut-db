
'use server';
/**
 * @fileOverview A flow to handle sending an order cancellation email to a customer.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import type { Order } from '@/types';
import nodemailer from 'nodemailer';

const SendCancellationEmailInputSchema = z.object({
  order: z.any().describe('The full order object, which must include customer details and vendor contact information.'),
});
export type SendCancellationEmailInput = z.infer<typeof SendCancellationEmailInputSchema>;

const SendCancellationEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendCancellationEmailOutput = z.infer<typeof SendCancellationEmailOutputSchema>;

export async function sendCancellationEmail(input: SendCancellationEmailInput): Promise<SendCancellationEmailOutput> {
  return sendCancellationEmailFlow(input);
}

const sendCancellationEmailFlow = ai.defineFlow(
  {
    name: 'sendCancellationEmailFlow',
    inputSchema: SendCancellationEmailInputSchema,
    outputSchema: SendCancellationEmailOutputSchema,
  },
  async ({ order }) => {
    
    if (!order.customer?.email) {
        return { success: false, message: `Customer for order ${order.orderId} does not have an email address.` };
    }

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

    const subject = `Update on your HyperDelivery Order: #${order.orderId}`;
    
    const shopName = order.items[0]?.shopName || 'the shop';
    const reason = order.cancellationReason || 'an unforeseen issue';
    const vendorContact = order.vendorContact || 'the vendor';

    const body = `
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
                        <tr>
                            <td>
                                <div style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
                                <div style="background-color: #ff4d4f; padding: 20px; text-align: center; color: white;">
                                    <h1 style="margin: 0;">Order Cancelled</h1>
                                </div>
                                <div style="padding: 20px 30px;">
                                    <h2 style="font-size: 20px; color: #333;">We're sorry, ${order.customer.name}.</h2>
                                    <p style="color: #555;">We regret to inform you that your recent order (#${order.orderId}) from <strong>${shopName}</strong> has been cancelled.</p>
                                    
                                    <div style="margin: 20px 0; padding: 20px; background-color: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px;">
                                    <h3 style="margin-top: 0; margin-bottom: 10px; font-size: 16px; color: #d46b08;">Reason for Cancellation:</h3>
                                    <p style="margin: 0; color: #d46b08;"><em>"${reason}"</em></p>
                                    </div>
                                    
                                    <p style="color: #555;">We sincerely apologize for any inconvenience this may cause. If you have already made a payment for this order, please rest assured that a refund will be processed via ${shopName}, if not done, please contact on ${vendorContact}.</p>
                                    
                                    <div style="text-align: center; margin-top: 30px;">
                                    <p style="color: #555;">We value your business and hope to serve you again soon.</p>
                                    <a href="https://hyperdelivery.shop/menu" style="display: inline-block; background-color: #1890ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 10px;">Return to Menu</a>
                                    </div>
                                </div>
                                <div style="background-color: #f4f4f4; text-align: center; padding: 15px; font-size: 12px; color: #888;">
                                    &copy; ${new Date().getFullYear()} HyperDelivery. All rights reserved.
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
            from: `"HyperDelivery Orders" <${process.env.EMAIL_USER}>`,
            to: order.customer.email,
            subject: subject,
            html: body,
        });
        return { 
            success: true, 
            message: 'Cancellation email sent successfully.',
        };
    } catch(error) {
        console.error("Error sending cancellation email: ", error);
        return { success: false, message: 'Failed to send cancellation email.' };
    }
  }
);


'use server';
/**
 * @fileOverview A flow to handle sending an order modification email to a customer.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import type { Order, Customer } from '@/types';
import nodemailer from 'nodemailer';

const SendOrderModifiedEmailInputSchema = z.object({
  order: z.any().describe('The full, updated order object.'),
  customer: z.any().describe('The full customer object.'),
});
export type SendOrderModifiedEmailInput = z.infer<typeof SendOrderModifiedEmailInputSchema>;

const SendOrderModifiedEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendOrderModifiedEmailOutput = z.infer<typeof SendOrderModifiedEmailOutputSchema>;

export async function sendOrderModifiedEmail(input: SendOrderModifiedEmailInput): Promise<SendOrderModifiedEmailOutput> {
  return sendOrderModifiedEmailFlow(input);
}

const sendOrderModifiedEmailFlow = ai.defineFlow(
  {
    name: 'sendOrderModifiedEmailFlow',
    inputSchema: SendOrderModifiedEmailInputSchema,
    outputSchema: SendOrderModifiedEmailOutputSchema,
  },
  async ({ order, customer }) => {
    
    if (!customer.email) {
        return { success: false, message: `Customer ${customer.username} does not have an email address.` };
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
    
    const itemsList = order.items.map((item: any) => 
        `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">${item.quantity}x ${item.name}</td>
            <td style="padding: 10px 0; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
         </tr>`
    ).join('');

    const shopName = order.items[0]?.shopName || 'the shop';

    const body = `
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
                        <tr>
                            <td>
                                <div style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
                                <div style="background-color: #1890ff; padding: 20px; text-align: center; color: white;">
                                    <h1 style="margin: 0;">Order Updated</h1>
                                </div>
                                <div style="padding: 20px 30px;">
                                    <h2 style="font-size: 20px; color: #333;">Hi ${customer.name},</h2>
                                    <p style="color: #555;">Your order (#${order.orderId}) from <strong>${shopName}</strong> has been updated as per your request. Please find the revised summary below.</p>
                                    
                                    <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Updated Order Summary</h3>
                                        <table style="width: 100%; border-collapse: collapse; color: #555;">
                                        <thead>
                                            <tr>
                                            <th style="text-align: left; padding-bottom: 10px; border-bottom: 2px solid #ddd;">Item</th>
                                            <th style="text-align: right; padding-bottom: 10px; border-bottom: 2px solid #ddd;">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${itemsList}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                            <td style="padding-top: 15px; font-weight: bold; font-size: 18px; color: #333;">New Total</td>
                                            <td style="padding-top: 15px; font-weight: bold; font-size: 18px; text-align: right; color: #333;">₹${order.totalPrice.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                        </table>
                                    </div>
                                    
                                    <div style="text-align: center; margin-top: 30px;">
                                    <p style="color: #555;">You can track your order status from your account page.</p>
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
            to: customer.email,
            subject: subject,
            html: body,
        });
        return { 
            success: true, 
            message: 'Order modification email sent successfully.',
        };
    } catch(error) {
        console.error("Error sending modification email: ", error);
        return { success: false, message: 'Failed to send modification email.' };
    }
  }
);



'use server';
/**
 * @fileOverview A flow to handle sending an order confirmation email to a vendor.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import type { Order, Vendor } from '@/types';
import nodemailer from 'nodemailer';

const SendOrderEmailInputSchema = z.object({
  order: z.any().describe('The full order object.'),
  vendor: z.any().describe('The full vendor object.'),
});
export type SendOrderEmailInput = z.infer<typeof SendOrderEmailInputSchema>;

const SendOrderEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendOrderEmailOutput = z.infer<typeof SendOrderEmailOutputSchema>;

export async function sendOrderEmail(input: SendOrderEmailInput): Promise<SendOrderEmailOutput> {
  return sendOrderEmailFlow(input);
}

const sendOrderEmailFlow = ai.defineFlow(
  {
    name: 'sendOrderEmailFlow',
    inputSchema: SendOrderEmailInputSchema,
    outputSchema: SendOrderEmailOutputSchema,
  },
  async ({ order, vendor }) => {
    
    if (!vendor.email) {
        return { success: false, message: `Vendor ${vendor.username} does not have an email address.` };
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

    const subject = `New Order Received: #${order.orderId}`;
    
    const itemsList = order.items.map((item: any) => 
        `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">${item.quantity}x ${item.name}</td>
            <td style="padding: 10px 0; text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
         </tr>`
    ).join('');

    const contact = order.customer.contact;
    const maskedContact = contact && contact.length > 4 ? 'x'.repeat(contact.length - 4) + contact.slice(-4) : contact;

    const customNotesHtml = order.customNotes ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px;">
            <h4 style="margin: 0 0 5px 0; font-weight: bold; color: #d46b08;">Customer's Special Instructions:</h4>
            <p style="margin: 0; color: #d46b08;"><em>"${order.customNotes}"</em></p>
        </div>
    ` : '';
    
    const rewardsRedeemed = order.pointsRedeemed && order.pointsRedeemed > 0;

    const rewardsHtml = (order.pointsEarned && order.pointsEarned > 0) || rewardsRedeemed ? `
        <div style="margin-top: 20px; padding: 15px; background-color: ${rewardsRedeemed ? '#fff1f0' : '#f0f9ff'}; border: 1px solid ${rewardsRedeemed ? '#ffccc7' : '#bae6fd'}; border-radius: 8px;">
            <h4 style="margin: 0; font-weight: bold; color: ${rewardsRedeemed ? '#cf1322' : '#0284c7'};">Rewards Info</h4>
            ${rewardsRedeemed ? `
                <p style="margin: 5px 0 0; color: #a8071a;">This customer redeemed <strong>${Math.floor(order.pointsRedeemed)} HyperPoints</strong> for a discount of ₹${order.discountAmount.toFixed(2)}.</p>
            ` : ''}
            ${(order.pointsEarned && order.pointsEarned > 0) ? `
                <p style="margin: 5px 0 0; color: #0369a1;">This customer earned <strong>${order.pointsEarned} HyperPoints</strong> on this order.</p>
            ` : ''}
        </div>
    ` : '';
    
    const subtotalHtml = `
      <tr style="font-weight: normal; color: #555;">
        <td style="padding: 10px 0 0;">Subtotal</td>
        <td style="padding: 10px 0 0; text-align: right;">₹${order.subtotal.toFixed(2)}</td>
      </tr>
    `;

    const discountHtml = rewardsRedeemed ? `
      <tr style="font-weight: normal; color: #cf1322;">
        <td style="padding: 5px 0;">Rewards Discount</td>
        <td style="padding: 5px 0; text-align: right;">- ₹${order.discountAmount.toFixed(2)}</td>
      </tr>
    ` : '';


    const body = `
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
                        <tr>
                            <td>
                                <div style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
                                <div style="background-color: #8B5CF6; padding: 20px; text-align: center; color: white;">
                                    <h1 style="margin: 0; color: white;">HyperDelivery</h1>
                                </div>
                                <div style="padding: 20px 30px;">
                                    <h2 style="font-size: 20px; color: #333;">You have a new order!</h2>
                                    <p style="color: #555;">A new order has been placed for your shop. Please see the details below.</p>
                                    
                                    <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                    <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Customer Details</h3>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Order ID:</strong> ${order.orderId}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Name:</strong> ${order.customer.name}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Contact:</strong> ${maskedContact}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Address:</strong> ${order.customer.address}</p>
                                    </div>
                                    
                                    ${customNotesHtml}

                                    <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Order Summary</h3>
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
                                            ${rewardsRedeemed ? subtotalHtml : ''}
                                            ${discountHtml}
                                            <tr style="border-top: 2px solid #ddd;">
                                            <td style="padding-top: 15px; font-weight: bold; font-size: 18px; color: #333;">Total</td>
                                            <td style="padding-top: 15px; font-weight: bold; font-size: 18px; text-align: right; color: #333;">₹${order.totalPrice.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                        </table>
                                    </div>
                                    
                                    ${rewardsHtml}
                                    
                                    <div style="text-align: center; margin-top: 30px;">
                                    <p style="color: #555;">Please log in to your vendor dashboard to process this order. Login here - <a href="https://hyperdelivery.shop/admin/login" target="_blank">https://hyperdelivery.shop/admin/login</a></p>
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
            to: vendor.email,
            subject: subject,
            html: body,
        });
        return { 
            success: true, 
            message: 'Order email sent successfully to vendor.',
        };
    } catch(error) {
        console.error("Error sending email: ", error);
        return { success: false, message: 'Failed to send email.' };
    }
  }
);



'use server';
/**
 * @fileOverview A flow to handle sending an order confirmation invoice to a customer.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import type { Order, Customer } from '@/types';
import nodemailer from 'nodemailer';

const SendCustomerInvoiceInputSchema = z.object({
  order: z.any().describe('The full order object.'),
  customer: z.any().describe('The full customer object.'),
});
export type SendCustomerInvoiceInput = z.infer<typeof SendCustomerInvoiceInputSchema>;

const SendCustomerInvoiceOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendCustomerInvoiceOutput = z.infer<typeof SendCustomerInvoiceOutputSchema>;

export async function sendCustomerInvoice(input: SendCustomerInvoiceInput): Promise<SendCustomerInvoiceOutput> {
  return sendCustomerInvoiceFlow(input);
}

const sendCustomerInvoiceFlow = ai.defineFlow(
  {
    name: 'sendCustomerInvoiceFlow',
    inputSchema: SendCustomerInvoiceInputSchema,
    outputSchema: SendCustomerInvoiceOutputSchema,
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

    const subject = `Your HyperDelivery Order Confirmation: #${order.orderId}`;
    
    const itemsList = order.items.map((item: any) => {
        let customizationsHtml = '';
        if (item.customizationDetails && Object.keys(item.customizationDetails).length > 0) {
            const details = Object.entries(item.customizationDetails).map(([custId, value]) => {
                const group = item.customizations?.find((c: any) => c.id === custId);
                if (!group) return null;
                const selectedNames = (Array.isArray(value) ? value : [value])
                    .map((optId: string) => group.options.find((o: any) => o.id === optId)?.name)
                    .filter(Boolean);
                if (selectedNames.length === 0) return null;
                return `<div style="font-size: 11px; color: #666; margin-left: 10px;">• ${group.name}: ${selectedNames.join(', ')}</div>`;
            }).filter(Boolean).join('');
            if (details) {
                customizationsHtml = `<div style="margin-top: 5px;">${details}</div>`;
            }
        } else if (item.customizations && item.customizations.length > 0) {
            const details = item.customizations.map((group: any) => {
                const names = group.options.map((o: any) => o.name).join(', ');
                return `<div style="font-size: 11px; color: #666; margin-left: 10px;">• ${group.name}: ${names}</div>`;
            }).join('');
            customizationsHtml = `<div style="margin-top: 5px;">${details}</div>`;
        }

        return `<tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 10px 0;">
                <div style="font-weight: bold;">${item.quantity}x ${item.name}</div>
                ${customizationsHtml}
            </td>
            <td style="padding: 10px 0; text-align: right; vertical-align: top;">₹${(item.price * item.quantity).toFixed(2)}</td>
         </tr>`;
    }).join('');

    const shopName = order.items[0]?.shopName || 'the shop';
    const contact = order.customer.contact;
    const maskedContact = contact && contact.length > 4 ? 'x'.repeat(contact.length - 4) + contact.slice(-4) : contact;
    
    const customNotesHtml = order.customNotes ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px;">
            <h4 style="margin: 0 0 5px 0; font-weight: bold; color: #d46b08;">Your Special Instructions:</h4>
            <p style="margin: 0; color: #d46b08;"><em>"${order.customNotes}"</em></p>
        </div>
    ` : '';
    
    const rewardsHtml = order.pointsEarned && order.pointsEarned > 0 ? `
        <div style="margin-top: 20px; padding: 15px; background-color: #e6fcf5; border: 1px solid #b7eb8f; border-radius: 8px; text-align: center;">
            <h4 style="margin: 0; font-weight: bold; color: #08979c;">🎉 Rewards Earned! 🎉</h4>
            <p style="margin: 5px 0 0; color: #08979c;">You've earned <strong>${order.pointsEarned} HyperPoints</strong> on this order!</p>
        </div>
    ` : '';
    
    const discountHtml = order.discountAmount && order.discountAmount > 0 ? `
        <tr style="color: #08979c;">
            <td style="padding: 5px 0;">Discount</td>
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
                                    <h2 style="font-size: 20px; color: #333;">Thank you for your order, ${customer.name}!</h2>
                                    <p style="color: #555;">We've received your order and are getting it ready for you. Here is a summary of your purchase.</p>
                                    
                                    <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                    <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 16px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 10px;">Order & Delivery Details</h3>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Order ID:</strong> ${order.orderId}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">From:</strong> ${shopName}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Delivery To:</strong> ${order.customer.name}</p>
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
                                            <tr style="font-weight: bold;">
                                                <td style="padding: 10px 0 0;">Subtotal</td>
                                                <td style="padding: 10px 0 0; text-align: right;">₹${order.subtotal.toFixed(2)}</td>
                                            </tr>
                                            ${discountHtml}
                                            <tr>
                                            <td style="padding-top: 15px; font-weight: bold; font-size: 18px; color: #333; border-top: 2px solid #ddd;">Total</td>
                                            <td style="padding-top: 15px; font-weight: bold; font-size: 18px; text-align: right; color: #333; border-top: 2px solid #ddd;">₹${order.totalPrice.toFixed(2)}</td>
                                            </tr>
                                        </tfoot>
                                        </table>
                                    </div>
                                    
                                    ${rewardsHtml}

                                    <div style="text-align: center; margin-top: 30px;">
                                    <p style="color: #555;">You can track your order status from your account page.</p>
                                    </div>

                                    <div style="margin-top: 20px; padding: 15px; background-color: #e6f7ff; border: 1px solid #91d5ff; border-radius: 16px; text-align: center;">
                                        <h4 style="margin: 0; font-weight: bold; color: #0050b3;">Advance Payment Information</h4>
                                        <p style="margin: 5px 0 0; color: #0060d1;">If you wish to make an advance payment for this order you can do it from your 'Track Order' page. just open QR code and long press the QR code and choose your UPI app</p>
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
            message: 'Customer invoice email sent successfully.',
        };
    } catch(error) {
        console.error("Error sending customer email: ", error);
        return { success: false, message: 'Failed to send invoice email.' };
    }
  }
);

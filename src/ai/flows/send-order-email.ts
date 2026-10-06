

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

        const displayOrderId = order.displayId || order.orderId;
        const subject = `New Order Received: #${displayOrderId}`;

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

        const contact = order.customer.contact;
        const maskedContact = contact && contact.length > 4 ? 'x'.repeat(contact.length - 4) + contact.slice(-4) : contact;

        // Payment mode & status clarification for vendor
        let paymentModeLabel = 'Online (Prepaid)';
        if (order.paymentMethod === 'COD') {
            paymentModeLabel = 'Cash on Delivery (COD)';
        } else if (order.paymentMethod === 'Pay at Counter') {
            paymentModeLabel = 'Pay at Counter';
        } else if (order.paymentGateway === 'Razorpay' || order.paymentMethod === 'Pay Now' || order.paymentMethod === 'UPI') {
            paymentModeLabel = 'Online (Razorpay / UPI)';
        } else if (order.paymentMethod) {
            paymentModeLabel = order.paymentMethod;
        }

        const isPaid = (
            order.paymentStatus === 'PAID' || 
            order.paymentStatus === 'CONFIRMED BY VENDOR' || 
            order.paymentStatus === 'CONFIRMED BY RIDER' || 
            ((order.paymentMethod === 'Pay Now' || order.paymentMethod === 'UPI' || order.paymentGateway === 'Razorpay') && order.paymentStatus !== 'PENDING')
        );
        const paymentStatusLabel = isPaid 
            ? 'Paid Online (Do NOT collect cash)' 
            : (order.paymentMethod === 'Pay at Counter' ? 'Pay at Counter' : 'Pending - Collect Cash on Delivery');
        const paymentStatusColor = isPaid ? '#16a34a' : '#d97706';

        const paymentRefHtml = (order.razorpayPaymentId || order.razorpayOrderId) ? `
            <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Payment Reference:</strong> ${order.razorpayPaymentId || order.razorpayOrderId}</p>
        ` : '';

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

        const deliveryHtml = order.deliveryCharge !== undefined && order.deliveryCharge > 0 ? `
      <tr style="font-weight: normal; color: #555;">
        <td style="padding: 5px 0;">Delivery Charges</td>
        <td style="padding: 5px 0; text-align: right;">₹${order.deliveryCharge.toFixed(2)}</td>
      </tr>
    ` : order.deliveryOption === 'Home Delivery' ? `
      <tr style="font-weight: normal; color: #08979c;">
        <td style="padding: 5px 0;">Delivery Charges</td>
        <td style="padding: 5px 0; text-align: right;">FREE Delivery</td>
      </tr>
    ` : '';

    const platformFee = order.platformFee !== undefined ? order.platformFee : 5.0;
    const platformFeeHtml = platformFee > 0 ? `
      <tr style="font-weight: normal; color: #555;">
        <td style="padding: 5px 0;">Platform Fee</td>
        <td style="padding: 5px 0; text-align: right;">₹${platformFee.toFixed(2)}</td>
      </tr>
    ` : '';

        const subtotalHtml = `
      <tr style="font-weight: normal; color: #555;">
        <td style="padding: 10px 0 0;">Items Subtotal</td>
        <td style="padding: 10px 0 0; text-align: right;">₹${order.subtotal.toFixed(2)}</td>
      </tr>
    `;

        const discountLabel = rewardsRedeemed ? 'Rewards Discount' : 'Discount';
        const discountHtml = order.discountAmount && order.discountAmount > 0 ? `
      <tr style="font-weight: normal; color: #08979c;">
        <td style="padding: 5px 0;">${discountLabel}</td>
        <td style="padding: 5px 0; text-align: right;">- ₹${order.discountAmount.toFixed(2)}</td>
      </tr>
    ` : '';

        const totalRowHtml = isPaid ? `
      <tr style="border-top: 2px solid #ddd;">
        <td style="padding-top: 15px; font-weight: bold; font-size: 18px; color: #333;">Total Paid (Online)</td>
        <td style="padding-top: 15px; font-weight: bold; font-size: 18px; text-align: right; color: #8B5CF6;">₹${(order.amountPaid || order.totalPrice).toFixed(2)}</td>
      </tr>
    ` : `
      <tr style="border-top: 2px solid #ddd;">
        <td style="padding-top: 15px; font-weight: bold; font-size: 18px; color: #333;">Total to Collect (COD)</td>
        <td style="padding-top: 15px; font-weight: bold; font-size: 18px; text-align: right; color: #d97706;">₹${order.totalPrice.toFixed(2)}</td>
      </tr>
    `;


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
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Order ID:</strong> #${displayOrderId}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Name:</strong> ${order.customer.name}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Contact:</strong> ${maskedContact}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Address:</strong> ${order.customer.address}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Delivery Type:</strong> ${order.deliveryOption || 'Home Delivery'}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Payment Mode:</strong> ${paymentModeLabel}</p>
                                    <p style="margin: 5px 0; color: #555;"><strong style="color: darkblue;">Payment Status:</strong> <span style="font-weight: bold; color: ${paymentStatusColor};">${paymentStatusLabel}</span></p>
                                    ${paymentRefHtml}
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
                                            ${subtotalHtml}
                                            ${deliveryHtml}
                                            ${platformFeeHtml}
                                            ${discountHtml}
                                            ${totalRowHtml}
                                        </tfoot>
                                        </table>
                                    </div>
                                    
                                    ${rewardsHtml}
                                    
                                    <div style="text-align: center; margin-top: 30px;">
                                    <p style="color: #555;">Please log in to your vendor dashboard to process this order. Login here - <a href="https://hyperdelivery.in/admin/login" target="_blank">https://hyperdelivery.in/admin/login</a></p>
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
        } catch (error) {
            console.error("Error sending email: ", error);
            return { success: false, message: 'Failed to send email.' };
        }
    }
);

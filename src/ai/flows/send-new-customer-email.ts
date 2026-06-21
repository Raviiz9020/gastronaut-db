
'use server';

/**
 * @fileOverview A flow to notify the super admin when a new customer signs up.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const SendNewCustomerEmailInputSchema = z.object({
  customerName: z.string().describe("The name of the new customer."),
  customerEmail: z.string().optional().describe("The email of the new customer, if provided."),
  superAdminEmail: z.string().email().describe("The email address of the super admin to notify.")
});
export type SendNewCustomerEmailInput = z.infer<typeof SendNewCustomerEmailInputSchema>;

const SendNewCustomerEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendNewCustomerEmailOutput = z.infer<typeof SendNewCustomerEmailOutputSchema>;

export async function sendNewCustomerEmail(input: SendNewCustomerEmailInput): Promise<SendNewCustomerEmailOutput> {
  return sendNewCustomerEmailFlow(input);
}

const sendNewCustomerEmailFlow = ai.defineFlow(
  {
    name: 'sendNewCustomerEmailFlow',
    inputSchema: SendNewCustomerEmailInputSchema,
    outputSchema: SendNewCustomerEmailOutputSchema,
  },
  async ({ customerName, customerEmail, superAdminEmail }) => {
    
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

    const subject = `New Customer Signup: ${customerName}`;
    const dashboardLink = `https://hyperdelivery.shop/super-admin/dashboard/customers`;
    
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
                                    <h1 style="margin: 0;">New Customer Alert</h1>
                                </div>
                                <div style="padding: 20px 30px;">
                                    <h2 style="font-size: 20px; color: #333;">A new customer has joined HyperDelivery!</h2>
                                    <p style="color: #555;">Here are the details:</p>
                                    
                                    <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                        <p style="margin: 5px 0; color: #555;"><strong>Name:</strong> ${customerName}</p>
                                        ${customerEmail ? `<p style="margin: 5px 0; color: #555;"><strong>Email:</strong> ${customerEmail}</p>` : ''}
                                    </div>
                                    
                                    <div style="text-align: center; margin-top: 30px;">
                                    <p style="color: #555;">You can view all customers in the dashboard.</p>
                                    <a href="${dashboardLink}" style="display: inline-block; background-color: #8B5CF6; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 10px;">View Customers</a>
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
            message: 'New customer notification email sent successfully.',
        };
    } catch(error) {
        console.error("Error sending new customer email: ", error);
        return { success: false, message: 'Failed to send notification email.' };
    }
  }
);

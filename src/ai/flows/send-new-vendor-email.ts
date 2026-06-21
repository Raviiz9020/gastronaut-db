
'use server';

/**
 * @fileOverview A flow to notify the super admin when a new vendor signs up.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const SendNewVendorEmailInputSchema = z.object({
  vendorName: z.string().describe("The name of the new vendor."),
  shopName: z.string().optional().describe("The shop name of the new vendor, if provided."),
  superAdminEmail: z.string().email().describe("The email address of the super admin to notify.")
});
export type SendNewVendorEmailInput = z.infer<typeof SendNewVendorEmailInputSchema>;

const SendNewVendorEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});
export type SendNewVendorEmailOutput = z.infer<typeof SendNewVendorEmailOutputSchema>;

export async function sendNewVendorEmail(input: SendNewVendorEmailInput): Promise<SendNewVendorEmailOutput> {
  return sendNewVendorEmailFlow(input);
}

const sendNewVendorEmailFlow = ai.defineFlow(
  {
    name: 'sendNewVendorEmailFlow',
    inputSchema: SendNewVendorEmailInputSchema,
    outputSchema: SendNewVendorEmailOutputSchema,
  },
  async ({ vendorName, shopName, superAdminEmail }) => {
    
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

    const subject = `New Vendor Signup: ${shopName || vendorName}`;
    const dashboardLink = `https://hyperdelivery.shop/super-admin/dashboard`;
    
    const body = `
      <body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <table width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px;">
                        <tr>
                            <td>
                                <div style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
                                <div style="background-color: #22c55e; padding: 20px; text-align: center; color: white;">
                                    <h1 style="margin: 0;">New Vendor Alert</h1>
                                </div>
                                <div style="padding: 20px 30px;">
                                    <h2 style="font-size: 20px; color: #333;">A new vendor has joined HyperDelivery!</h2>
                                    <p style="color: #555;">Here are the details:</p>
                                    
                                    <div style="margin: 20px 0; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                                        <p style="margin: 5px 0; color: #555;"><strong>Owner Name:</strong> ${vendorName}</p>
                                        ${shopName ? `<p style="margin: 5px 0; color: #555;"><strong>Shop Name:</strong> ${shopName}</p>` : ''}
                                    </div>
                                    
                                    <div style="text-align: center; margin-top: 30px;">
                                    <p style="color: #555;">Please visit the dashboard to review and approve their account.</p>
                                    <a href="${dashboardLink}" style="display: inline-block; background-color: #1890ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 10px;">Approve Vendor</a>
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
            message: 'New vendor notification email sent successfully.',
        };
    } catch(error) {
        console.error("Error sending new vendor email: ", error);
        return { success: false, message: 'Failed to send notification email.' };
    }
  }
);

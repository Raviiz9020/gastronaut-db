'use server';

/**
 * @fileOverview A flow to handle sending an itemized settlement summary email to a vendor.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const OrderSummarySchema = z.object({
  displayId: z.string(),
  createdAt: z.string(),
  deliveryOption: z.string(),
  subtotal: z.number(),
  commissionPercentage: z.number(),
  commissionAmount: z.number(),
  netAmount: z.number(),
});

const SendVendorSettlementEmailInputSchema = z.object({
  vendor: z.object({
    username: z.string(),
    shopName: z.string(),
    email: z.string(),
    contact: z.string().optional(),
    upiId: z.string().optional(),
  }),
  settlementDetails: z.object({
    settlementId: z.string(),
    settledAt: z.string(),
    paymentMode: z.string(),
    utrOrRef: z.string().optional(),
    totalSubtotal: z.number(),
    totalCommission: z.number(),
    netPayout: z.number(),
    orders: z.array(OrderSummarySchema),
  }),
});

export type SendVendorSettlementEmailInput = z.infer<typeof SendVendorSettlementEmailInputSchema>;

const SendVendorSettlementEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type SendVendorSettlementEmailOutput = z.infer<typeof SendVendorSettlementEmailOutputSchema>;

export async function sendVendorSettlementEmail(input: SendVendorSettlementEmailInput): Promise<SendVendorSettlementEmailOutput> {
  return sendVendorSettlementEmailFlow(input);
}

const sendVendorSettlementEmailFlow = ai.defineFlow(
  {
    name: 'sendVendorSettlementEmailFlow',
    inputSchema: SendVendorSettlementEmailInputSchema,
    outputSchema: SendVendorSettlementEmailOutputSchema,
  },
  async ({ vendor, settlementDetails }) => {
    if (!vendor.email) {
      return { success: false, message: `Vendor ${vendor.shopName} (${vendor.username}) does not have an email address.` };
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

    const subject = `Payout Settlement Statement: ${settlementDetails.settlementId} - ₹${settlementDetails.netPayout.toFixed(2)}`;

    // Sort orders by Display ID / Order Number in natural ascending order (e.g. HYPER-5044, HYPER-5045, etc.)
    const sortedOrders = [...settlementDetails.orders].sort((a, b) => {
      const numA = parseInt(a.displayId.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.displayId.replace(/\D/g, ''), 10) || 0;
      if (numA !== numB) {
        return numA - numB;
      }
      return a.displayId.localeCompare(b.displayId, undefined, { numeric: true, sensitivity: 'base' });
    });

    const orderRowsHtml = sortedOrders
      .map((ord, idx) => {
        const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        const dateFormatted = ord.createdAt
          ? new Date(ord.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A';

        return `
          <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <td style="padding: 10px 12px; font-weight: 700; color: #1e293b;">${ord.displayId}</td>
            <td style="padding: 10px 12px; color: #64748b;">${dateFormatted}</td>
            <td style="padding: 10px 12px; color: #475569;">${ord.deliveryOption}</td>
            <td style="padding: 10px 12px; text-align: right; color: #1e293b; font-weight: 600;">₹${ord.subtotal.toFixed(2)}</td>
            <td style="padding: 10px 12px; text-align: right; color: #dc2626;">- ₹${ord.commissionAmount.toFixed(2)} <span style="font-size: 11px; color: #94a3b8;">(${ord.commissionPercentage}%)</span></td>
            <td style="padding: 10px 12px; text-align: right; color: #16a34a; font-weight: 700;">₹${ord.netAmount.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payout Settlement Statement</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.5; color: #334155; margin: 0; padding: 0; background-color: #f1f5f9; }
        .container { max-width: 680px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #0b132b 0%, #1c2541 100%); color: #ffffff; padding: 32px 24px; text-align: center; }
        .header h1 { margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .header p { margin: 0; font-size: 14px; color: #94a3b8; }
        .content { padding: 24px; }
        .payout-card { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #86efac; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; }
        .payout-card .amount { font-size: 32px; font-weight: 900; color: #15803d; margin: 6px 0 2px 0; }
        .payout-card .subtitle { font-size: 12px; color: #166534; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        .info-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; }
        .table-container { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
        .table-container th { background-color: #0f172a; color: #ffffff; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; }
        .footer { background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>Hyper Delivery</h1>
          <p>Official Vendor Payout & Commission Settlement Statement</p>
        </div>

        <!-- Content -->
        <div class="content">
          <!-- Big Payout Badge -->
          <div class="payout-card">
            <div class="subtitle">Net Settlement Credited</div>
            <div class="amount">₹${settlementDetails.netPayout.toFixed(2)}</div>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">
              Settled successfully to <strong>${vendor.shopName}</strong>
            </p>
          </div>

          <!-- Metadata Box -->
          <div class="info-card">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <tr>
                <td style="padding: 4px 0; color: #64748b; width: 40%;"><strong>Settlement Ref ID:</strong></td>
                <td style="padding: 4px 0; color: #0f172a; font-weight: 600; text-align: right;">${settlementDetails.settlementId}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Settlement Date:</strong></td>
                <td style="padding: 4px 0; color: #0f172a; text-align: right;">${new Date(settlementDetails.settledAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Payment Mode:</strong></td>
                <td style="padding: 4px 0; color: #0f172a; text-align: right;">${settlementDetails.paymentMode || 'Direct Payout'}</td>
              </tr>
              ${vendor.upiId ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Beneficiary UPI:</strong></td>
                <td style="padding: 4px 0; color: #2563eb; font-weight: 600; text-align: right;">${vendor.upiId}</td>
              </tr>` : ''}
              ${settlementDetails.utrOrRef ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Bank UTR / Ref:</strong></td>
                <td style="padding: 4px 0; color: #0f172a; text-align: right;">${settlementDetails.utrOrRef}</td>
              </tr>` : ''}
            </table>
          </div>

          <!-- KPI Summary -->
          <table style="width: 100%; margin-bottom: 24px; border-collapse: separate; border-spacing: 8px 0;">
            <tr>
              <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Gross Sales</div>
                <div style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 2px;">₹${settlementDetails.totalSubtotal.toFixed(2)}</div>
              </td>
              <td style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #991b1b; font-weight: 700; text-transform: uppercase;">Commission</div>
                <div style="font-size: 17px; font-weight: 800; color: #dc2626; margin-top: 2px;">- ₹${settlementDetails.totalCommission.toFixed(2)}</div>
              </td>
              <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Net Payout</div>
                <div style="font-size: 17px; font-weight: 800; color: #16a34a; margin-top: 2px;">₹${settlementDetails.netPayout.toFixed(2)}</div>
              </td>
            </tr>
          </table>

          <!-- Order-by-Order Table -->
          <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">Included Orders Breakdown (${settlementDetails.orders.length})</h3>
          <table class="table-container">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Type</th>
                <th style="text-align: right;">Subtotal</th>
                <th style="text-align: right;">Commission</th>
                <th style="text-align: right;">Net Payout</th>
              </tr>
            </thead>
            <tbody>
              ${orderRowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 13px;">
                <td colspan="3" style="padding: 10px 12px;">Total (${settlementDetails.orders.length} Orders)</td>
                <td style="padding: 10px 12px; text-align: right;">₹${settlementDetails.totalSubtotal.toFixed(2)}</td>
                <td style="padding: 10px 12px; text-align: right; color: #f87171;">- ₹${settlementDetails.totalCommission.toFixed(2)}</td>
                <td style="padding: 10px 12px; text-align: right; color: #4ade80;">₹${settlementDetails.netPayout.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 16px;">
            * This statement has been automatically generated upon settlement confirmation by Hyper Delivery Administration. Please retain this email for your accounting records.
          </p>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p style="margin: 0 0 4px 0; font-weight: 600; color: #334155;">Hyper Delivery Partner Support</p>
          <p style="margin: 0; color: #94a3b8;">
            Have questions regarding this statement? Email us at <a href="mailto:hyperlabsupport@gmail.com" style="color: #2563eb; text-decoration: none;">hyperlabsupport@gmail.com</a> or WhatsApp at <strong>+917083609020</strong>.
          </p>
        </div>
      </div>
    </body>
    </html>
    `;

    try {
      await transporter.sendMail({
        from: `"HyperDelivery Settlements" <${process.env.EMAIL_USER}>`,
        to: vendor.email,
        subject,
        html: htmlContent,
      });

      return {
        success: true,
        message: `Settlement email sent successfully to ${vendor.email}`,
      };
    } catch (error: any) {
      console.error('Error sending vendor settlement email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send vendor settlement email.',
      };
    }
  }
);

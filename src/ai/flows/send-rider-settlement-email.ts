'use server';

/**
 * @fileOverview A flow to handle sending an itemized delivery payout settlement email to a delivery partner / rider.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import nodemailer from 'nodemailer';

const RiderOrderSummarySchema = z.object({
  displayId: z.string(),
  createdAt: z.string(),
  vendorShopName: z.string(),
  deliveryDistanceKm: z.number().optional(),
  riderPayout: z.number(),
});

const SendRiderSettlementEmailInputSchema = z.object({
  rider: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
    contact: z.string().optional(),
    upiId: z.string().optional(),
    vehicleNumber: z.string().optional(),
  }),
  settlementDetails: z.object({
    settlementId: z.string(),
    settledAt: z.string(),
    paymentMode: z.string(),
    utrOrRef: z.string().optional(),
    totalDeliveries: z.number(),
    totalPayout: z.number(),
    orders: z.array(RiderOrderSummarySchema),
  }),
});

export type SendRiderSettlementEmailInput = z.infer<typeof SendRiderSettlementEmailInputSchema>;

const SendRiderSettlementEmailOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type SendRiderSettlementEmailOutput = z.infer<typeof SendRiderSettlementEmailOutputSchema>;

export async function sendRiderSettlementEmail(input: SendRiderSettlementEmailInput): Promise<SendRiderSettlementEmailOutput> {
  return sendRiderSettlementEmailFlow(input);
}

const sendRiderSettlementEmailFlow = ai.defineFlow(
  {
    name: 'sendRiderSettlementEmailFlow',
    inputSchema: SendRiderSettlementEmailInputSchema,
    outputSchema: SendRiderSettlementEmailOutputSchema,
  },
  async ({ rider, settlementDetails }) => {
    if (!rider.email) {
      return { success: false, message: `Rider ${rider.name} does not have an email address.` };
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

    const subject = `Rider Delivery Payout Statement: ${settlementDetails.settlementId} - ₹${settlementDetails.totalPayout.toFixed(2)}`;

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

        const distanceText = ord.deliveryDistanceKm && ord.deliveryDistanceKm > 0 
          ? `${ord.deliveryDistanceKm.toFixed(1)} km` 
          : '—';

        return `
          <tr style="background-color: ${rowBg}; border-bottom: 1px solid #e2e8f0; font-size: 13px;">
            <td style="padding: 10px 12px; font-weight: 700; color: #1e293b;">${ord.displayId}</td>
            <td style="padding: 10px 12px; color: #64748b;">${dateFormatted}</td>
            <td style="padding: 10px 12px; color: #334155; font-weight: 500;">${ord.vendorShopName || 'Local Shop'}</td>
            <td style="padding: 10px 12px; text-align: center; color: #64748b;">${distanceText}</td>
            <td style="padding: 10px 12px; text-align: right; color: #16a34a; font-weight: 700;">₹${ord.riderPayout.toFixed(2)}</td>
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
      <title>Delivery Partner Payout Statement</title>
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
          <p>Official Delivery Partner Payout Statement</p>
        </div>

        <!-- Content -->
        <div class="content">
          <!-- Big Payout Badge -->
          <div class="payout-card">
            <div class="subtitle">Delivery Earnings Settled</div>
            <div class="amount">₹${settlementDetails.totalPayout.toFixed(2)}</div>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #166534;">
              Settled successfully to <strong>${rider.name}</strong> (${settlementDetails.totalDeliveries} Completed Deliveries)
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
              ${rider.upiId ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Beneficiary UPI:</strong></td>
                <td style="padding: 4px 0; color: #2563eb; font-weight: 600; text-align: right;">${rider.upiId}</td>
              </tr>` : ''}
              ${rider.vehicleNumber ? `
              <tr>
                <td style="padding: 4px 0; color: #64748b;"><strong>Vehicle Number:</strong></td>
                <td style="padding: 4px 0; color: #0f172a; text-align: right;">${rider.vehicleNumber}</td>
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
                <div style="font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase;">Completed Trips</div>
                <div style="font-size: 17px; font-weight: 800; color: #0f172a; margin-top: 2px;">${settlementDetails.totalDeliveries}</div>
              </td>
              <td style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 12px; text-align: center;">
                <div style="font-size: 11px; color: #166534; font-weight: 700; text-transform: uppercase;">Total Payout Credited</div>
                <div style="font-size: 17px; font-weight: 800; color: #16a34a; margin-top: 2px;">₹${settlementDetails.totalPayout.toFixed(2)}</div>
              </td>
            </tr>
          </table>

          <!-- Order-by-Order Table -->
          <h3 style="font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 10px 0;">Trip Deliveries Breakdown (${settlementDetails.orders.length})</h3>
          <table class="table-container">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Shop / Pickup</th>
                <th style="text-align: center;">Distance</th>
                <th style="text-align: right;">Trip Payout</th>
              </tr>
            </thead>
            <tbody>
              ${orderRowsHtml}
            </tbody>
            <tfoot>
              <tr style="background-color: #0f172a; color: #ffffff; font-weight: 700; font-size: 13px;">
                <td colspan="4" style="padding: 10px 12px;">Total (${settlementDetails.orders.length} Deliveries)</td>
                <td style="padding: 10px 12px; text-align: right; color: #4ade80;">₹${settlementDetails.totalPayout.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin-top: 16px;">
            * This statement has been automatically generated upon settlement confirmation by Hyper Delivery Administration. Thank you for your dedication as a delivery partner!
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
        to: rider.email,
        subject,
        html: htmlContent,
      });

      return {
        success: true,
        message: `Rider settlement email sent successfully to ${rider.email}`,
      };
    } catch (error: any) {
      console.error('Error sending rider settlement email:', error);
      return {
        success: false,
        message: error.message || 'Failed to send rider settlement email.',
      };
    }
  }
);

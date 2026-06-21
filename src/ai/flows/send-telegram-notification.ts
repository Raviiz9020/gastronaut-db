'use server';

/**
 * @fileOverview A Genkit flow for sending order notifications via Telegram.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { CartItem } from '@/types';

const SendTelegramNotificationInputSchema = z.object({
  orderId: z.string(),
  vendorUsername: z.string(),
  totalPrice: z.number(),
  customerName: z.string(),
  items: z.any(), // Zod doesn't have a direct equivalent for CartItem[], 'any' is sufficient here
  deliveryOption: z.string(),
  customerAddress: z.string(),
});

export type SendTelegramNotificationInput = z.infer<typeof SendTelegramNotificationInputSchema>;

const SendTelegramNotificationOutputSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export async function sendTelegramNotification(
  input: SendTelegramNotificationInput
): Promise<z.infer<typeof SendTelegramNotificationOutputSchema>> {
  return sendTelegramNotificationFlow(input);
}

const sendTelegramNotificationFlow = ai.defineFlow(
  {
    name: 'sendTelegramNotificationFlow',
    inputSchema: SendTelegramNotificationInputSchema,
    outputSchema: SendTelegramNotificationOutputSchema,
  },
  async ({ orderId, vendorUsername, totalPrice, customerName, items, deliveryOption, customerAddress }) => {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (!botToken) {
      console.warn('Telegram bot token is not configured on the server. Skipping notification.');
      return { success: false, message: 'Telegram bot token not configured.' };
    }

    try {
      // 1. Fetch vendor data to get the chat ID(s)
      const vendorRef = doc(db, 'vendors', vendorUsername);
      const vendorSnap = await getDoc(vendorRef);

      if (!vendorSnap.exists() || !vendorSnap.data().telegramChatId) {
        console.log(`Vendor ${vendorUsername} has no Telegram Chat ID. Skipping notification.`);
        return { success: true, message: 'No chat ID configured for vendor.' };
      }

      const chatIdString = vendorSnap.data().telegramChatId;
      
      // 2. Split the string into an array of chat IDs and trim whitespace
      const chatIds = chatIdString.split(',').map((id: string) => id.trim()).filter((id: string) => id);
      
      if (chatIds.length === 0) {
          console.log(`Vendor ${vendorUsername} has an empty Telegram Chat ID string. Skipping.`);
          return { success: true, message: 'No chat IDs configured for vendor.' };
      }

      // 3. Format the message
      const itemsList = (items as CartItem[]).map(item => `  - ${item.quantity}x ${item.name}`).join('\n');
      const deliveryInfo = `*Delivery Type:* ${deliveryOption}`;
      const addressInfo = deliveryOption === 'Home Delivery' ? `\n*Address:* ${customerAddress}` : '';
      
      const message = `
*🚀 New Order Received!* 🚀

*Order ID:* \`${orderId}\`
*Customer:* ${customerName}
${deliveryInfo}${addressInfo}
*Total:* ₹${totalPrice.toFixed(2)}

*Items:*
${itemsList}
      `;

      // 4. Send the message to all chat IDs
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      
      const sendPromises = chatIds.map((chatId: string) => fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown',
        }),
      }).then(response => response.json()));
      
      const results = await Promise.allSettled(sendPromises);
      
      let successfulSends = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.ok) {
          successfulSends++;
          console.log(`Telegram notification sent successfully for order ${orderId} to chat ID ${chatIds[index]}.`);
        } else {
          const reason = result.status === 'rejected' ? result.reason : result.value.description;
          console.error(`Failed to send Telegram notification to chat ID ${chatIds[index]}:`, reason);
        }
      });
      
      if (successfulSends === 0 && chatIds.length > 0) {
        return { success: false, message: 'Failed to send notification to any chat ID.' };
      }

      if (successfulSends < chatIds.length) {
          return { success: true, message: `Notification sent to ${successfulSends} of ${chatIds.length} chats.`}
      }

      return { success: true, message: 'Notification sent to all configured chats.' };

    } catch (error: any) {
      console.error('Failed to send Telegram notification:', error);
      return { success: false, message: error.message || 'An unknown error occurred.' };
    }
  }
);

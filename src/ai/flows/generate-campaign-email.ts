
'use server';

/**
 * @fileOverview An AI agent that generates a complete email campaign (subject and body) from a prompt.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';

const GenerateCampaignEmailInputSchema = z.object({
  prompt: z.string().describe("The user's high-level goal for the email campaign."),
});
export type GenerateCampaignEmailInput = z.infer<typeof GenerateCampaignEmailInputSchema>;

const GenerateCampaignEmailOutputSchema = z.object({
  subject: z.string().describe("A compelling and concise email subject line."),
  body: z.string().describe("The full email body content, written in a friendly and professional tone. Use line breaks for paragraphs."),
});
export type GenerateCampaignEmailOutput = z.infer<typeof GenerateCampaignEmailOutputSchema>;

export async function generateCampaignEmail(input: GenerateCampaignEmailInput): Promise<GenerateCampaignEmailOutput> {
  return generateCampaignEmailFlow(input);
}

const emailPrompt = ai.definePrompt({
  name: 'generateCampaignEmailPrompt',
  input: { schema: GenerateCampaignEmailInputSchema },
  output: { schema: GenerateCampaignEmailOutputSchema },
  prompt: `You are a marketing assistant for a food delivery platform called HyperDelivery. Your task is to write a short, friendly, and professional email to all recipients.

Based on the user's prompt below, generate a suitable subject line and email body.

The email body should be concise and easy to read. Use newline characters (\\n) to separate paragraphs.

The body must end with a professional closing (e.g., "Thanks,\\nThe HyperDelivery Team"). Do NOT include a salutation like "Hi [Recipient Name]," as it will be added automatically.

Prompt: {{{prompt}}}`,
});

const generateCampaignEmailFlow = ai.defineFlow(
  {
    name: 'generateCampaignEmailFlow',
    inputSchema: GenerateCampaignEmailInputSchema,
    outputSchema: GenerateCampaignEmailOutputSchema,
  },
  async ({ prompt }) => {
    
    const { output } = await emailPrompt({ prompt });

    if (!output?.subject && !output?.body) {
      throw new Error("Could not generate any content. Please try a different prompt.");
    }
    
    return {
      subject: output.subject,
      body: output.body,
    };
  }
);

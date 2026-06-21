
'use server';
/**
 * @fileOverview Genkit flows for Google Business Profile OAuth.
 * Handles only the Auth URL generation. 
 * The actual OAuth callback is handled in /api/oauth/google/callback.
 */
import { ai } from '@/ai/config';
import { z } from 'zod';
import { google } from 'googleapis';

const GmbAuthUrlInputSchema = z.object({
  vendorId: z.string().describe("The UID of the vendor initiating the auth flow."),
  baseUrl: z.string().url().describe("The base URL of the application (e.g., https://hyperdelivery.shop)."),
});

const GmbAuthUrlOutputSchema = z.string().describe("The Google OAuth 2.0 URL for the vendor to visit.");

export async function generateGmbAuthUrl(input: z.infer<typeof GmbAuthUrlInputSchema>): Promise<string> {
  return generateGmbAuthUrlFlow(input);
}

const generateGmbAuthUrlFlow = ai.defineFlow(
  {
    name: 'generateGmbAuthUrlFlow',
    inputSchema: GmbAuthUrlInputSchema,
    outputSchema: GmbAuthUrlOutputSchema,
  },
  async ({ vendorId, baseUrl }) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      throw new Error('Missing Google OAuth credentials.');
    }

    // Always use the hardcoded production URL for consistency and security.
    const redirectUri = 'https://hyperdelivery.shop/api/oauth/google/callback';
    console.log("🔍 Generated OAuth Redirect URI (frontend flow):", redirectUri);

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      redirectUri
    );

    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/business.manage'],
      state: vendorId,
    });

    return url;
  }
);

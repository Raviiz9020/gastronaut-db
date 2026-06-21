
'use server';

/**
 * @fileOverview A placeholder Genkit flow. The actual logic has been moved to an API route.
 * This is to prevent server-side SDKs from causing build issues in Next.js.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';

const GetGmbStatsInputSchema = z.object({
  vendorId: z.string().describe("The UID of the vendor."),
});

const GetGmbStatsOutputSchema = z.object({
  averageRating: z.number().optional(),
  totalReviewCount: z.number().optional(),
}).nullable();

export async function getGmbStats(
  input: z.infer<typeof GetGmbStatsInputSchema>
): Promise<z.infer<typeof GetGmbStatsOutputSchema>> {
  // This is a mock response. The actual implementation is in /api/gmb/stats/route.ts
  console.warn("getGmbStats flow is a placeholder. The dashboard fetches from /api/gmb/stats instead.");
  return null;
}

const getGmbStatsFlow = ai.defineFlow(
  {
    name: 'getGmbStatsFlow',
    inputSchema: GetGmbStatsInputSchema,
    outputSchema: GetGmbStatsOutputSchema,
  },
  async ({ vendorId }) => {
     console.warn("getGmbStatsFlow is not implemented and should not be called directly from the client.");
     return null;
  }
);



'use server';

/**
 * @fileOverview An AI agent that provides business insights to vendors.
 *
 * - getVendorInsights - A function that analyzes dashboard data and provides suggestions.
 * - VendorInsightsInput - The input type for the getVendorInsights function.
 * - VendorInsightsOutput - The return type for the getVendorInsights function.
 */

import { ai } from '@/ai/config';
import { z } from 'zod';

const VendorInsightsInputSchema = z.object({
  totalRevenue: z.number(),
  totalOrders: z.number(),
  pendingOrdersCount: z.number(),
  averageOrderValue: z.number(),
  popularItems: z.array(z.object({ name: z.string(), quantity: z.number() })),
  topCustomers: z.array(z.object({ name: z.string(), totalSpent: z.number() })),
  orderTypeBreakdown: z.array(z.object({ name: z.string(), value: z.number() })),
  customerStats: z.object({ total: z.number(), new: z.number() }),
  peakHours: z.array(z.object({ hour: z.string(), orders: z.number() })),
  last7DaysExpenses: z.number(),
});
export type VendorInsightsInput = z.infer<typeof VendorInsightsInputSchema>;

const VendorInsightsOutputSchema = z.object({
  insights: z.array(
    z.object({
      type: z.enum(['positive', 'opportunity', 'warning']),
      message: z.string(),
    })
  ).describe('An array of 2-4 concise, actionable insights for the vendor.'),
});
export type VendorInsightsOutput = z.infer<typeof VendorInsightsOutputSchema>;

// Define a schema for the prompt that uses strings for complex data
const PromptInputSchema = VendorInsightsInputSchema.extend({
    popularItems: z.string(),
    topCustomers: z.string(),
    peakHours: z.string(),
    orderTypeBreakdown: z.string(),
});

export async function getVendorInsights(
  input: VendorInsightsInput
): Promise<VendorInsightsOutput> {
  // Basic validation to prevent calling the AI with empty data
  if (input.totalOrders === 0 && input.last7DaysExpenses === 0) {
    return {
      insights: [
        {
          type: 'positive',
          message: 'Welcome! Complete your first order or add an expense to start seeing business insights here.',
        },
      ],
    };
  }
  return getVendorInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'getVendorInsightsPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: VendorInsightsOutputSchema },
  prompt: `You are a friendly and encouraging business coach for a local food vendor.
Your goal is to provide 2-4 short, actionable, and easy-to-understand insights based on their recent performance data.
Focus on being encouraging and highlighting opportunities. Be very specific and use the numbers provided.

Here is the vendor's data:
- Total Revenue (all time): {{{totalRevenue}}}
- Total Orders (all time): {{{totalOrders}}}
- Pending Orders: {{{pendingOrdersCount}}}
- Average Order Value: {{{averageOrderValue}}}
- Expenses (last 7 days): {{{last7DaysExpenses}}}
- Customer Stats: {{{customerStats.new}}} new customers out of {{{customerStats.total}}} total.
- Popular Items (by quantity sold): {{{popularItems}}}
- Top Customers (by total spent): {{{topCustomers}}}
- Peak Hours (Orders per hour): {{{peakHours}}}
- Order Type Breakdown: {{{orderTypeBreakdown}}}

Analyze the data and provide 2-4 insights. Each insight must have a 'type' and a 'message'.
- Use 'positive' for good news and celebrating specific numbers (e.g., "Great job earning ₹{{{totalRevenue}}} in revenue!").
- Use 'opportunity' for actionable suggestions (e.g., "Your 'Burger' is selling well. Consider promoting it as a special.").
- Use 'warning' for gentle reminders or areas needing attention (e.g., "Your expenses of ₹{{{last7DaysExpenses}}} in the last week seem high compared to recent revenue. Consider reviewing ingredient costs.").

Keep messages concise (1-2 sentences). Do not use markdown or formatting in the message.

Example analysis and response structure:
- If total revenue is high, connect it to a popular item. Generate a 'positive' insight like: "You've earned ₹3000 in business recently, with 'Chapati' being a top seller. Fantastic work!"
- If you notice a period with very few orders from the 'Peak Hours' data, identify it and suggest an action. Generate an 'opportunity' insight like: "Mondays seem to be your slowest day. Consider running a special 'Monday Deal' to attract more customers."
- If new customers are high, generate a 'positive' insight about growth, like "You've gained {{{customerStats.new}}} new customers recently. That's fantastic growth!"
- If expenses are tracked, relate them to the business performance. If expenses are high relative to orders, generate a 'warning' like "You spent ₹{{{last7DaysExpenses}}} on expenses this week. Keep an eye on costs to maximize profit."

Generate your response now based on the provided data, ensuring you include specific revenue figures, actionable advice, and encouragement for growth.
`,
});

const getVendorInsightsFlow = ai.defineFlow(
  {
    name: 'getVendorInsightsFlow',
    inputSchema: VendorInsightsInputSchema,
    outputSchema: VendorInsightsOutputSchema,
  },
  async (input) => {
    // Pre-stringify the complex data before passing it to the prompt
    const promptInput = {
        ...input,
        popularItems: JSON.stringify(input.popularItems),
        topCustomers: JSON.stringify(input.topCustomers),
        peakHours: JSON.stringify(input.peakHours),
        orderTypeBreakdown: JSON.stringify(input.orderTypeBreakdown),
    };
    const { output } = await prompt(promptInput);
    return output!;
  }
);

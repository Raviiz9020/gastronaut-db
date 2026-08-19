/**
 * Utility functions for calculating customer fee savings compared to traditional food delivery platforms.
 * Traditional platforms charge:
 * 1. Platform / Convenience Fee: ~₹10.00
 * 2. Payment Gateway Charges: 2.0% MDR + 18% GST on MDR = 2.36%
 */

export const STANDARD_PLATFORM_FEE = 10.0;
export const GATEWAY_FEE_RATE = 0.0236; // 2.0% base + 18% GST = 2.36%

export interface FeeSavingsBreakdown {
  platformFee: number;
  gatewayFee: number;
  totalFeeSavings: number;
}

/**
 * Calculates the exact waived fee savings for a given order amount.
 */
export function calculateFeeSavings(orderAmount: number): FeeSavingsBreakdown {
  if (!orderAmount || orderAmount <= 0) {
    return {
      platformFee: STANDARD_PLATFORM_FEE,
      gatewayFee: 0,
      totalFeeSavings: STANDARD_PLATFORM_FEE,
    };
  }

  const platformFee = STANDARD_PLATFORM_FEE;
  // Calculate 2.36% gateway fee with a minimum of ₹3
  const gatewayFee = Math.max(3, Math.round(orderAmount * GATEWAY_FEE_RATE));
  const totalFeeSavings = platformFee + gatewayFee;

  return {
    platformFee,
    gatewayFee,
    totalFeeSavings,
  };
}

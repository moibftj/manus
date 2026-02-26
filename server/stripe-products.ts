/**
 * Stripe Products & Pricing Configuration
 * Talk-to-My-Lawyer — Legal Letter Generation Platform
 *
 * Pricing model:
 *  free_trial_review — $50 one-time: first-ever letter attorney review fee
 *  per_letter        — $200 one-time: pay-as-you-go (post-trial)
 *  starter           — $499/month: 4 letters/month, attorney review included
 *  professional      — $799/month: 8 letters/month, attorney review included
 *
 * First letter draft is FREE to generate.
 * Attorney review of the first draft costs $50.
 * All subsequent letters require a subscription or $200 per-letter payment.
 */

export interface PlanConfig {
  id: "free_trial_review" | "per_letter" | "starter" | "professional";
  isTrial?: boolean;
  name: string;
  description: string;
  price: number; // in cents
  interval: "one_time" | "month" | "year";
  lettersAllowed: number; // -1 = unlimited
  badge?: string;
  features: string[];
}

/** Price in cents for the free-trial attorney review ($50) */
export const TRIAL_REVIEW_PRICE_CENTS = 5000; // $50

/** Price in cents for a single pay-per-letter unlock ($200) */
export const LETTER_UNLOCK_PRICE_CENTS = 20000; // $200

export const PLANS: Record<string, PlanConfig> = {
  free_trial_review: {
    id: "free_trial_review",
    name: "Free Trial Review",
    description: "Attorney review of your first free draft",
    price: TRIAL_REVIEW_PRICE_CENTS, // $50
    interval: "one_time",
    lettersAllowed: 0,
    isTrial: true,
    features: [
      "Attorney review of your first draft",
      "Professional edits & approval",
      "Final approved PDF",
      "Email delivery",
    ],
  },
  per_letter: {
    id: "per_letter",
    name: "Pay Per Letter",
    description: "One professional legal letter, no commitment",
    price: LETTER_UNLOCK_PRICE_CENTS, // $200
    interval: "one_time",
    lettersAllowed: 1,
    features: [
      "1 professional legal letter",
      "Legal research & drafting",
      "Attorney review & approval",
      "Final approved PDF",
      "Email delivery",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    description: "4 attorney-reviewed letters per month",
    price: 49900, // $499/month
    interval: "month",
    lettersAllowed: 4,
    badge: "Most Popular",
    features: [
      "4 professional legal letters/month",
      "Attorney review included",
      "Legal research & drafting",
      "All letter types supported",
      "Final approved PDFs",
      "Email delivery",
      "Cancel anytime",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    description: "8 attorney-reviewed letters per month",
    price: 79900, // $799/month
    interval: "month",
    lettersAllowed: 8,
    badge: "Best Value",
    features: [
      "8 professional legal letters/month",
      "Priority attorney review",
      "Legal research & drafting",
      "All letter types supported",
      "Final approved PDFs",
      "Email delivery",
      "Dedicated support",
      "Save vs pay-per-letter",
    ],
  },
};

export const PLAN_LIST = Object.values(PLANS);

export function getPlanConfig(planId: string): PlanConfig | undefined {
  return PLANS[planId];
}

export function canSubmitLetter(
  plan: string,
  lettersAllowed: number,
  lettersUsed: number,
  status: string
): { allowed: boolean; reason?: string } {
  if (status !== "active") {
    return { allowed: false, reason: "No active subscription. Please subscribe to submit a letter." };
  }
  if (lettersAllowed === -1) {
    return { allowed: true }; // unlimited
  }
  if (lettersUsed >= lettersAllowed) {
    return {
      allowed: false,
      reason: `You have used all ${lettersAllowed} letter(s) in your ${plan} plan. Please upgrade to continue.`,
    };
  }
  return { allowed: true };
}

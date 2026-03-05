export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type ActiveSubscriptionStatus = Extract<
  SubscriptionStatus,
  "active" | "trialing" | "past_due"
>;

export const ACTIVE_STATUSES: ActiveSubscriptionStatus[] = [
  "active",
  "trialing",
  "past_due"
];

export const MAX_SUBSCRIPTIONS = 6;

export interface ActiveSubscription {
  _id: string;
  userId: string;
  clerkUserId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: ActiveSubscriptionStatus;
  productId?: string;
  priceId?: string;
  planType: string;
  productName?: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd?: boolean;
  gptIds: string[];
  maxGpts?: number;
  trialEndDate?: number;
  paymentFailureGracePeriodEnd?: number;
  lastPaymentFailedAt?: number;
  canceledAt?: number;
  created: number;
}

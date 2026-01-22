// lib/subscription-gpt-types.ts
/**
 * Type definitions for the subscription-based GPT selection system
 */

import { Id } from "@/convex/_generated/dataModel";

/**
 * Stripe subscription stored in user record
 */
export type UserSubscription = {
  status:
    | "active"
    | "canceled"
    | "past_due"
    | "trialing"
    | "incomplete"
    | "incomplete_expired"
    | "unpaid";
  stripeSubscriptionId: string;
  plan: "sandbox" | "clientProject" | "basic" | "pro";
  priceId: string;
  productName?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  maxGpts: number;
  gptIds: string[];
};

/**
 * User record from Convex
 */
export type ConvexUser = {
  _id: Id<"users">;
  _creationTime: number;
  clerkId: string;
  email: string;
  name?: string;
  role: "admin" | "user";
  stripeCustomerId?: string;
  subscription?: UserSubscription;
  aiCredits?: number;
  createdAt: number;
  updatedAt: number;
};

/**
 * Package record from Convex
 */
export type Package = {
  _id: Id<"packages">;
  _creationTime: number;
  name: string;
  key: string;
  tier: "paid" | "trial" | "free";
  stripePriceId: string;
  maxGpts: number;
  priceAmount?: number;
  recurring?: string;
  description: string;
  features?: string[];
  durationDays?: number;
};

/**
 * GPT record from Convex
 */
export type Gpt = {
  _id: Id<"gpts">;
  _creationTime: number;
  gptId: string;
  model: string;
  apiKey?: string;
  packageId?: Id<"packages">;
  vectorStoreId?: string;
  pdfFiles?: Array<{
    fileName: string;
    openaiFileId: string;
    uploadedAt: number;
  }>;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
};

/**
 * Result from getSubscriptionGpts query
 */
export type SubscriptionGpts = Gpt[];

/**
 * Hook return type for useSubscriptionGpts
 */
export type UseSubscriptionGptsResult = {
  gpts: Gpt[];
  isLoading: boolean;
  isEmpty: boolean;
};

/**
 * Context needed for GPT selection
 */
export type GptSelectionContext = {
  user: ConvexUser;
  subscription: UserSubscription;
  package: Package;
  gpts: Gpt[];
};

/**
 * Error states for GPT selection
 */
export type GptSelectionError =
  | "no_user"
  | "no_subscription"
  | "subscription_inactive"
  | "package_not_found"
  | "no_gpts"
  | "unauthorized";

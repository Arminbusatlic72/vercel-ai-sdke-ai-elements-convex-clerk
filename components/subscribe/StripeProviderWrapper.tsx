// 📁 components/subscribe/StripeProviderWrapper.tsx
"use client";

import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ReactNode } from "react";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface StripeProviderWrapperProps {
  children: ReactNode;
}

export default function StripeProviderWrapper({
  children
}: StripeProviderWrapperProps) {
  return <Elements stripe={stripePromise}>{children}</Elements>;
}

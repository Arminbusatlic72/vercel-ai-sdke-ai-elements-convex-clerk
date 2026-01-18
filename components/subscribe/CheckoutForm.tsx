"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { PACKAGES } from "@/lib/packages";
import type { PackageId } from "@/lib/packages";
import PackageGrid from "./PackageGrid";
import PaymentSection from "./PaymentSection";
import FreePackageSection from "./FreePackageSection";
import SuccessMessage from "./SuccessMessage";
import TrustIndicators from "./TrustIndicators";

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useUser();
  const router = useRouter();

  const [selectedPackage, setSelectedPackage] =
    useState<PackageId>("clientProject");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [activatingFree, setActivatingFree] = useState(false);

  const currentPackage = PACKAGES[selectedPackage];

  const handlePaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user) return;

    setLoading(true);
    setError("");

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: stripeError, paymentMethod } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: {
            email: user.primaryEmailAddress?.emailAddress,
            name: user.fullName || "AI Sandbox User"
          }
        });

      if (stripeError)
        throw new Error(stripeError.message || "Card validation failed");

      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user.id,
          stripePaymentMethodId: paymentMethod.id,
          priceId: currentPackage.priceId!,
          email: user.primaryEmailAddress?.emailAddress
        })
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Subscription creation failed");

      if (result.requiresAction) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.clientSecret
        );
        if (confirmError) throw new Error(confirmError.message);
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard?welcome=true"), 2000);
    } catch (err: any) {
      console.error("Subscription error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFreeActivation = async () => {
    if (!user) return;

    setActivatingFree(true);
    setError("");

    try {
      const response = await fetch("/api/activate-free-package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user.id,
          packageId: selectedPackage,
          duration: currentPackage.duration,
          maxGpts: currentPackage.maxGpts,
          gptIds: currentPackage.gptIds,
          aiCredits: currentPackage.aiCredits
        })
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to activate free package");

      setSuccess(true);
      setTimeout(() => router.push("/dashboard?welcome=true"), 2000);
    } catch (err: any) {
      console.error("Free package activation error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setActivatingFree(false);
    }
  };

  if (success) {
    return (
      <SuccessMessage
        packageName={currentPackage.name}
        isPaid={currentPackage.isPaid}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Choose Your AI Sandbox Plan
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Select from our range of professional and educational packages
        </p>
      </div>

      <PackageGrid
        selectedPackage={selectedPackage}
        onSelectPackage={setSelectedPackage}
      />

      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {currentPackage.isPaid ? "Payment Details" : "Package Details"}
        </h2>
        <p className="text-gray-600 mb-8">
          {currentPackage.isPaid
            ? `Enter your card information to start your ${currentPackage.name} plan`
            : `Activate your free ${currentPackage.name} package`}
        </p>

        {currentPackage.isPaid ? (
          <PaymentSection
            currentPackage={currentPackage}
            onSubmit={handlePaidSubmit}
            loading={loading}
            error={error}
            stripeEnabled={!!stripe}
          />
        ) : (
          <FreePackageSection
            currentPackage={currentPackage}
            onActivate={handleFreeActivation}
            loading={activatingFree}
            error={error}
          />
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          🔒 Secure payment by Stripe. Your card details are never stored on our
          servers.
        </p>
      </div>

      <TrustIndicators />
    </div>
  );
}

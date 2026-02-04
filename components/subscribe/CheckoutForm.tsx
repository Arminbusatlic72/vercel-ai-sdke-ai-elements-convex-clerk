"use client";
import { api } from "@/convex/_generated/api";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { useQuery } from "convex/react";
import PackageGrid from "./PackageGrid";
import PaymentSection from "./PaymentSection";
import FreePackageSection from "./FreePackageSection";
import SuccessMessage from "./SuccessMessage";
import TrustIndicators from "./TrustIndicators";
import { Package } from "@/lib/types";

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useUser();
  const router = useRouter();

  const packages: Package[] = useQuery(api.packages.getAllPackages) || [];

  const activePackages: Package[] = packages
    .filter((pkg) => pkg.stripePriceId)
    .sort((a, b) => {
      const aPrice = a.priceAmount || 0;
      const bPrice = b.priceAmount || 0;

      if (aPrice > 0 && bPrice === 0) return -1;
      if (aPrice === 0 && bPrice > 0) return 1;
      return bPrice - aPrice;
    });

  const defaultPackage =
    activePackages.find(
      (pkg) => (pkg.priceAmount || 0) > 0 || pkg.key === "client-project"
    ) || activePackages[0];

  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (defaultPackage?._id && !selectedPackageId) {
      setSelectedPackageId(defaultPackage._id);
    }
  }, [defaultPackage, selectedPackageId]);

  const selectedPackage = activePackages.find(
    (pkg) => pkg._id === selectedPackageId
  );

  const handlePaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !user || !selectedPackage) {
      setError("Payment system not ready. Please try again.");
      return;
    }

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

      // In CheckoutForm.tsx - handlePaidSubmit function
      const response = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user.id,
          stripePaymentMethodId: paymentMethod.id,
          priceId: selectedPackage.stripePriceId,
          packageId: selectedPackage._id,
          packageKey: selectedPackage.key, // Add this
          email: user.primaryEmailAddress?.emailAddress,
          maxGpts: selectedPackage.maxGpts, // Add this
          tier: selectedPackage.tier // Add this
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
      // Add success parameter to URL
      setTimeout(() => router.push("/dashboard?success=true"), 1500);
    } catch (err: any) {
      console.error("Subscription error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFreeActivation = async () => {
    if (!user || !selectedPackage) return;

    setLoading(true);
    setError("");

    try {
      // In CheckoutForm.tsx - handleFreeActivation function
      const response = await fetch("/api/stripe/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkUserId: user.id,
          stripePaymentMethodId: null,
          priceId: selectedPackage.stripePriceId,
          packageId: selectedPackage._id,
          packageKey: selectedPackage.key, // Add this
          email: user.primaryEmailAddress?.emailAddress,
          maxGpts: selectedPackage.maxGpts, // Add this
          tier: selectedPackage.tier, // Add this
          trialPeriod:
            selectedPackage.durationDays ||
            (selectedPackage.tier === "trial" ? 30 : undefined)
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to activate package");
      }

      setSuccess(true);
      // Add success parameter to URL
      setTimeout(() => router.push("/dashboard?success=true"), 1500);
    } catch (err: any) {
      console.error("Package activation error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!activePackages.length) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success && selectedPackage) {
    return (
      <SuccessMessage
        packageName={selectedPackage.name}
        isPaid={(selectedPackage.priceAmount || 0) > 0}
      />
    );
  }

  if (!selectedPackage) return null;

  const isPaidPackage = (selectedPackage.priceAmount || 0) > 0;

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
        packages={activePackages}
        selectedPackageId={selectedPackageId || ""}
        onSelectPackage={setSelectedPackageId}
      />

      <div className="bg-white border border-gray-200 rounded-xl p-8 mt-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {selectedPackage.name} Details
          </h2>
          <p className="text-gray-600">
            {isPaidPackage
              ? `Enter your payment information to start your ${selectedPackage.name} plan`
              : `Activate your ${selectedPackage.tier === "trial" ? "trial" : "free"} ${selectedPackage.name} package`}
          </p>
        </div>

        {isPaidPackage ? (
          <PaymentSection
            currentPackage={selectedPackage}
            onSubmit={handlePaidSubmit}
            loading={loading}
            error={error}
            stripeEnabled={!!stripe}
          />
        ) : (
          <FreePackageSection
            currentPackage={selectedPackage}
            onActivate={handleFreeActivation}
            loading={loading}
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

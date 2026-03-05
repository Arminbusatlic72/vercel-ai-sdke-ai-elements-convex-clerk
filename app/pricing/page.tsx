import StripeProviderWrapper from "@/components/subscribe/StripeProviderWrapper";
import CheckoutForm from "@/components/subscribe/CheckoutForm";

export default function PricingPage() {
  return (
    <StripeProviderWrapper>
      <CheckoutForm />
    </StripeProviderWrapper>
  );
}

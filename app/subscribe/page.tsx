import StripeProviderWrapper from "@/components/subscribe/StripeProviderWrapper";
import CheckoutForm from "@/components/subscribe/CheckoutForm";

export default function SubscribePage() {
  return (
    <StripeProviderWrapper>
      <CheckoutForm />
    </StripeProviderWrapper>
  );
}

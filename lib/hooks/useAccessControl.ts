import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function useAccessControl(subscriptionData: any) {
  const router = useRouter();
  const checkedRef = useRef(false);

  useEffect(() => {
    if (!subscriptionData || checkedRef.current) return;

    checkedRef.current = true;

    const isAdmin = subscriptionData.role === "admin";
    const hasSub = !!subscriptionData.subscription;

    if (!hasSub && !isAdmin) {
      router.push("/subscribe");
    }
  }, [subscriptionData, router]);
}

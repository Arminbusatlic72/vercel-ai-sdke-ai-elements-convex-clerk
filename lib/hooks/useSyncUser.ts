import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useSyncUser() {
  const { user, isLoaded } = useUser();
  const syncUser = useMutation(api.users.syncCurrentUser);

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !user || hasSyncedRef.current) return;

    hasSyncedRef.current = true;
    syncUser().catch(() => {
      hasSyncedRef.current = false;
    });
  }, [isLoaded, user, syncUser]);
}

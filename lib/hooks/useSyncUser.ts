import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const SYNC_TIMEOUT_MS = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000; // 2 seconds

export function useSyncUser() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const syncUser = useMutation(api.users.syncCurrentUser);

  const hasSyncedRef = useRef(false);
  const isSyncingRef = useRef(false);
  const retryCountRef = useRef(0);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  const [syncError, setSyncError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    // Early returns for invalid states
    if (!isUserLoaded || !user) {
      return;
    }

    if (hasSyncedRef.current || isSyncingRef.current) {
      return;
    }

    const performSync = async () => {
      isSyncingRef.current = true;
      setSyncError(null);

      // Setup timeout
      timeoutIdRef.current = setTimeout(() => {
        if (isSyncingRef.current && !hasSyncedRef.current) {
          console.error("⏱️ Sync timeout - mutation took too long");
          isSyncingRef.current = false;
          handleSyncFailure("Sync operation timed out");
        }
      }, SYNC_TIMEOUT_MS);

      try {
        const updatedUser = await syncUser();

        // Clear timeout on success
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }

        console.log("✅ User synced to Convex:", updatedUser);
        hasSyncedRef.current = true;
        isSyncingRef.current = false;
        retryCountRef.current = 0;
        setSyncError(null);
        setIsRetrying(false);
      } catch (error) {
        // Clear timeout on error
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }

        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.error("❌ Failed to sync user:", errorMessage);
        isSyncingRef.current = false;
        handleSyncFailure(errorMessage);
      }
    };

    const handleSyncFailure = (errorMessage: string) => {
      retryCountRef.current += 1;

      if (retryCountRef.current < MAX_RETRY_ATTEMPTS) {
        console.log(
          `🔄 Retrying sync (${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})...`
        );
        setIsRetrying(true);
        setSyncError(
          `Retrying... (${retryCountRef.current}/${MAX_RETRY_ATTEMPTS})`
        );

        setTimeout(() => {
          isSyncingRef.current = false; // Reset syncing flag to allow retry
          setIsRetrying(false);
        }, RETRY_DELAY_MS);
      } else {
        console.error("❌ Max retry attempts reached");
        setSyncError(errorMessage);
        setIsRetrying(false);
      }
    };

    performSync();

    // Cleanup timeout on unmount
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [isUserLoaded, user, syncUser, isRetrying]);

  return {
    isSynced: hasSyncedRef.current,
    isSyncing: isSyncingRef.current,
    isUserLoaded,
    user,
    syncError,
    isRetrying,
    retryCount: retryCountRef.current
  };
}

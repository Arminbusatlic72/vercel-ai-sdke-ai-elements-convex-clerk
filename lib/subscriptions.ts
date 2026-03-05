import { ActiveSubscription } from "@/types/subscriptions";

export function userHasAccessToGpt(
  subscriptions: ActiveSubscription[],
  gptId: string
): boolean {
  return subscriptions.some((subscription) =>
    (subscription.gptIds || []).includes(gptId)
  );
}

export function getMergedGptAccess(
  subscriptions: ActiveSubscription[]
): string[] {
  const merged = new Set<string>();

  for (const subscription of subscriptions) {
    for (const gptId of subscription.gptIds || []) {
      merged.add(gptId);
    }
  }

  return Array.from(merged);
}

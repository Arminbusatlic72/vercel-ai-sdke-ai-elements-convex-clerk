import Link from "next/link";
import { useMemo } from "react";

type UserSubscription = {
  status?: string;
  gptIds?: string[];
};

const cards = [
  { title: "Start a Chat", description: "Ask questions instantly." },
  { title: "Create Project", description: "Organize conversations." },
  { title: "Browse History", description: "Revisit chats anytime." },
  { title: "Manage Settings", description: "Customize experience." }
];

export default function QuickActions({
  subscriptions
}: {
  subscriptions?: UserSubscription[];
}) {
  const startChatHref = useMemo(() => {
    const activeStatuses = new Set(["active", "trialing", "past_due"]);
    const activeSubscriptions = (subscriptions ?? []).filter((subscription) =>
      activeStatuses.has(subscription.status ?? "")
    );

    const firstSubscribedGptId = activeSubscriptions
      .flatMap((subscription) => subscription.gptIds ?? [])
      .find(Boolean);

    if (firstSubscribedGptId) {
      return `/gpt5/${firstSubscribedGptId}`;
    }

    return "/subscribe";
  }, [subscriptions]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Quick Actions</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => {
          const isStartChat = card.title === "Start a Chat";

          if (isStartChat) {
            return (
              <Link
                key={card.title}
                href={startChatHref}
                className="rounded-xl border p-4 text-center hover:bg-muted transition cursor-pointer block"
              >
                <h3 className="font-medium">{card.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </Link>
            );
          }

          return (
            <div
              key={card.title}
              className="rounded-xl border p-4 text-center hover:bg-muted transition cursor-pointer"
            >
              <h3 className="font-medium">{card.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

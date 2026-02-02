const cards = [
  { title: "Start a Chat", description: "Ask questions instantly." },
  { title: "Create Project", description: "Organize conversations." },
  { title: "Browse History", description: "Revisit chats anytime." },
  { title: "Manage Settings", description: "Customize experience." }
];

export default function QuickActions() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Quick Actions</h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded-xl border p-4 text-center hover:bg-muted transition cursor-pointer"
          >
            <h3 className="font-medium">{card.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

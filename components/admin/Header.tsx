interface HeaderProps {
  gptCount: number;
}

export function Header({ gptCount }: HeaderProps) {
  return (
    <header className="mb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GPT Manager</h1>
          <p className="text-gray-600 mt-2">
            Create and manage your custom GPT instances
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>{gptCount} GPTs configured</span>
        </div>
      </div>
    </header>
  );
}

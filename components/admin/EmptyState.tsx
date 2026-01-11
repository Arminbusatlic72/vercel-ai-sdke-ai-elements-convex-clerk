interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      {icon && (
        <div className="w-16 h-16 mx-auto mb-4 text-gray-300">{icon}</div>
      )}
      <p className="text-gray-500">{title}</p>
      <p className="text-sm text-gray-400 mt-1">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

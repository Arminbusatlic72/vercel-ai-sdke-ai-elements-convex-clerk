"use client";

interface SuccessMessageProps {
  packageName: string;
  isPaid: boolean;
}

export default function SuccessMessage({
  packageName,
  isPaid
}: SuccessMessageProps) {
  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <div className="animate-pulse">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {isPaid ? "Subscription Activated!" : "Free Package Activated!"} 🎉
        </h2>
        <p className="text-gray-600">
          Welcome to {packageName}! Redirecting to your dashboard...
        </p>
      </div>
    </div>
  );
}

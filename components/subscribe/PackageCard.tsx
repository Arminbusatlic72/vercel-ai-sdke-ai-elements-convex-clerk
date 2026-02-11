// components/subscribe/PackageCard.tsx
import { Package } from "@/lib/types";

interface PackageCardProps {
  package: Package;
  isSelected: boolean;
  onSelect: () => void;
}

export default function PackageCard({
  package: pkg,
  isSelected,
  onSelect
}: PackageCardProps) {
  const formatPrice = () => {
    if (pkg.priceAmount === 0) {
      if (pkg.tier === "trial") {
        return `Free ${pkg.durationDays || 30}-Day Trial`;
      }
      return "Free";
    }

    const dollars = (pkg.priceAmount ?? 0) / 100;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(dollars);

    const recurring =
      pkg.recurring === "monthly" ? "/month" : `/${pkg.durationDays} days`;
    return `${formatted}${recurring}`;
  };

  return (
    <div
      className={`border rounded-xl p-6 cursor-pointer transition-all h-full flex flex-col ${
        isSelected
          ? "border-black-500 ring-2 ring-black-200 bg-black-50"
          : "border-black-200 hover:border-gray-300 hover:shadow-md"
      } ${pkg.description ? "border-2 border-black-400" : ""}`}
      onClick={onSelect}
    >
      {pkg.description && (
        <div className="mb-4">
          {/* <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
            POPULAR
          </span> */}
        </div>
      )}

      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
        <p className="text-gray-600 mb-4 text-sm">{pkg.description}</p>

        <div className="mb-4">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {formatPrice()}
          </div>
          {pkg.priceAmount! > 0 && (
            <div className="text-sm text-gray-500">Billed {pkg.recurring}</div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-black-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-black-600 font-bold">{pkg.maxGpts}</span>
            </div>
            <span className="text-sm font-medium text-gray-700">
              {pkg.maxGpts} GPT{pkg.maxGpts !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="space-y-2">
            {pkg.features?.slice(0, 3).map((feature, idx) => (
              <div key={idx} className="flex items-start">
                <svg
                  className="w-4 h-4 text-green-500 mt-0.5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-600">{feature}</span>
              </div>
            ))}
            {pkg.features && pkg.features.length > 3 && (
              <div className="text-sm text-gray-500">
                +{pkg.features.length - 3} more features
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
          isSelected
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-100 text-gray-800 hover:bg-gray-200"
        }`}
        onClick={onSelect}
      >
        {isSelected ? "Selected" : "Select Plan"}
      </button>
    </div>
  );
}

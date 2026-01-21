// "use client";

// import { Package } from "@/lib/packages";
// import { getColorClasses } from "@/lib/utils";
// import { Check, Zap, Calendar } from "lucide-react";

// interface PackageCardProps {
//   package: Package;
//   isSelected: boolean;
//   onSelect: () => void;
// }

// export default function PackageCard({
//   package: pkg,
//   isSelected,
//   onSelect
// }: PackageCardProps) {
//   return (
//     <div
//       onClick={onSelect}
//       className={`border-2 rounded-xl p-6 cursor-pointer transition-all h-full flex flex-col ${
//         isSelected
//           ? "border-blue-500 bg-blue-50"
//           : "border-gray-200 hover:border-gray-300"
//       }`}
//     >
//       <div className="flex justify-between items-start mb-4">
//         <div className="flex items-center gap-3">
//           <div
//             className={`p-2 rounded-lg ${getColorClasses(pkg.color).split(" ")[1]}`}
//           >
//             {pkg.icon}
//           </div>
//           <div>
//             <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
//             <span
//               className={`text-xs font-medium px-2 py-1 rounded-full ${getColorClasses(pkg.color)}`}
//             >
//               {pkg.badge}
//             </span>
//           </div>
//         </div>
//         {isSelected && (
//           <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
//             Selected
//           </div>
//         )}
//       </div>

//       <p className="text-gray-600 mb-4 flex-grow">{pkg.description}</p>

//       <div className="mb-4">
//         <div className="flex items-center gap-2 mb-2">
//           <Zap className="w-4 h-4 text-gray-500" />
//           <span className="font-medium">{pkg.maxGpts} GPUs</span>
//         </div>
//         <div className="flex items-center gap-2 mb-2">
//           <Calendar className="w-4 h-4 text-gray-500" />
//           <span className="font-medium">{pkg.duration}</span>
//         </div>
//         {pkg.isPaid && pkg.monthlyPrice && (
//           <div className="text-3xl font-bold text-gray-900">
//             ${pkg.monthlyPrice}
//             <span className="text-lg text-gray-600 ml-1">/month</span>
//           </div>
//         )}
//       </div>

//       <ul className="space-y-2 mb-6">
//         {pkg.features.slice(0, 4).map((feature, idx) => (
//           <li key={idx} className="flex items-start text-sm">
//             <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
//             <span>{feature}</span>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }

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
  // Format price for display
  const formatPrice = () => {
    if (pkg.priceAmount === 0) {
      if (pkg.tier === "trial") {
        return `Free ${pkg.duration || 30}-Day Trial`;
      }
      return "Free";
    }

    const dollars = pkg.priceAmount / 100;
    const recurring = pkg.recurring === "monthly" ? "/month" : "/year";
    return `$${dollars}${recurring}`;
  };

  return (
    <div
      className={`border rounded-xl p-6 cursor-pointer transition-all h-full flex flex-col ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-200 bg-blue-50"
          : "border-gray-200 hover:border-gray-300 hover:shadow-md"
      } ${pkg.highlight ? "border-2 border-yellow-400" : ""}`}
      onClick={onSelect}
    >
      {pkg.highlight && (
        <div className="mb-4">
          <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
            POPULAR
          </span>
        </div>
      )}

      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2">{pkg.name}</h3>
        <p className="text-gray-600 mb-4 text-sm">{pkg.description}</p>

        <div className="mb-4">
          <div className="text-3xl font-bold text-gray-900 mb-1">
            {formatPrice()}
          </div>
          {pkg.priceAmount > 0 && (
            <div className="text-sm text-gray-500">Billed {pkg.recurring}</div>
          )}
        </div>

        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 font-bold">{pkg.maxGpts}</span>
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

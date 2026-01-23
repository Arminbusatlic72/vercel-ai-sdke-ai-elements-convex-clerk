// "use client";

// import { Package } from "@/lib/packages";
// import { Check, Zap, Calendar, Cpu } from "lucide-react";

// interface FreePackageSectionProps {
//   currentPackage: Package;
//   onActivate: () => void;
//   loading: boolean;
//   error: string;
// }

// export default function FreePackageSection({
//   currentPackage,
//   onActivate,
//   loading,
//   error
// }: FreePackageSectionProps) {
//   return (
//     <div>
//       {/* Package Details */}
//       <div className="mb-8 p-6 bg-gray-50 rounded-lg">
//         <div className="grid grid-cols-2 gap-4 mb-6">
//           <div className="space-y-2">
//             <div className="flex items-center gap-2">
//               <Zap className="w-4 h-4 text-gray-500" />
//               <span className="font-medium">GPUs:</span>
//               <span>{currentPackage.maxGpts}</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <Calendar className="w-4 h-4 text-gray-500" />
//               <span className="font-medium">Duration:</span>
//               <span>{currentPackage.duration}</span>
//             </div>
//           </div>
//           <div className="space-y-2">
//             <div className="flex items-center gap-2">
//               <Cpu className="w-4 h-4 text-gray-500" />
//               <span className="font-medium">AI Credits:</span>
//               <span>{currentPackage.aiCredits.toLocaleString()}</span>
//             </div>
//             <div className="flex items-center gap-2">
//               <Check className="w-4 h-4 text-gray-500" />
//               <span className="font-medium">Price:</span>
//               <span className="text-green-600 font-bold">FREE</span>
//             </div>
//           </div>
//         </div>

//         <h4 className="font-medium text-gray-900 mb-3">Features:</h4>
//         <ul className="space-y-2">
//           {currentPackage.features.map((feature, idx) => (
//             <li key={idx} className="flex items-start text-sm">
//               <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
//               <span>{feature}</span>
//             </li>
//           ))}
//         </ul>
//       </div>

//       {/* Error Message */}
//       {error && (
//         <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
//           <p className="text-red-700">{error}</p>
//         </div>
//       )}

//       {/* Activate Button */}
//       <button
//         onClick={onActivate}
//         disabled={loading}
//         className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
//       >
//         {loading ? (
//           <span className="flex items-center justify-center">
//             <svg
//               className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
//               xmlns="http://www.w3.org/2000/svg"
//               fill="none"
//               viewBox="0 0 24 24"
//             >
//               <circle
//                 className="opacity-25"
//                 cx="12"
//                 cy="12"
//                 r="10"
//                 stroke="currentColor"
//                 strokeWidth="4"
//               />
//               <path
//                 className="opacity-75"
//                 fill="currentColor"
//                 d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
//               />
//             </svg>
//             Activating...
//           </span>
//         ) : (
//           `Activate ${currentPackage.name}`
//         )}
//       </button>
//     </div>
//   );
// }

// components/subscribe/FreePackageSection.tsx
import { Package } from "@/lib/types"; // Adjust import based on your setup

interface FreePackageSectionProps {
  currentPackage: Package;
  onActivate: () => Promise<void>;
  loading: boolean;
  error: string;
}

export default function FreePackageSection({
  currentPackage,
  onActivate,
  loading,
  error
}: FreePackageSectionProps) {
  // Format duration for display
  const formatDuration = () => {
    if (!currentPackage.durationDays) return "";
    if (currentPackage.durationDays === 1) return "1 day";
    if (currentPackage.durationDays < 30)
      return `${currentPackage.durationDays} days`;
    if (currentPackage.durationDays === 30) return "1 month";
    if (currentPackage.durationDays === 90) return "3 months";
    if (currentPackage.durationDays === 150) return "5 months";
    const months = Math.floor(currentPackage.durationDays / 30);
    return `${months} month${months > 1 ? "s" : ""}`;
  };

  return (
    <div className="space-y-6">
      {/* Package Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold text-gray-900">
              {currentPackage.name}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {currentPackage.description}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">Free</div>
            {currentPackage.durationDays && (
              <div className="text-sm text-gray-500 mt-1">
                {formatDuration()} access
              </div>
            )}
          </div>
        </div>

        {/* Features List */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center">
            <svg
              className="w-5 h-5 text-green-500 mr-3"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm">
              {currentPackage.maxGpts} GPT
              {currentPackage.maxGpts !== 1 ? "s" : ""}
            </span>
          </div>
          {currentPackage.features?.map((feature, idx) => (
            <div key={idx} className="flex items-center">
              <svg
                className="w-5 h-5 text-green-500 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Trial Notice */}
      {currentPackage.tier === "trial" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg
              className="w-5 h-5 text-yellow-500 mr-3 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="font-semibold text-yellow-800">Trial Period</h4>
              <p className="text-yellow-700 text-sm mt-1">
                This is a {currentPackage.durationDays || 30}-day trial. No
                payment required now.
                {currentPackage.recurring === "monthly" &&
                  " After trial, converts to paid monthly subscription."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Activate Button */}
      <button
        onClick={onActivate}
        disabled={loading}
        className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Activating...
          </>
        ) : currentPackage.tier === "trial" ? (
          `Start ${currentPackage.durationDays || 30}-Day Free Trial`
        ) : (
          "Activate Free Package"
        )}
      </button>

      {/* No Payment Required Notice */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
          <span>No payment required • No credit card needed</span>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { CardElement } from "@stripe/react-stripe-js";
// import { Package } from "@/lib/packages";

// interface PaymentSectionProps {
//   currentPackage: Package;
//   onSubmit: (e: React.FormEvent) => void;
//   loading: boolean;
//   error: string;
//   stripeEnabled: boolean;
// }

// export default function PaymentSection({
//   currentPackage,
//   onSubmit,
//   loading,
//   error,
//   stripeEnabled
// }: PaymentSectionProps) {
//   return (
//     <form onSubmit={onSubmit}>
//       {/* Card Element */}
//       <div className="mb-8">
//         <label className="block text-sm font-medium text-gray-700 mb-3">
//           Credit or debit card
//         </label>
//         <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
//           <CardElement
//             options={{
//               style: {
//                 base: {
//                   fontSize: "16px",
//                   color: "#424770",
//                   "::placeholder": { color: "#aab7c4" },
//                   iconColor: "#667eea"
//                 },
//                 invalid: { color: "#9e2146" }
//               },
//               hidePostalCode: true
//             }}
//           />
//         </div>

//         {/* Test Card Info */}
//         <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
//           <p className="text-sm font-medium text-yellow-800 mb-2">
//             🧪 Testing Card Numbers
//           </p>
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
//             <div>
//               <code className="bg-gray-100 px-2 py-1 rounded">
//                 4242 4242 4242 4242
//               </code>
//               <p className="text-gray-600 text-xs mt-1">Visa (success)</p>
//             </div>
//             <div>
//               <code className="bg-gray-100 px-2 py-1 rounded">
//                 4000 0000 0000 3220
//               </code>
//               <p className="text-gray-600 text-xs mt-1">3D Secure</p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Order Summary */}
//       <div className="border-t border-gray-200 pt-6 mb-8">
//         <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
//         <div className="space-y-3">
//           <div className="flex justify-between">
//             <span className="text-gray-600">{currentPackage.name}</span>
//             <span className="font-medium">
//               ${currentPackage.monthlyPrice}/month
//             </span>
//           </div>
//           {currentPackage.hasTrial && (
//             <div className="flex justify-between text-green-600">
//               <span>30-day free trial</span>
//               <span className="font-medium">$0 first month</span>
//             </div>
//           )}
//           <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
//             <span>Total</span>
//             <span>
//               {currentPackage.hasTrial
//                 ? "$0 first month"
//                 : `${currentPackage.monthlyPrice}/month`}
//             </span>
//           </div>
//         </div>
//       </div>

//       {/* Error Message */}
//       {error && (
//         <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
//           <p className="text-red-700">{error}</p>
//         </div>
//       )}

//       {/* Submit Button */}
//       <button
//         type="submit"
//         disabled={!stripeEnabled || loading}
//         className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
//             Processing...
//           </span>
//         ) : currentPackage.hasTrial ? (
//           "Start 30-Day Free Trial"
//         ) : (
//           "Subscribe Now"
//         )}
//       </button>
//     </form>
//   );
// }

// components/subscribe/PaymentSection.tsx
import { CardElement } from "@stripe/react-stripe-js";
import { Package } from "@/lib/types"; // Adjust import based on your setup

interface PaymentSectionProps {
  currentPackage: Package;
  onSubmit: (e: React.FormEvent) => Promise<void>;
  loading: boolean;
  error: string;
  stripeEnabled: boolean;
}

export default function PaymentSection({
  currentPackage,
  onSubmit,
  loading,
  error,
  stripeEnabled
}: PaymentSectionProps) {
  // Format price for display
  const formatPrice = () => {
    const dollars = currentPackage.priceAmount! / 100;
    const recurring = currentPackage.recurring === "one-time" ? "" : "";

    return `$${dollars}${recurring}`;
  };
  const recurring = currentPackage.recurring as
    | "monthly"
    | "yearly"
    | "one-time";

  return (
    <form onSubmit={onSubmit}>
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
              <div className="text-2xl font-bold text-gray-900">
                {formatPrice()}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {currentPackage.maxGpts} GPT
                {currentPackage.maxGpts !== 1 ? "s" : ""} included
              </div>
            </div>
          </div>
        </div>

        {/* Card Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Card details
          </label>
          <div className="border border-gray-300 rounded-lg p-4 bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: "16px",
                    color: "#424770",
                    "::placeholder": {
                      color: "#aab7c4"
                    },
                    fontFamily:
                      "ui-sans-serif, system-ui, -apple-system, sans-serif"
                  },
                  invalid: {
                    color: "#9e2146"
                  }
                },
                hidePostalCode: true
              }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Your card will be charged {formatPrice()} immediately. Cancel
            anytime.
          </p>
        </div>

        {/* Billing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email address
            </label>
            <input
              type="email"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={currentPackage.priceAmount! > 0 ? formatPrice() : "Free"}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Billing cycle
            </label>
            <input
              type="text"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={
                recurring === "monthly"
                  ? "Monthly"
                  : recurring === "yearly"
                    ? "Yearly"
                    : "One-time"
              }
              disabled
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !stripeEnabled}
          className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
              Processing...
            </>
          ) : (
            `Subscribe Now for ${formatPrice()}`
          )}
        </button>

        {/* Security Notice */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Secure 256-bit SSL encryption</span>
          </div>
        </div>
      </div>
    </form>
  );
}

"use client";

import { CardElement } from "@stripe/react-stripe-js";
import { Package } from "@/lib/packages";

interface PaymentSectionProps {
  currentPackage: Package;
  onSubmit: (e: React.FormEvent) => void;
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
  return (
    <form onSubmit={onSubmit}>
      {/* Card Element */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Credit or debit card
        </label>
        <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: "16px",
                  color: "#424770",
                  "::placeholder": { color: "#aab7c4" },
                  iconColor: "#667eea"
                },
                invalid: { color: "#9e2146" }
              },
              hidePostalCode: true
            }}
          />
        </div>

        {/* Test Card Info */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            🧪 Testing Card Numbers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">
                4242 4242 4242 4242
              </code>
              <p className="text-gray-600 text-xs mt-1">Visa (success)</p>
            </div>
            <div>
              <code className="bg-gray-100 px-2 py-1 rounded">
                4000 0000 0000 3220
              </code>
              <p className="text-gray-600 text-xs mt-1">3D Secure</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Summary */}
      <div className="border-t border-gray-200 pt-6 mb-8">
        <h3 className="font-medium text-gray-900 mb-4">Order Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">{currentPackage.name}</span>
            <span className="font-medium">
              ${currentPackage.monthlyPrice}/month
            </span>
          </div>
          {currentPackage.hasTrial && (
            <div className="flex justify-between text-green-600">
              <span>30-day free trial</span>
              <span className="font-medium">$0 first month</span>
            </div>
          )}
          <div className="border-t border-gray-200 pt-3 flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>
              {currentPackage.hasTrial
                ? "$0 first month"
                : `${currentPackage.monthlyPrice}/month`}
            </span>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!stripeEnabled || loading}
        className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? (
          <span className="flex items-center justify-center">
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
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Processing...
          </span>
        ) : currentPackage.hasTrial ? (
          "Start 30-Day Free Trial"
        ) : (
          "Subscribe Now"
        )}
      </button>
    </form>
  );
}

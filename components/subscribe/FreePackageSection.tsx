"use client";

import { Package } from "@/lib/packages";
import { Check, Zap, Calendar, Cpu } from "lucide-react";

interface FreePackageSectionProps {
  currentPackage: Package;
  onActivate: () => void;
  loading: boolean;
  error: string;
}

export default function FreePackageSection({
  currentPackage,
  onActivate,
  loading,
  error
}: FreePackageSectionProps) {
  return (
    <div>
      {/* Package Details */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gray-500" />
              <span className="font-medium">GPUs:</span>
              <span>{currentPackage.maxGpts}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Duration:</span>
              <span>{currentPackage.duration}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-gray-500" />
              <span className="font-medium">AI Credits:</span>
              <span>{currentPackage.aiCredits.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-gray-500" />
              <span className="font-medium">Price:</span>
              <span className="text-green-600 font-bold">FREE</span>
            </div>
          </div>
        </div>

        <h4 className="font-medium text-gray-900 mb-3">Features:</h4>
        <ul className="space-y-2">
          {currentPackage.features.map((feature, idx) => (
            <li key={idx} className="flex items-start text-sm">
              <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Activate Button */}
      <button
        onClick={onActivate}
        disabled={loading}
        className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            Activating...
          </span>
        ) : (
          `Activate ${currentPackage.name}`
        )}
      </button>
    </div>
  );
}

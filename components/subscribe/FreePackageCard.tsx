"use client";

import { Package } from "@/lib/packages";
import { getColorClasses } from "@/lib/utils";
import { Zap, Clock } from "lucide-react";

interface FreePackageCardProps {
  package: Package;
  isSelected: boolean;
  onSelect: () => void;
}

export default function FreePackageCard({
  package: pkg,
  isSelected,
  onSelect
}: FreePackageCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`border rounded-lg p-4 cursor-pointer transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`p-1 rounded ${getColorClasses(pkg.color).split(" ")[1]}`}
          >
            {pkg.icon}
          </div>
          <h3 className="font-medium text-gray-900">{pkg.name}</h3>
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${getColorClasses(pkg.color)}`}
        >
          Free
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Zap className="w-3 h-3 text-gray-500" />
          <span>{pkg.maxGpts} GPUs</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3 h-3 text-gray-500" />
          <span>{pkg.duration}</span>
        </div>
      </div>
    </div>
  );
}

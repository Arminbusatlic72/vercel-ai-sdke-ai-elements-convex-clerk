"use client";

import { Package } from "@/lib/packages";
import { getColorClasses } from "@/lib/utils";
import { Check, Zap, Calendar } from "lucide-react";

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
  return (
    <div
      onClick={onSelect}
      className={`border-2 rounded-xl p-6 cursor-pointer transition-all h-full flex flex-col ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`p-2 rounded-lg ${getColorClasses(pkg.color).split(" ")[1]}`}
          >
            {pkg.icon}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{pkg.name}</h3>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${getColorClasses(pkg.color)}`}
            >
              {pkg.badge}
            </span>
          </div>
        </div>
        {isSelected && (
          <div className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            Selected
          </div>
        )}
      </div>

      <p className="text-gray-600 mb-4 flex-grow">{pkg.description}</p>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{pkg.maxGpts} GPUs</span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="font-medium">{pkg.duration}</span>
        </div>
        {pkg.isPaid && pkg.monthlyPrice && (
          <div className="text-3xl font-bold text-gray-900">
            ${pkg.monthlyPrice}
            <span className="text-lg text-gray-600 ml-1">/month</span>
          </div>
        )}
      </div>

      <ul className="space-y-2 mb-6">
        {pkg.features.slice(0, 4).map((feature, idx) => (
          <li key={idx} className="flex items-start text-sm">
            <Check className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

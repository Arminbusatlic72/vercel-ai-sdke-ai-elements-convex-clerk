// components/admin/PackageSelector.tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface PackageSelectorProps {
  selectedPackageId?: Id<"packages"> | string;
  onChange: (id: Id<"packages">) => void;
}

export function PackageSelector({
  selectedPackageId,
  onChange
}: PackageSelectorProps) {
  const packages = useQuery(api.packages.listPackages) ?? [];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Assign to Package
      </label>
      <select
        value={selectedPackageId || ""}
        onChange={(e) => onChange(e.target.value as Id<"packages">)}
        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
      >
        <option value="">No Package (Standalone)</option>
        {packages.map((pkg) => (
          <option key={pkg._id} value={pkg._id}>
            {pkg.name} ({pkg.tier})
          </option>
        ))}
      </select>
    </div>
  );
}

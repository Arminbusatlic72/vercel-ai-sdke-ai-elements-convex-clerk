// components/subscribe/PackageGrid.tsx
import { Package } from "@/lib/types";
import PackageCard from "./PackageCard";

interface PackageGridProps {
  packages: Package[];
  selectedPackageId: string;
  onSelectPackage: (id: string) => void;
}

export default function PackageGrid({
  packages,
  selectedPackageId,
  onSelectPackage
}: PackageGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg._id}
          package={pkg}
          isSelected={pkg._id === selectedPackageId}
          onSelect={() => onSelectPackage(pkg._id)}
        />
      ))}
    </div>
  );
}

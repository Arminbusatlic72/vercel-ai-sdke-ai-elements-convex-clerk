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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg._id}
          package={pkg}
          isSelected={pkg._id === selectedPackageId}
          onSelect={() => onSelectPackage(pkg._id)}
        />
      ))}
      <div className="flex-1 justify-center items-center border-2 border-dashed rounded-xl p-6">
        <p className="text-black-600 mb-4 text-lg">
          StoryEngine is a modular intelligence platform for cultural
          sensemaking, bringing together twelve specialized GPT toolkits
          designed to challenge assumptions and surface emerging patterns. Each
          toolkit applies a distinct analytical lens, from subculture and
          regional analysis to crisis simulation and speculative futures,
          allowing users to move fluidly between diagnosis and interpretation.
          Designed for strategists, creatives, and decision-makers operating at
          the edge of change, StoryEngine extends perception while keeping
          authorship human-led.
        </p>
      </div>
    </div>
  );
}

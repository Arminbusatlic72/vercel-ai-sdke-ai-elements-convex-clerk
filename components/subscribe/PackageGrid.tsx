// "use client";

// import { PACKAGES, PackageId } from "@/lib/packages";
// import PackageCard from "./PackageCard";
// import FreePackageCard from "./FreePackageCard";

// interface PackageGridProps {
//   selectedPackage: PackageId;
//   onSelectPackage: (id: PackageId) => void;
// }

// export default function PackageGrid({
//   selectedPackage,
//   onSelectPackage
// }: PackageGridProps) {
//   const professionalPackages: PackageId[] = ["sandbox", "clientProject"];
//   const freePackages: PackageId[] = [
//     "analyzingTrends",
//     "summer",
//     "workshop",
//     "classroomSpeaker",
//     "substack"
//   ];

//   return (
//     <div className="grid lg:grid-cols-3 gap-8 mb-12">
//       {/* Professional Packages */}
//       <div className="lg:col-span-2">
//         <h2 className="text-2xl font-bold text-gray-900 mb-6">
//           Professional Packages
//         </h2>
//         <div className="grid md:grid-cols-2 gap-6">
//           {professionalPackages.map((pkgId) => (
//             <PackageCard
//               key={pkgId}
//               package={PACKAGES[pkgId]}
//               isSelected={selectedPackage === pkgId}
//               onSelect={() => onSelectPackage(pkgId)}
//             />
//           ))}
//         </div>
//       </div>

//       {/* Free Packages Sidebar */}
//       <div>
//         <h2 className="text-2xl font-bold text-gray-900 mb-6">Free Packages</h2>
//         <div className="space-y-6">
//           {freePackages.map((pkgId) => (
//             <FreePackageCard
//               key={pkgId}
//               package={PACKAGES[pkgId]}
//               isSelected={selectedPackage === pkgId}
//               onSelect={() => onSelectPackage(pkgId)}
//             />
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }

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

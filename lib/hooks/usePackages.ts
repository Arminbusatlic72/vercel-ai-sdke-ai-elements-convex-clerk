import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function usePackages() {
  const packages = useQuery(api.packages.getAllPackages);
  return packages;
}

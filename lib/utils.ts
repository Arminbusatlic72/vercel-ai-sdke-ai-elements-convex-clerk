import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function getColorClasses(color: string): string {
  const colorMap: Record<string, string> = {
    purple: "border-purple-500 bg-purple-50 text-purple-800",
    blue: "border-blue-500 bg-blue-50 text-blue-800",
    green: "border-green-500 bg-green-50 text-green-800",
    yellow: "border-yellow-500 bg-yellow-50 text-yellow-800",
    orange: "border-orange-500 bg-orange-50 text-orange-800",
    red: "border-red-500 bg-red-50 text-red-800",
    pink: "border-pink-500 bg-pink-50 text-pink-800"
  };
  return colorMap[color] || colorMap.blue;
}

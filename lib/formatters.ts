// // export function formatGptTitle(slug: string): string {
// //   if (!slug) return "";

// //   return slug
// //     .split("-")
// //     .map((word) => {
// //       // Keep common GPT casing nicer
// //       if (word.toLowerCase() === "gpt") return "GPT";

// //       return word.charAt(0).toUpperCase() + word.slice(1);
// //     })
// //     .join(" ");
// // }

// // lib/formatters.ts
// export function formatGptTitle(gptId: string): string {
//   // Handle GPU IDs
//   if (gptId.startsWith("gpu-")) {
//     const num = gptId.split("-")[1];
//     return `GPU ${num || "1"}`;
//   }

//   // Handle other special cases
//   if (gptId === "client-project") {
//     return "Client Project Assistant";
//   }

//   // Convert kebab-case to Title Case
//   return gptId
//     .split("-")
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
//     .join(" ");
// }

// lib/formatters.ts

export function formatGptTitle(gptId: string): string {
  // Handle GPU IDs
  if (gptId.startsWith("gpu-")) {
    const num = gptId.split("-")[1];
    return `GPU ${num || "1"}`;
  }

  // Handle other special cases
  if (gptId === "client-project") {
    return "Client Project Assistant";
  }

  // Convert kebab-case to Title Case
  return gptId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format a timestamp (in milliseconds or seconds) to a readable date string
 * @param timestamp - Unix timestamp in milliseconds or seconds
 * @returns Formatted date string (e.g., "January 15, 2024")
 */
export function formatDate(timestamp: number | undefined | null): string {
  if (!timestamp) return "N/A";

  // Check if timestamp is in seconds (10 digits) or milliseconds (13 digits)
  // Unix timestamps in seconds are typically < 10000000000
  const millisecondsTimestamp =
    timestamp < 10000000000
      ? timestamp * 1000 // Convert seconds to milliseconds
      : timestamp; // Already in milliseconds

  try {
    return new Date(millisecondsTimestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
}

/**
 * Format a timestamp to a short date (e.g., "Jan 15, 2024")
 */
export function formatDateShort(timestamp: number | undefined | null): string {
  if (!timestamp) return "N/A";

  const millisecondsTimestamp =
    timestamp < 10000000000 ? timestamp * 1000 : timestamp;

  try {
    return new Date(millisecondsTimestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  } catch (error) {
    return "Invalid Date";
  }
}

/**
 * Format a timestamp to relative time (e.g., "in 5 days", "2 days ago")
 */
export function formatRelativeTime(
  timestamp: number | undefined | null
): string {
  if (!timestamp) return "N/A";

  const millisecondsTimestamp =
    timestamp < 10000000000 ? timestamp * 1000 : timestamp;

  const now = Date.now();
  const diff = millisecondsTimestamp - now;
  const absDiff = Math.abs(diff);

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) {
    return diff > 0
      ? `in ${years} year${years !== 1 ? "s" : ""}`
      : `${years} year${years !== 1 ? "s" : ""} ago`;
  }
  if (months > 0) {
    return diff > 0
      ? `in ${months} month${months !== 1 ? "s" : ""}`
      : `${months} month${months !== 1 ? "s" : ""} ago`;
  }
  if (days > 0) {
    return diff > 0
      ? `in ${days} day${days !== 1 ? "s" : ""}`
      : `${days} day${days !== 1 ? "s" : ""} ago`;
  }
  if (hours > 0) {
    return diff > 0
      ? `in ${hours} hour${hours !== 1 ? "s" : ""}`
      : `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  }
  if (minutes > 0) {
    return diff > 0
      ? `in ${minutes} minute${minutes !== 1 ? "s" : ""}`
      : `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
  }

  return "just now";
}

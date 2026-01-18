// export function formatGptTitle(slug: string): string {
//   if (!slug) return "";

//   return slug
//     .split("-")
//     .map((word) => {
//       // Keep common GPT casing nicer
//       if (word.toLowerCase() === "gpt") return "GPT";

//       return word.charAt(0).toUpperCase() + word.slice(1);
//     })
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

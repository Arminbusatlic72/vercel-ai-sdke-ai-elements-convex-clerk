export function formatGptTitle(slug: string): string {
  if (!slug) return "";

  return slug
    .split("-")
    .map((word) => {
      // Keep common GPT casing nicer
      if (word.toLowerCase() === "gpt") return "GPT";

      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

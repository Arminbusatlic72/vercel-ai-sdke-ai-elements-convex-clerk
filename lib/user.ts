export function getUserDisplayName(user: any): string {
  if (!user) return "User";

  return (
    user.firstName ||
    user.username ||
    user.emailAddresses?.[0]?.emailAddress ||
    "User"
  );
}

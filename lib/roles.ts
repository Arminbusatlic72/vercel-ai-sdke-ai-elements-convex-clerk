import { useUser } from "@clerk/nextjs";

export function useRole() {
  const { user } = useUser();
  const role = user?.publicMetadata?.role as string;

  return {
    role,
    isAdmin: role === "admin",
    isUser: role === "user"
  };
}

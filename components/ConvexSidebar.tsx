import Sidebar from "@/components/SideBar";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function ConvexSidebar() {
  const chats = useQuery(api.chats.listChats);
  const createChat = useMutation(api.chats.createChat);
  const deleteChat = useMutation(api.chats.deleteChat);

  return (
    <Sidebar
      chats={chats?.map((c) => ({ id: c._id, title: c.title }))}
      onCreateChat={async () => {
        const id = await createChat({ title: "New Chat" });
        return id;
      }}
      onDeleteChat={async (id) => {
        await deleteChat({ id });
      }}
    />
  );
}

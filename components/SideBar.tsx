// // "use client";

// // import { useState } from "react";
// // import { NavigationContext } from "../lib/NavigationProvider";
// // import { useRouter } from "next/navigation";
// // import { cn } from "../lib/utils";
// // import { use } from "react";
// // import { Button } from "../components/ui/button";
// // import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
// // import { useMutation, useQuery } from "convex/react";
// // import { api } from "@/convex/_generated/api";
// // import { Id } from "@/convex/_generated/dataModel";
// // import ChatRow from "./ChatRow";

// // export default function Sidebar() {
// //   const router = useRouter();
// //   const { closeMobileNav, isMobileNavOpen } = use(NavigationContext);

// //   const chats = useQuery(api.chats.listChats);

// //   const createChat = useMutation(api.chats.createChat);
// //   const createMessage = useMutation(api.messages.createMessage);
// //   const deleteChat = useMutation(api.chats.deleteChat);

// //   const [newTitle, setNewTitle] = useState("");

// //   // Create new chat with a first real message
// //   const handleNewChat = async (title: string) => {
// //     if (!title.trim()) return;

// //     try {
// //       const chatId: Id<"chats"> = await createChat({ title });

// //       // Add first message automatically
// //       await createMessage({
// //         chatId,
// //         content: "Hello! This is your first message in this chat."
// //       });

// //       // Redirect to the new chat page
// //       router.push(`/dashboard/chat/${chatId}`);
// //       setNewTitle("");
// //       closeMobileNav();
// //     } catch (error) {
// //       console.error("Failed to create chat:", error);
// //     }
// //   };

// //   // Delete chat handler
// //   const handleDeleteChat = async (id: Id<"chats">) => {
// //     await deleteChat({ id });

// //     // If we're currently viewing this chat, redirect to dashboard
// //     if (window.location.pathname.includes(id)) {
// //       router.push("/dashboard");
// //     }
// //   };

// //   return (
// //     <>
// //       {isMobileNavOpen && (
// //         <div
// //           className="fixed inset-0 bg-black/20 z-40 md:hidden"
// //           onClick={closeMobileNav}
// //         />
// //       )}
// //       <div
// //         className={cn(
// //           "fixed md:inset-y-0 top-14 bottom-0 left-0 z-50 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 flex flex-col",
// //           isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
// //         )}
// //       >
// //         <div className="p-4 border-b border-gray-200/50">
// //           <Button
// //             onClick={() => handleNewChat(newTitle)}
// //             className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/50 shadow-sm hover:shadow transition-all duration-200"
// //           >
// //             <PlusIcon className="mr-2 h-4 w-4" /> New Chat
// //           </Button>
// //         </div>
// //         <div className="flex-1 overflow-y-auto space-y-2.5 p-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
// //           {chats?.map((chat) => (
// //             <ChatRow key={chat._id} chat={chat} onDelete={handleDeleteChat} />
// //           ))}
// //         </div>
// //       </div>
// //     </>
// //   );
// // }

// "use client";

// import { useState } from "react";
// import { NavigationContext } from "../lib/NavigationProvider";
// import { useRouter } from "next/navigation";
// import { cn } from "../lib/utils";
// import { use } from "react";
// import { Button } from "../components/ui/button";
// import { PlusIcon, TrashIcon } from "@radix-ui/react-icons";
// import { useMutation, useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { Id } from "@/convex/_generated/dataModel";
// import ChatRow from "./ChatRow";

// export default function Sidebar() {
//   const router = useRouter();
//   const { closeMobileNav, isMobileNavOpen } = use(NavigationContext);

//   const chats = useQuery(api.chats.listChats);

//   const createChat = useMutation(api.chats.createChat);
//   const createMessage = useMutation(api.messages.createMessage);
//   const deleteChat = useMutation(api.chats.deleteChat);
// const storeMessage = useMutation(api.messages.store);

//   //   // Create new chat and redirect
//   //   const handleNewChat = async () => {
//   //     try {
//   //       // 1️⃣ Create chat with a default title
//   //       const chatId: Id<"chats"> = await createChat({ title: "New Chat" });

//   //       // 2️⃣ Add a first placeholder message (optional)
//   //       await createMessage({
//   //         chatId,
//   //         content: "Hello! Start typing to begin your conversation."
//   //       });

//   //       // 3️⃣ Redirect to chat page
//   //       router.push(`/dashboard/chat/${chatId}`);

//   //       // 4️⃣ Close mobile nav if open
//   //       closeMobileNav();
//   //     } catch (error) {
//   //       console.error("Failed to create chat:", error);
//   //     }
//   //   };

//   // Inside Sidebar.tsx

//   const handleNewChat = async (title: string) => {
//     if (!title.trim()) return;

//     try {
//       // 1️⃣ Create the new chat
//       const chatId: Id<"chats"> = await createChat({ title });

//       // 2️⃣ Add a first placeholder message using 'store' instead of 'createMessage'
//       await storeMessage({
//         chatId,
//         content: "Hello! Start typing to begin your conversation.",
//         role: "assistant" // or "user", depending on who sends the first message
//       });

//       // 3️⃣ Redirect to the new chat page
//       router.push(`/dashboard/chat/${chatId}`);
//       setNewTitle("");
//       closeMobileNav();
//     } catch (error) {
//       console.error("Failed to create chat:", error);
//     }
//   };

//   // Delete chat handler
//   const handleDeleteChat = async (id: Id<"chats">) => {
//     await deleteChat({ id });

//     // If we're currently viewing this chat, redirect to dashboard
//     if (window.location.pathname.includes(id)) {
//       router.push("/dashboard");
//     }
//   };

//   return (
//     <>
//       {isMobileNavOpen && (
//         <div
//           className="fixed inset-0 bg-black/20 z-40 md:hidden"
//           onClick={closeMobileNav}
//         />
//       )}
//       <div
//         className={cn(
//           "fixed md:inset-y-0 top-14 bottom-0 left-0 z-50 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 flex flex-col",
//           isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
//         )}
//       >
//         <div className="p-4 border-b border-gray-200/50">
//           <Button
//             onClick={handleNewChat} // <-- no need for newTitle input
//             className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/50 shadow-sm hover:shadow transition-all duration-200"
//           >
//             <PlusIcon className="mr-2 h-4 w-4" /> New Chat
//           </Button>
//         </div>
//         <div className="flex-1 overflow-y-auto space-y-2.5 p-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
//           {chats?.map((chat) => (
//             <ChatRow key={chat._id} chat={chat} onDelete={handleDeleteChat} />
//           ))}
//         </div>
//       </div>
//     </>
//   );
// }

"use client";

import { useState } from "react";
import { NavigationContext } from "../lib/NavigationProvider";
import { useRouter } from "next/navigation";
import { cn } from "../lib/utils";
import { use } from "react";
import { Button } from "../components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import ChatRow from "./ChatRow";

export default function Sidebar() {
  const router = useRouter();
  const { closeMobileNav, isMobileNavOpen } = use(NavigationContext);

  const chats = useQuery(api.chats.listChats);

  const createChat = useMutation(api.chats.createChat);
  const storeMessage = useMutation(api.messages.storeMessage);
  const deleteChat = useMutation(api.chats.deleteChat);

  // Create new chat and first message
  // Sidebar.tsx - remove sending first assistant message
  const handleNewChat = async (title: string = "New Chat") => {
    try {
      const chatId: Id<"chats"> = await createChat({ title });
      // ❌ Don't store the initial assistant message here
      router.push(`/dashboard/chat/${chatId}`);
      closeMobileNav();
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  // Delete chat
  const handleDeleteChat = async (id: Id<"chats">) => {
    try {
      await deleteChat({ id });

      // Redirect to dashboard if currently viewing deleted chat
      if (window.location.pathname.includes(id)) {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
    }
  };

  return (
    <>
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 md:hidden"
          onClick={closeMobileNav}
        />
      )}

      <div
        className={cn(
          "fixed md:inset-y-0 top-14 bottom-0 left-0 z-50 w-72 bg-gray-50/80 backdrop-blur-xl border-r border-gray-200/50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:top-0 flex flex-col",
          isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* New Chat Button */}
        <div className="p-4 border-b border-gray-200/50">
          <Button
            onClick={() => handleNewChat()} // default title
            className="w-full bg-white hover:bg-gray-50 text-gray-700 border border-gray-200/50 shadow-sm hover:shadow transition-all duration-200"
          >
            <PlusIcon className="mr-2 h-4 w-4" /> New Chat
          </Button>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 p-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
          {chats?.map((chat) => (
            <ChatRow key={chat._id} chat={chat} onDelete={handleDeleteChat} />
          ))}
        </div>
      </div>
    </>
  );
}

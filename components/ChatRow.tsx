// "use client";
// import { Doc, Id } from "@/convex/_generated/dataModel";
// import { TrashIcon } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { Button } from "../components/ui/button";
// import { use } from "react";
// import { NavigationContext } from "../lib/NavigationProvider";
// import { useQuery } from "convex/react";
// import { api } from "@/convex/_generated/api";

// function ChatRow({
//   chat,
//   onDelete
// }: {
//   chat: Doc<"chats">;
//   onDelete: (id: Id<"chats">) => void;
// }) {
//   const router = useRouter();
//   const { closeMobileNav } = use(NavigationContext);
//   const lastMessage = useQuery(api.messages.getLastMessage, {
//     chatId: chat._id
//   });

//   const handleClick = () => {
//     router.push(`/dashboard/chat/${chat._id}`);
//     closeMobileNav();
//   };

//   return (
//     <div
//       className="group rounded-xl border border-gray-200/30 bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
//       onClick={handleClick}
//     >
//       <div className="p-4">
//         <div className="flex justify-between items-start">
//           <p className="text-sm text-gray-600 truncate flex-1 font-medium">
//             {lastMessage ? (
//               <>
//                 {lastMessage.role === "user" ? "You: " : "AI: "}
//                 {lastMessage.content.slice(0, 50).replace(/\\n/g, " ")}
//                 {lastMessage.content.length > 50 ? "..." : ""}
//               </>
//             ) : (
//               <span className="text-gray-400">New conversation</span>
//             )}
//           </p>
//           <Button
//             variant="ghost"
//             size="icon"
//             className="opacity-0 group-hover:opacity-100 -mr-2 -mt-2 ml-2 transition-opacity duration-200"
//             onClick={(e) => {
//               e.stopPropagation();
//               onDelete(chat._id);
//             }}
//           >
//             <TrashIcon className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors" />
//           </Button>
//         </div>
//         {/* {lastMessage && (
//           <p className="text-xs text-gray-400 mt-1.5 font-medium">
//             <TimeAgo date={lastMessage.createdAt} />
//           </p>
//         )} */}
//       </div>
//     </div>
//   );
// }
// export default ChatRow;

// // "use client";

// // import { TrashIcon } from "lucide-react";
// // import { useRouter } from "next/navigation";
// // import { Button } from "../components/ui/button";
// // import { use } from "react";
// // import { NavigationContext } from "../lib/NavigationProvider";
// // import { useQuery } from "convex/react";
// // import { api } from "@/convex/_generated/api";
// // import { Doc, Id } from "@/convex/_generated/dataModel";

// // export default function ChatRow({
// //   chat,
// //   onDelete
// // }: {
// //   chat: Doc<"chats">;
// //   onDelete: (id: Id<"chats">) => void;
// // }) {
// //   const router = useRouter();
// //   const { closeMobileNav } = use(NavigationContext);

// //   const lastMessage = useQuery(api.messages.getLastMessage, {
// //     chatId: chat._id
// //   });

// //   const handleClick = () => {
// //     router.push(`/dashboard/chat/${chat._id}`);
// //     closeMobileNav();
// //   };

// //   const preview = lastMessage
// //     ? `${lastMessage.role === "user" ? "You" : "AI"}: ${lastMessage.content
// //         .replace(/\n/g, " ")
// //         .slice(0, 60)}${lastMessage.content.length > 60 ? "..." : ""}`
// //     : "New conversation";

// //   return (
// //     <div
// //       className="group rounded-xl border border-gray-200/30 bg-white/50 backdrop-blur-sm hover:bg-white/80 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
// //       onClick={handleClick}
// //     >
// //       <div className="p-4">
// //         <div className="flex justify-between items-start">
// //           <p className="text-sm text-gray-600 truncate flex-1 font-medium">
// //             {preview}
// //           </p>
// //           <p className="text-sm font-semibold text-gray-800 truncate">
// //             {chat.title ?? "New Chat"}
// //           </p>
// //           <Button
// //             variant="ghost"
// //             size="icon"
// //             className="opacity-0 group-hover:opacity-100 -mr-2 -mt-2 ml-2 transition-opacity duration-200"
// //             onClick={(e) => {
// //               e.stopPropagation();
// //               onDelete(chat._id);
// //             }}
// //           >
// //             <TrashIcon className="h-4 w-4 text-gray-400 hover:text-red-500 transition-colors" />
// //           </Button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }

"use client";
import Link from "next/link";
import { MessageSquare, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { Id } from "@/convex/_generated/dataModel";

// Define a generic chat type that works for both agents
type ChatType = {
  _id: Id<"chats"> | Id<"agent2Chats">;
  title: string;
  createdAt: number;
  userId: string;
};

interface ChatRowProps {
  chat: ChatType;
  onDelete: (id: Id<"chats"> | Id<"agent2Chats">) => void;
  basePath: string;
}

export default function ChatRow({ chat, onDelete, basePath }: ChatRowProps) {
  return (
    <div className="group relative">
      <Link
        href={`${basePath}/${chat._id}`}
        className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/50 transition-all duration-200 border border-transparent hover:border-gray-200/50"
      >
        <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700 truncate">{chat.title}</p>
          <p className="text-xs text-gray-400">
            {new Date(chat.createdAt).toLocaleDateString()}
          </p>
        </div>
      </Link>

      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          onDelete(chat._id);
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>
    </div>
  );
}

// "use client";

// import { memo, useCallback } from "react";
// import { GlobeIcon } from "lucide-react";
// import { Conversation } from "@/components/ai-elements/conversation";

// import {
//   PromptInput,
//   PromptInputTextarea,
//   PromptInputSubmit,
//   PromptInputActionAddAttachments,
//   PromptInputActionMenu,
//   PromptInputActionMenuContent,
//   PromptInputActionMenuTrigger,
//   PromptInputAttachment,
//   PromptInputAttachments,
//   PromptInputBody,
//   PromptInputButton,
//   PromptInputHeader,
//   PromptInputSelect,
//   PromptInputSelectContent,
//   PromptInputSelectItem,
//   PromptInputSelectTrigger,
//   PromptInputSelectValue,
//   PromptInputFooter,
//   PromptInputTools
// } from "@/components/ai-elements/prompt-input";
// import { useAiChat } from "@/lib/hooks/useAiChat";
// import { AiMessageList } from "@/components/AiMessageList";
// import type { Id, TableNames } from "@/convex/_generated/dataModel";

// export interface ModelConfig {
//   name: string;
//   value: string;
//   provider: string;
// }

// export interface AiChatProps<
//   ChatTableName extends TableNames,
//   MessageTableName extends TableNames
// > {
//   // chatId?: Id<ChatTableName>;
//   chatId?: Id<"chats">;
//   gptId?: string; // ✅ ADD THIS
//   projectId?: Id<"projects">;
//   initialMessages?: Array<{
//     // _id: Id<MessageTableName>;
//     _id: Id<"messages">;
//     role: "user" | "assistant";
//     content: string;
//   }>;
//   models: readonly ModelConfig[];
//   apiEndpoint?: string;
//   showWebSearch?: boolean;
//   defaultModel?: string;
// }

// const AttachmentRenderer = memo(({ attachment }: { attachment: any }) => (
//   <PromptInputAttachment data={attachment} />
// ));
// AttachmentRenderer.displayName = "AttachmentRenderer";

// function AiChat<
//   ChatTableName extends TableNames,
//   MessageTableName extends TableNames
// >(props: AiChatProps<ChatTableName, MessageTableName>) {
//   const {
//     input,
//     setInput,
//     model,
//     setModel,
//     webSearch,
//     toggleWebSearch,
//     handleSubmit,
//     handleCopy,
//     handleRetry,
//     displayMessages,
//     groupedModels,
//     inputRef,
//     conversationRef,
//     status
//   } = useAiChat({
//     chatId: props.chatId,
//     gptId: props.gptId, // ✅ PASS THIS
//     projectId: props.projectId,
//     initialMessages: props.initialMessages,
//     models: props.models,
//     defaultModel: props.defaultModel
//   });

//   const handleInputChange = useCallback(
//     (e: React.ChangeEvent<HTMLTextAreaElement>) => {
//       setInput(e.target.value);
//     },
//     [setInput]
//   );

//   const renderAttachment = useCallback(
//     (attachment: any) => <AttachmentRenderer attachment={attachment} />,
//     []
//   );

//   console.log("🎨 [AiChat] Rendering with:", {
//     displayMessagesCount: displayMessages.length,
//     initialMessagesCount: props.initialMessages?.length,
//     status
//   });

//   return (
//     <div className="flex flex-col h-full overflow-hidden">
//       <div
//         ref={conversationRef}
//         className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
//       >
//         <Conversation>
//           {/* ✅ Only pass displayMessages - it includes everything now */}
//           <AiMessageList
//             displayMessages={displayMessages}
//             handleCopy={handleCopy}
//             handleRetry={handleRetry}
//             status={status}
//           />
//         </Conversation>
//       </div>

//       <div className="border-t bg-white/80 backdrop-blur-sm py-4 px-4 sm:px-6 shrink-0">
//         <div className="max-w-3xl mx-auto w-full">
//           <PromptInput
//             onSubmit={handleSubmit}
//             className="shadow-sm"
//             globalDrop
//             multiple
//           >
//             <PromptInputHeader>
//               <PromptInputAttachments>
//                 {renderAttachment}
//               </PromptInputAttachments>
//             </PromptInputHeader>
//             <PromptInputBody>
//               <PromptInputTextarea
//                 value={input}
//                 onChange={handleInputChange}
//                 ref={inputRef}
//                 placeholder="Type your message here..."
//                 className="min-h-[60px] max-h-[200px] resize-none"
//               />
//             </PromptInputBody>
//             <PromptInputFooter>
//               <PromptInputTools>
//                 <PromptInputActionMenu>
//                   <PromptInputActionMenuTrigger />
//                   <PromptInputActionMenuContent>
//                     <PromptInputActionAddAttachments />
//                   </PromptInputActionMenuContent>
//                 </PromptInputActionMenu>

//                 {props.showWebSearch && (
//                   <PromptInputButton
//                     variant={webSearch ? "default" : "ghost"}
//                     onClick={toggleWebSearch}
//                     className="gap-2"
//                   >
//                     <GlobeIcon size={16} />
//                     <span>Search</span>
//                   </PromptInputButton>
//                 )}

//                 <PromptInputSelect onValueChange={setModel} value={model}>
//                   <PromptInputSelectTrigger>
//                     <PromptInputSelectValue />
//                   </PromptInputSelectTrigger>
//                   <PromptInputSelectContent>
//                     {Object.entries(groupedModels).map(
//                       ([provider, providerModels]) => (
//                         <div key={provider}>
//                           <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
//                             {provider}
//                           </div>
//                           {providerModels.map((m) => (
//                             <PromptInputSelectItem
//                               key={m.value}
//                               value={m.value}
//                             >
//                               {m.name}
//                             </PromptInputSelectItem>
//                           ))}
//                         </div>
//                       )
//                     )}
//                   </PromptInputSelectContent>
//                 </PromptInputSelect>
//               </PromptInputTools>
//               <PromptInputSubmit disabled={!input && !status} status={status} />
//             </PromptInputFooter>
//           </PromptInput>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default memo(AiChat) as typeof AiChat;

"use client";

import { memo, useCallback } from "react";
import { GlobeIcon } from "lucide-react";
import { Conversation } from "@/components/ai-elements/conversation";

import {
  PromptInput,
  PromptInputTextarea,
  PromptInputSubmit,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputHeader,
  PromptInputFooter,
  PromptInputTools
} from "@/components/ai-elements/prompt-input";
import { useAiChat } from "@/lib/hooks/useAiChat";
import { AiMessageList } from "@/components/AiMessageList";
import type { Id, TableNames } from "@/convex/_generated/dataModel";

export interface ModelConfig {
  name: string;
  value: string;
  provider: string;
}

export interface AiChatProps<
  ChatTableName extends TableNames,
  MessageTableName extends TableNames
> {
  chatId?: Id<"chats">;
  gptId?: string;
  projectId?: Id<"projects">;
  initialMessages?: Array<{
    _id: Id<"messages">;
    role: "user" | "assistant";
    content: string;
  }>;
  models: readonly ModelConfig[];
  apiEndpoint?: string;
  showWebSearch?: boolean;
  defaultModel?: string;
}

const AttachmentRenderer = memo(({ attachment }: { attachment: any }) => (
  <PromptInputAttachment data={attachment} />
));
AttachmentRenderer.displayName = "AttachmentRenderer";

function AiChat<
  ChatTableName extends TableNames,
  MessageTableName extends TableNames
>(props: AiChatProps<ChatTableName, MessageTableName>) {
  const {
    input,
    setInput,

    model,
    webSearch,
    toggleWebSearch,
    handleSubmit,
    handleCopy,
    handleRetry,
    displayMessages,
    inputRef,
    conversationRef,
    status
  } = useAiChat({
    chatId: props.chatId,
    gptId: props.gptId,
    projectId: props.projectId,
    initialMessages: props.initialMessages,
    models: props.models,
    defaultModel: props.defaultModel
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  const renderAttachment = useCallback(
    (attachment: any) => <AttachmentRenderer attachment={attachment} />,
    []
  );

  // Get the current model name for display
  const currentModelName =
    props.models.find((m) => m.value === model)?.name || model;

  console.log("🎨 [AiChat] Rendering with:", {
    displayMessagesCount: displayMessages.length,
    initialMessagesCount: props.initialMessages?.length,
    status,
    model
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div
        ref={conversationRef}
        className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
      >
        <Conversation>
          <AiMessageList
            displayMessages={displayMessages}
            handleCopy={handleCopy}
            handleRetry={handleRetry}
            status={status}
          />
        </Conversation>
      </div>

      <div className="border-t bg-white/80 backdrop-blur-sm py-4 px-4 sm:px-6 shrink-0">
        <div className="max-w-3xl mx-auto w-full">
          <PromptInput
            onSubmit={handleSubmit}
            className="shadow-sm"
            globalDrop
            multiple
          >
            <PromptInputHeader>
              <PromptInputAttachments>
                {renderAttachment}
              </PromptInputAttachments>
            </PromptInputHeader>
            <PromptInputBody>
              <PromptInputTextarea
                value={input}
                onChange={handleInputChange}
                ref={inputRef}
                placeholder="Type your message here..."
                className="min-h-[60px] max-h-[200px] resize-none"
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>

                {props.showWebSearch && (
                  <PromptInputButton
                    variant={webSearch ? "default" : "ghost"}
                    onClick={toggleWebSearch}
                    className="gap-2"
                  >
                    <GlobeIcon size={16} />
                    <span>Search</span>
                  </PromptInputButton>
                )}

                {/* Display current model (read-only) */}
                <div className="px-3 py-2 text-sm text-muted-foreground bg-muted/50 rounded-md">
                  {currentModelName}
                </div>
              </PromptInputTools>
              <PromptInputSubmit
                // disabled={!input.trim() && status !== "streaming"}
                status={status}
                disabled={status === "streaming"}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}

export default memo(AiChat) as typeof AiChat;
